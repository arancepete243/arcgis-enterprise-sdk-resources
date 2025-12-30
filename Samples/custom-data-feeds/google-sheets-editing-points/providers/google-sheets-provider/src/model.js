const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { editSheet } = require("./helpers/editSheet");
const config = require('./google-config.json');
const inputCrs = 4326;

class Model {
  #serviceAccount;
  #logger;

  constructor(
    { logger }
  ) {
    this.#serviceAccount = new JWT({
      email: config?.google_sheets_provider?.client_email,
      key: config?.google_sheets_provider?.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
   
  }

  async getMetadata() {
    return {
        idField: 'RowID',
        inputCrs: 4326
    }
  }

  async editData(req, editData) {

    const documentID = req.params.docID;
    const sheetName = req.params.sheetName;

    // initialize the spreadsheet and load the information for it
    const doc = new GoogleSpreadsheet(documentID, this.#serviceAccount);
    await doc.loadInfo();
    
    // get the sheet requested along with the sheet headers
    const sheet = doc.sheetsByTitle[sheetName];

    let applyEditsResponse = {};

    applyEditsResponse = await editSheet(sheet, editData);

    return applyEditsResponse;
    
  }

  // this a simple getData function that follows a full-fetch pattern
  async getData(req) {

    const documentID = req.params.docID;
    const sheetName = req.params.sheetName;

    // initialize the spreadsheet and load the information for it
    const doc = new GoogleSpreadsheet(documentID, this.#serviceAccount);
    await doc.loadInfo();

    // get the sheet requested along with the sheet headers
    const sheet = doc.sheetsByTitle[sheetName];
    await sheet.loadHeaderRow();
    const headers = sheet.headerValues;

    // initialize GeoJSON
    let geoJSON = {
      type: 'FeatureCollection',
      features: []
    }

    try {

      // get all the rows from the Google Sheet
      const rows = await sheet.getRows();
          
      rows.forEach(row => {
        let feature = {
          type: 'feature',
          geometry: {
            type: 'Point',
            coordinates: [parseFloat(row._rawData[6]), parseFloat(row._rawData[5])]
          },
          properties: {}
        };

        // use the array of headers to create the feature properties
        headers.forEach((header, index) => {
          if (header !== 'Latitude' && header !== 'Longitude') {
            feature.properties[header] = row._rawData[index];
          }
        });

        // in code add on an ID that can be used as objectId
        feature.properties.RowID = row._rowNumber;

        // add the feature to the geoJSON
        geoJSON.features.push(feature);

      });
      // the fields metadata property is required for configuring each attribute to be editable or not
      geoJSON.metadata;
      return {
        ...geoJSON, 
        metadata: { 
          idField: 'RowID', 
          name: 'Shoe Stores',
          templates: [
            {
             "name": "Google Sheets Edit Template",
             "description": "Template for editing Google Sheets features",
             "drawingTool": "esriFeatureEditToolPoint",
             "prototype": {
              "attributes": {}
             }
            }
          ], 
          fields: [
            {
              "name": "RowID",
              "type": "esriFieldTypeOID",
              "alias": "RowID",
              "sqlType": "sqlTypeInteger",
              "domain": null,
              "defaultValue": null,
              "editable": false,
              "nullable": false
            },
            {
              "name": "StoreName",
              "type": "esriFieldTypeString",
              "alias": "StoreName",
              "sqlType": "sqlTypeOther",
              "domain": null,
              "defaultValue": null,
              "length": 128,
              "editable": true,
              "nullable": false
            },
            {
              "name": "Street",
              "type": "esriFieldTypeString",
              "alias": "Street",
              "sqlType": "sqlTypeOther",
              "domain": null,
              "defaultValue": null,
              "length": 128,
              "editable": true,
              "nullable": false
            },
            {
              "name": "City",
              "type": "esriFieldTypeString",
              "alias": "City",
              "sqlType": "sqlTypeOther",
              "domain": null,
              "defaultValue": null,
              "length": 128,
              "editable": true,
              "nullable": false
            },
            {
              "name": "State",
              "type": "esriFieldTypeString",
              "alias": "State",
              "sqlType": "sqlTypeOther",
              "domain": null,
              "defaultValue": null,
              "length": 128,
              "editable": true,
              "nullable": false
            },
            {
              "name": "ZIP",
              "type": "esriFieldTypeString",
              "alias": "ZIP",
              "sqlType": "sqlTypeOther",
              "domain": null,
              "defaultValue": null,
              "length": 128,
              "editable": true,
              "nullable": false
            },
          ],
        inputCrs,
        },
      };
      
    } catch (error) {
      console.log(error)
      return error
    } 
  }
}

module.exports = Model
