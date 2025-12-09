const localConfig = require("./buildings-config.json");
const duckdb = require("duckdb");

const {
  translateToGeoJSON,
  buildSqlQuery,
  generateFiltersApplied,
  getExtentFromGeoJson,
} = require("./modules");

class Model {
  constructor(koop) {
    // This uses in memory instance of a DuckDB
    this.db = new duckdb.Database(":memory:");

    // Diagnostics if needed for determining what is installed and loaded
    // this.db.all(`PRAGMA version;`, (err, rows) => {
    //   if (!err) console.log("DuckDB version:", rows);
    // });

    // this.db.all(`SELECT * FROM duckdb_extensions();`, (err, rows) => {
    //   if (!err) console.table(rows);
    // });

    // Install & load required extensions (idempotent)
    this.db.all(`INSTALL httpfs; LOAD httpfs;`, (err) => {
      if (err) console.error("httpfs install/load error:", err);
      else console.log("httpfs ready.");
    });

    this.db.all(`INSTALL spatial; LOAD spatial;`, (err) => {
      if (err) console.error("spatial install/load error:", err);
      else console.log("spatial ready.");
    });

    const s3Config = localConfig.buildings.sources.awss3;
    let s3CreateClause = ``;
    if (s3Config) {
     s3CreateClause = `
        DROP TABLE IF EXISTS ${s3Config.properties.name};
        CREATE TABLE ${s3Config.properties.name} AS 
        SELECT
          CAST(row_number() OVER () AS INTEGER) AS OBJECTID,
          sources[1].dataset as source,
          subtype,
          class,
          level,
          has_parts,
          is_underground,
          height,
          num_floors,
          num_floors_underground,
          min_height,
          min_floor,
          facade_color,
          facade_material,
          roof_material,
          roof_shape,
          roof_direction,
          roof_orientation,
          roof_color,
          geometry
        FROM read_parquet('${s3Config.s3Url}', 
          filename=true, hive_partitioning=1)
        WHERE 
          bbox.xmin > ${s3Config.xmin} 
                  AND bbox.xmax < ${s3Config.xmax}
          AND bbox.ymin > ${s3Config.ymin} 
                  AND bbox.ymax < ${s3Config.ymax};`;
    }

    this.db.all(s3CreateClause, function (err, res) {
      if (err) {
        console.error(err);
      }
      console.log(`🦆 DuckDB initialized with ${res[0].Count} rows 🦆`);
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

      // Retrieve geoservices parameters
      const { resultRecordCount, returnCountOnly } = geoserviceParams;
      const sourceConfig = localConfig.buildings.sources.awss3;

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
      
      // Handle metadata requests
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

      // Handle Query requests
      this.db.all(sqlQuery, (err, rows) => {
        let geojson = { type: "FeatureCollection", features: [] };
        if (err) {
          console.error(err);
          callback(null, geojson);
        }
        if (rows.length == 0) {
          return callback(null, geojson);
        }
        let exceededTransferLimit = false;
        if (!returnCountOnly && rows.length > sourceConfig.maxRecordCountPerPage) {
          exceededTransferLimit = true;
          rows.pop();
        }
        if (returnCountOnly) {
          geojson.count = Number(rows[0]["count(1)"]);
        } else {
          geojson = translateToGeoJSON(rows, sourceConfig);
        }

        geojson.filtersApplied = generateFiltersApplied(
          geoserviceParams,
          sourceConfig.idField,
          sourceConfig.geomOutColumn
        );
        geojson.metadata = {
          ...sourceConfig.properties,
          maxRecordCount: sourceConfig.maxRecordCountPerPage,
          exceededTransferLimit,
          idField: sourceConfig.idField,
          ...(dbExtent && { extent: dbExtent }),
        };
        geojson.crs = {
          type: `${sourceConfig.dbWKID}`,
          properties: {
            name: `urn:ogc:def:crs:EPSG::${sourceConfig.dbWKID}`,
          },
        };
        callback(null, geojson);
      });
    } catch (error) {
      console.error(error);
      callback(null, { type: "FeatureCollection", features: [] });
    }
  }
}

module.exports = Model;
