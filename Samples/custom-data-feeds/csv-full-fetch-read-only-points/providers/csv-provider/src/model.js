const CSVconfig = require("./csv-provider-config.json");
const fs = require("fs").promises;
const Papa = require("papaparse");
const path = require("path");
const validUrl = require("valid-url");
const translate = require("./utils/translate-csv");

function Model() {}

Model.prototype.getData = async function (req) {

  const { dataDir, delimiter, metadata } = CSVconfig;
  const fileName = req.params.file_name;
  const latColumn = req.params.lat_column;
  const longColumn = req.params.long_column;

  if (!fileName || !latColumn || !longColumn) {
    throw new Error("Missing required service parameters: file_name, lat_column, or long_column.");
  }

  let csvText;

  try {
    if (validUrl.isUri(fileName)) {
      // Remote CSV file
      const res = await fetch(fileName);
      if (!res.ok) {
        throw new Error(`Failed to fetch CSV: ${res.status} ${res.statusText}`);
      }
      csvText = await res.text();
    } else if (fileName.toLowerCase().endsWith(".csv")) {
      // Local CSV file
      const fullPath = path.resolve(__dirname, dataDir, fileName);
      csvText = await fs.readFile(fullPath, "utf8");
    } else {
      throw new Error(`Unrecognized CSV source: ${fileName}`);
    }

    // Parse CSV
    const result = Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimiter: delimiter || ",",
    });

    if (result.errors && result.errors.length) {
      throw new Error(`CSV Parsing Error: ${result.errors[0].message}`);
    }

    // Build geometryColumns from request
    const geometryColumns = {
      Latitude: latColumn,
      Longitude: longColumn,
    };

    // Translate to GeoJSON
    const geojson = translate(result.data, {
      geometryColumns,
      metadata,
    });

    geojson.metadata = {
      name: "points_csv",
      idField: metadata.idField,
      inputCrs: metadata.dataCrs
    };

    return geojson;

  } catch (err) {
    console.error("Error in getData:", err.message);
    throw err;
  }
};

module.exports = Model;