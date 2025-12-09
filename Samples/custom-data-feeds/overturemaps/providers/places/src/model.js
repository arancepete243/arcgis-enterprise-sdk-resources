class Model {
  #logger;

  constructor(
    { logger }
  ){
    this.#logger = logger;
  }

  // Every model.js file requires a getData() method
  async getData(req) {

    //Parameters are accessible on the request object. Use the logger method rather than 'console.log' in your code.
    this.#logger.info(req.params);

    const geojson = {
      type: 'FeatureCollection',
      features: [{
        properties: {
          id: 495772917,
          place_name: "Esri Headquarters",
          state: "California",
          city: "Redlands"
        },
        geometry: {
          type: 'Point',
          coordinates: [-117.195, 34.057]
        }
      }]
    }
   
    return {
      ...geojson,
      metadata: {
        idField: "id",  // This field will be stipulated as the Object ID
        inputCrs: 4326, // This value represents the coordinate system of the features being returned by getData()
        name: "Layer name", // Use this property to name your layer
        description: "Layer description", // Use this propterty to give your layer a description
        fields: [  // Use the fields array to define each feature's attributes
          { name: "id", type: "bigInt", alias: "id" },
          { name: "place_name", type: "string", alias: "place" },
          { name: "state", type: "string", alias: "state"},
          { name: "city", type: "string", alias: "city"}
        ]
      }
    }
  };
}

module.exports = Model
