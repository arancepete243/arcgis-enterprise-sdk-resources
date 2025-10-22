const Joi = require('joi');
const { arcgisToGeoJSON } = require('@terraformer/arcgis');
const INVALID_PARAMETERS_MSG = 'Unable to apply edits. Please check your parameters.';

const layerEditSchema = Joi.object({
  adds: Joi.array()
    .items(
      Joi.object({
        attributes: Joi.object().optional(),
        geometry: Joi.object().optional(),
      }),
    )
    .allow(null, '')
    .optional(),
  updates: Joi.array()
    .items(
      Joi.object({
        attributes: Joi.object().required(),
        geometry: Joi.object().optional(),
      }),
    )
    .allow(null, '')
    .optional(),
  deletes: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string()),
      Joi.array().items(Joi.number()),
      Joi.string(),
      Joi.number().integer(),
    )
    .allow(null, '')
    .optional(),
}).unknown(true);

const serverEditSchema = Joi.object({
  edits: Joi.array().items(
    layerEditSchema.keys({
      id: Joi.alternatives(Joi.string(), Joi.number().integer()).required(),
    }),
  ),
}).unknown(true);

function validateServerApplyEdits(body) {
  schemaValidate(body, serverEditSchema);
}

function validateLayerApplyEdits(body, metadata = {}) {
  schemaValidate(body, layerEditSchema);
  const uniqueIdKey = metadata.idField || 'OBJECTID';
  validateUpdates(body.updates, uniqueIdKey);
  validateLayerGeometry(body, metadata);
}

function validateUpdates(updates, uniqueIdKey) {
  if (!updates || updates.length === 0) {
    return;
  }

  if (
    updates.some((update) => {
      return !update?.attributes || !update.attributes[uniqueIdKey];
    })
  ) {
    const error = new Error(`Update feature missing identifier attribute.`);
    throw createParameterError(error);
  }

  return;
}

function validateLayerGeometry(layerEdits) {
  if (layerEdits.adds) {
    geometryValidate(layerEdits.adds);
  }

  if (layerEdits.updates) {
    geometryValidate(layerEdits.updates);
  }
}

function schemaValidate(data, schema) {
  const { error } = schema.validate(data);

  if (error) {
    const validationError = new Error(error.message);
    throw createParameterError(validationError);
  }
}

function geometryValidate(featureArray) {
  const geoJSON = featureArray.map((feature) => {
    // Remove spatial ref from feature, it causes problems for conversion
    const spatialReference = extractSpatialReference(feature.geometry);

    // convert
    const geojson = arcgisToGeoJSON(feature);

    // replace any spatial reference
    if (spatialReference) {
      feature.geometry.spatialReference = spatialReference;
    }

    return geojson;
  });

  const predicate = geometryValidationPredicateFactory(featureArray);
  geoJSON.forEach(predicate);
}

function geometryValidationPredicateFactory(arcgisFeatures) {
  return (feature, index) => {
    if (arcgisFeatures[index].geometry && !feature.geometry) {
      const error = new Error(
        `Invalid feature geometry: ${JSON.stringify(arcgisFeatures[index].geometry)}`,
      );
      throw createParameterError(error);
    }
  };
}

function extractSpatialReference(geometry) {
  let spatialReference;

  if (geometry?.spatialReference) {
    spatialReference = geometry.spatialReference;
    geometry.spatialReference = undefined;
  }

  return spatialReference;
}

function createParameterError(err) {
  const error = new Error(INVALID_PARAMETERS_MSG);
  error.code = 400;
  error.details = [err];
  return error;
}

module.exports = { validateServerApplyEdits, validateLayerApplyEdits };
