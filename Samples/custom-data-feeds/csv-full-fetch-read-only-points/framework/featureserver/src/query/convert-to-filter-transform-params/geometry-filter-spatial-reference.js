const _ = require('lodash');
const normalizeArray = require('../normalize-array');
const { normalizeSpatialReference } = require('../../helpers');

/**
 * Normalize the input spatial reference for a geometry filter. Look on options.geometry
 * object first; if spatial reference not present, look in options.inSR
 */
function normalizeGeometryFilterSpatialReference(geometry, inSR) {
  const geometryEnvelopeSpatialReference = extractGeometryFilterSpatialReference(geometry);

  return normalizeSpatialReference(geometryEnvelopeSpatialReference || inSR);
}

function extractGeometryFilterSpatialReference(geometry) {
  if (_.isString(geometry) || _.isArray(geometry)) {
    const geometryArray = normalizeArray(geometry);
    if (geometryArray.length === 5) return geometryArray[4];
  }

  if (_.isObject(geometry)) return geometry.spatialReference;
}

module.exports = normalizeGeometryFilterSpatialReference;
