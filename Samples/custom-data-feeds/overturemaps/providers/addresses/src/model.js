
const fs = require("fs");
const os = require("os");
const duckdb = require("duckdb");
const localConfig = require("./addresses-config.json");

const {
  translateToGeoJSON,
  buildSqlQuery,
  generateFiltersApplied,
  getExtentFromGeoJson,
} = require("./modules");

class Model {
  constructor(koop) {
    // In-memory DuckDB instance
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

    // Prepare S3 source config
    const s3Config = localConfig.addressess.sources.awss3;
    if (s3Config) {
      const createTableQuery = `
        DROP TABLE IF EXISTS ${s3Config.properties.name};
        CREATE TABLE ${s3Config.properties.name} AS 
        SELECT
          CAST(row_number() OVER () AS INTEGER) AS OBJECTID,
          country,
          postcode,
          street,
          number,
          unit,
          CAST(address_levels[1].value AS VARCHAR(256)) AS address_level,
          postal_city,
          geometry
        FROM read_parquet('${s3Config.s3Url}', filename=true, hive_partitioning=1)
        WHERE 
          bbox.xmin > ${s3Config.xmin} AND bbox.xmax < ${s3Config.xmax}
          AND bbox.ymin > ${s3Config.ymin} AND bbox.ymax < ${s3Config.ymax};
      `;

      this.db.all(createTableQuery, (err) => {
        if (err) {
          console.error("Create table error:", err);
        } else {
          this.db.all(`SELECT COUNT(*) AS cnt FROM ${s3Config.properties.name}`, (err2, r2) => {
            if (err2) console.error("Count error:", err2);
            else console.log(`🦆 DuckDB initialized with ${r2[0].cnt} rows 🦆`);
          });
        }
      });
    }
  }

  getData(req, callback) {
    try {
      // Fix boolean coercion
      Object.keys(req.query).forEach((key) => {
        const v = (req.query[key] + "").toLowerCase();
        if (v === "true") req.query[key] = true;
        else if (v === "false") req.query[key] = false;
      });

      const { query: geoserviceParams } = req;
      const { resultRecordCount, returnCountOnly } = geoserviceParams;
      const sourceConfig = localConfig.addressess.sources.awss3;

      // Metadata request check
      const isMetadataRequest =
        (Object.keys(geoserviceParams).length === 1 && geoserviceParams.hasOwnProperty("f")) ||
        Object.keys(geoserviceParams).length === 0;

      const fetchSize = isMetadataRequest
        ? 1
        : Number(resultRecordCount || sourceConfig.maxRecordCountPerPage);

      const sqlQuery = buildSqlQuery(
        geoserviceParams,
        sourceConfig.idField,
        sourceConfig.geomOutColumn,
        sourceConfig.properties.name,
        sourceConfig.dbWKID,
        fetchSize
      );

      // Handle metadata requests
      let dbExtent = null;
      if (isMetadataRequest) {
        const extentQuery = `SELECT ST_AsGeoJSON(ST_Envelope_Agg(${sourceConfig.geomOutColumn})) AS extent FROM ${sourceConfig.properties.name}`;
        this.db.all(extentQuery, (err, rows) => {
          if (!err && rows.length > 0) {
            dbExtent = getExtentFromGeoJson(JSON.parse(rows[0]["extent"]), sourceConfig.dbWKID);
          }
        });
      }

      // Handle query requests
      this.db.all(sqlQuery, (err, rows) => {
        let geojson = { type: "FeatureCollection", features: [] };
        if (err) {
          console.error(err);
          return callback(null, geojson);
        }
        if (rows.length === 0) {
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

