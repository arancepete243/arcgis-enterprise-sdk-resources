const { arcgisToGeoJSON } = require('@terraformer/arcgis');
const { reproject } = require('reproject');
const _ = require('lodash');
const normalizeSpatialReference = require('./helpers/normalize-spatial-reference');
const { extractDatasetMetadata } = require('./helpers');

function transformApplyEditsInput(json, metadata = {}) {
  const transformFeature = transformFactory(metadata);
  const { id, updates, adds, deletes } = json;
  const transformed = {};

  if (id !== undefined) {
    transformed.id = id;
  }

  if (updates) {
    transformed.updates = updates.map(transformFeature);
  }

  if (json.adds) {
    transformed.adds = adds.map(transformFeature);
  }

  if (deletes) {
    transformed.deletes = normalizeDeleteIds(deletes);
  }

  return transformed;
}

function transformFactory(metadata) {
  const {
    dataCrs: { wkt: dataWkt },
  } = extractDatasetMetadata({ metadata });
  return (feature) => {
    const featureWkt = extractWktFromFeature(feature.geometry);

    const geojson = arcgisToGeoJSON(feature);

    if (featureWkt === dataWkt) {
      return geojson;
    }
    return reproject(geojson, featureWkt, dataWkt);
  };
}

function extractWktFromFeature(geometry) {
  const { wkid, latestWkid, wkt } = geometry?.spatialReference || {};
  const featureWkt = wkt || normalizeSpatialReference(latestWkid || wkid || 4326).wkt;
  if (geometry?.spatialReference) {
    geometry.spatialReference = undefined;
  }
  return featureWkt;
}

function normalizeDeleteIds(deletes) {
  if (_.isString(deletes)) {
    return deletes.split(',').map((element) => {
      const trimmedString = _.trim(element);
      if (_.isSafeInteger(Number(trimmedString))) {
        return Number(trimmedString);
      }
      return trimmedString;
    });
  }
  return deletes;
}

module.exports = { transformApplyEditsInput };
