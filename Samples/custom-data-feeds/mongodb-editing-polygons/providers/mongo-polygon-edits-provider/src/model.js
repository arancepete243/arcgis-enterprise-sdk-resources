const { MongoClient, ServerApiVersion } = require('mongodb');
const config = require('./mongo-config.json');
const { performEdits, fetchDocs, convertDocsToGeoJSON } = require('./helpers');

class Model {
  #client;
  #databaseLookup;
  #definedCollectionsOnly;
  #logger;

  constructor(
    { logger },
    { connectString, databases, definedCollectionsOnly } = {},
  ) {
    this.#logger = logger;
    const databaseUri = connectString || config?.editable_mongodb_polygon_provider?.connectString;
  
    try {
      this.#client = new MongoClient(databaseUri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
      });
  
      this.#databaseLookup = databases || config?.editable_mongodb_polygon_provider?.databases || {};
      this.#definedCollectionsOnly =
        definedCollectionsOnly ||
        config?.editable_mongodb_polygon_provider?.definedCollectionsOnly ||
        false;
    } catch (error) {
      // Throw an error and stop execution if MongoDB connection fails
      throw new Error('Failed to connect to MongoDB. Please check your connection settings.');
    }
  }

  async getMetadata() {
    return {
        idField: 'alternateID',
        inputCrs: 4326
    }
  }

  async editData(req, editData) {

    // assign database and collection from service
    const databaseName = req.params.db;
    const collectionName = req.params.collection;

    const database  = this.#client.db(databaseName);
    const collection = database.collection(collectionName);

    let applyEditsResponse = {}

    applyEditsResponse = await performEdits(collection, editData);

    return applyEditsResponse;

  }

  // this a bare bones getData function not intended to be a full example
  async getData(req) {

    // assign database and collection name from service parameters
    const databaseName = req.params.db;
    const collectionName = req.params.collection;

    try {

      const database  = this.#client.db(databaseName);
      const collection = database.collection(collectionName);

      const results = await fetchDocs(collection);
     
      const geojson = convertDocsToGeoJSON(results, 'location');

      return {...geojson, metadata: { 
        idField: 'alternateID', 
        name: 'Fires',
        templates: [
          {
           "name": "Edit MongoDB Fires",
           "description": "Template for editing features",
           "drawingTool": "esriFeatureEditToolPoint",
           "prototype": {
            "attributes": {}
           }
          }
         ],
        fields: [
          {
            "name": "alternateID",
            "type": "esriFieldTypeOID",
            "alias": "alternateID",
            "sqlType": "sqlTypeInteger",
            "domain": null,
            "defaultValue": null,
            "editable": false
          },
          {
              "name": "_id",
              "type": "esriFieldTypeString",
              "alias": "_id",
              "sqlType": "sqlTypeOther",
              "domain": null,
              "defaultValue": null,
              "length": 128,
              "editable": false
          },
          {
              "name": "fireId",
              "type": "esriFieldTypeString",
              "alias": "fireId",
              "sqlType": "sqlTypeOther",
              "domain": null,
              "defaultValue": null,
              "length": 128,
              "editable": true
          },
          {
              "name": "fireName",
              "type": "esriFieldTypeString",
              "alias": "fireName",
              "sqlType": "sqlTypeOther",
              "domain": null,
              "defaultValue": null,
              "length": 128,
              "editable": true
          },
          {
              "name": "fireType",
              "type": "esriFieldTypeString",
              "alias": "fireType",
              "sqlType": "sqlTypeOther",
              "domain": null,
              "defaultValue": null,
              "length": 128,
              "editable": true
          },
          {
              "name": "acres",
              "type": "esriFieldTypeInteger",
              "alias": "acres",
              "sqlType": "sqlTypeOther",
              "domain": null,
              "defaultValue": null,
              "editable": true
          }
        ]
      }};

    } catch (error) {
      console.log(error)
      return error
    }
    
  }
}

module.exports = Model;