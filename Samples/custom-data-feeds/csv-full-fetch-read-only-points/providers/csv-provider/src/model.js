const CSVconfig = require("./csv-provider-config.json");
const fs = require("fs-extra");
const Papa = require("papaparse");
const path = require("path");
const validUrl = require("valid-url");
const translate = require("./utils/translate-csv");
const loggingPrefix = "File CSV provider: ";

class Model {
  #dataDir;
  #dataDirPath;
  #logger;

  constructor(cdf = {}) {
    this.#logger = cdf.logger || console;
    this.#dataDir = CSVconfig.dataDir;                       
    this.#dataDirPath = path.join(__dirname, this.#dataDir);  

    this.#verifyDataDirectoryExists(this.#dataDirPath);
  }

  async getData(req) {
    const { delimiter, metadata } = CSVconfig;
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
        const fullPath = path.join(this.#dataDirPath, fileName);
        this.#logger.info(`${loggingPrefix}Reading file from ${fullPath}`);
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

      const geometryColumns = { Latitude: latColumn, Longitude: longColumn };

      const geojson = translate(result.data, { geometryColumns, metadata });

      geojson.metadata = {
        name: "points_csv",
        idField: metadata.idField,
        inputCrs: metadata.dataCrs,
      };

      return geojson;
    } catch (err) {
      this.#logger.error(`${loggingPrefix}${err.message}`);
      throw err;
    }
  }

  #verifyDataDirectoryExists(dirPath) {
    const exists = fs.existsSync(dirPath);
    if (!exists) {
      throw new Error(`${loggingPrefix}data directory "${this.#dataDir}" not found at ${dirPath}.`);
    }
    this.#logger.info(`${loggingPrefix}will read data from ${dirPath}`);
  }
}

module.exports = Model;