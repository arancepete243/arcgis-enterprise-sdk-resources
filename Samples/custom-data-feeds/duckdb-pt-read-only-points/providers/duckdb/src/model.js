const koopConfig = require("./duckdb-config.json");
const duckdb = require("duckdb");
const fs = require("fs");
const {
	translateToGeoJSON,
	validateConfig,
	buildSqlQuery,
	generateFiltersApplied,
	getExtentFromGeoJson,
} = require("./modules");

class Model {
	constructor(koop) {
		// try {
		// 	validateConfig(koopConfig);
		// } catch (error) {
		// 	throw error;
		// }
		this.db = new duckdb.Database(":memory:");
		const deltaConfig = koopConfig.duckdb.sources.deltaTable;

		var deltaCreateClause = ``;
		if (deltaConfig) {
			var secretClause = `INSTALL delta;LOAD delta;
								INSTALL azure;LOAD azure;
								CREATE SECRET deltatableconn (TYPE AZURE, CONNECTION_STRING 'abfss://${deltaConfig.azureStorageConnStr}');`;
			deltaCreateClause = `${secretClause}
						CREATE TABLE ${deltaConfig.properties.name} AS 
						SELECT * EXCLUDE ${deltaConfig.WKBColumn}, 
						ST_GeomFromWKB(CAST(${deltaConfig.WKBColumn} AS BLOB)) AS ${deltaConfig.geomOutColumn}, 
						CAST(row_number() OVER () AS INTEGER) AS ${deltaConfig.idField}
						FROM delta_scan('${deltaConfig.deltaUrl}');`;
		}

		const azureConfig = koopConfig.duckdb.sources.azureParquet;
		var azureCreateClause = ``;
		if (azureConfig) {
			var secretClause = `INSTALL delta;LOAD delta;
								INSTALL azure;LOAD azure;
								CREATE SECRET azureconn (TYPE AZURE, CONNECTION_STRING 'abfss://${azureConfig.azureStorageConnStr}');`;
								azureCreateClause = `${secretClause}
						CREATE TABLE ${azureConfig.properties.name} AS 
						SELECT * EXCLUDE ${azureConfig.WKBColumn}, 
						ST_GeomFromWKB(CAST(${azureConfig.WKBColumn} AS BLOB)) AS ${azureConfig.geomOutColumn}, 
						CAST(row_number() OVER () AS INTEGER) AS ${azureConfig.idField}
						FROM read_parquet('${azureConfig.dataUrl}/*.parquet', hive_partitioning = true)
						WHERE ST_Intersects(${azureConfig.geomOutColumn}, ST_MakeEnvelope(-74.351349, 40.393608, -72.880554, 41.331241));`;
		}

		const initQuery = `INSTALL spatial; LOAD spatial; 
						${azureCreateClause}`;
		this.db.all(initQuery, function (err, res) {
			if (err) {
				console.error(err);
			}
			console.log(`✅ Server initialized with ${res[0].Count} rows ✅`);
		});
	}

	getData(req, callback) {
		try {
			// convert bools from strings
			Object.keys(req.query).forEach((key) => {
				if (req.query[key] + "".toLowerCase() === "true") req.query[key] = true;
				else if (req.query[key] + "".toLowerCase() === "false")
					req.query[key] = false;
			});
			const { query: geoserviceParams } = req;
			// TODO: speed up returnIdsOnly with large datasets
			const { resultRecordCount, returnCountOnly } = geoserviceParams;
			const config = koopConfig["duckdb"];
			const sourceId = "azureParquet";
			const sourceConfig = config.sources[sourceId];
			// only return back one row for metadata purposes
			const isMetadataRequest =
				(Object.keys(geoserviceParams).length == 1 &&
					geoserviceParams.hasOwnProperty("f")) ||
				Object.keys(geoserviceParams).length == 0;
			const fetchSize = isMetadataRequest
				? 1
				: resultRecordCount || sourceConfig.maxRecordCountPerPage;

			const sqlQuery = buildSqlQuery(
				geoserviceParams,
				sourceConfig.idField,
				sourceConfig.geomOutColumn,
				sourceConfig.properties.name,
				sourceConfig.dbWKID,
				fetchSize
			);

			var dbExtent = null;
			if (isMetadataRequest) {
				const extentQuery = `SELECT ST_AsGeoJSON(ST_Envelope_Agg(${sourceConfig.geomOutColumn})) AS extent FROM ${sourceConfig.properties.name}`;
				this.db.all(extentQuery, (err, rows) => {
					if (err) {
						console.error(err);
						return;
					}
					dbExtent = getExtentFromGeoJson(JSON.parse(rows[0]["extent"]), sourceConfig.dbWKID);
				});
			}

			this.db.all(sqlQuery, (err, rows) => {
				if (err) {
					console.error(err);
					return callback(null, { type: "FeatureCollection", features: [] });
				}

				// Convert BigInt in the raw rows first
				const safeRows = deepConvertBigInt(rows, { idsAsString: false }); // or true if you want string IDs

				let totalMatchingRows = 0;
				if (returnCountOnly) {
					totalMatchingRows = Number(safeRows[0]["count(1)"] ?? 0);
				} else if (safeRows[0]?.total_count !== undefined) {
					totalMatchingRows = Number(safeRows[0].total_count);
				} else {
					totalMatchingRows = safeRows.length; // I don't know if I need this
				}

				console.log(`📊 Total matching records: ${totalMatchingRows}`);
				console.log(`Total rows returned: ${safeRows.length}`);

				let exceededTransferLimit = false;
				if (
					!returnCountOnly &&
					totalMatchingRows > sourceConfig.maxRecordCountPerPage &&
					safeRows.length === sourceConfig.maxRecordCountPerPage  // you could have situation where exactly 10K were left on final query
				) {
					exceededTransferLimit = true;
				}
				console.log(`ExcededTransferLimit: ${exceededTransferLimit}`);

				let geojson = { type: "FeatureCollection", features: [] };
				if (safeRows.length === 0) {
					// build empty response with metadata...
				} else if (returnCountOnly) {
					geojson.count = totalMatchingRows;
				} else {
					// Ensure translateToGeoJSON doesn't reintroduce BigInt.
					geojson = translateToGeoJSON(safeRows, sourceConfig);
				}

				// Convert any BigInt that might remain (defensive)
				geojson = deepConvertBigInt(geojson, { idsAsString: false });

				geojson.filtersApplied = generateFiltersApplied(
					geoserviceParams,
					sourceConfig.idField,
					sourceConfig.geomOutColumn
				);
				geojson.metadata = {
					...sourceConfig.properties,
					maxRecordCount: sourceConfig.maxRecordCountPerPage,
					exceededTransferLimit,
					supportedQueryFormats: "JSON",
					idField: sourceConfig.idField,
					...(dbExtent && { extent: dbExtent }),
				};
				geojson.crs = {
					type: `${sourceConfig.dbWKID}`,
					properties: { name: `urn:ogc:def:crs:EPSG::${sourceConfig.dbWKID}` },
				};

				// Final safety conversion before sending out
				geojson = deepConvertBigInt(geojson, { idsAsString: false });

				callback(null, geojson);
			});
		} catch (error) {
			console.error(error);
			callback(null, { type: "FeatureCollection", features: [] });
		}


		function convertBigInt(value, { idsAsString = false } = {}) {
		if (typeof value === 'bigint') {
			// Decide how to represent BigInt
			return idsAsString ? value.toString() : Number(value);
		}
		return value;
		}

		function deepConvertBigInt(obj, opts = {}) {
		if (Array.isArray(obj)) {
			return obj.map((v) => deepConvertBigInt(v, opts));
		}
		if (obj && typeof obj === 'object') {
			const out = {};
			for (const [k, v] of Object.entries(obj)) {
			out[k] = deepConvertBigInt(v, opts);
			}
			return out;
		}
		return convertBigInt(obj, opts);
		}
	}
	
}

module.exports = Model;
