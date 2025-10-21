const _ = require('lodash');
const esriExtent = require('esri-extent');

function renderCountAndExtentResponse(features, params) {
  const { returnCountOnly, returnExtentOnly, outSR } = params;

  if (returnCountOnly && returnExtentOnly) {
    return {
      count: features.length,
      extent: getExtent({ features }, outSR),
    };
  }

  if (returnCountOnly) {
    return {
      count: features.length,
    };
  }

  return {
    extent: getExtent({ features }, outSR),
  };
}

function getExtent(geojson, outSR) {
  // Calculate extent from features
  const extent = esriExtent(geojson);

  if (!outSR) {
    return extent;
  }

  // esri-extent assumes WGS84, but data passed in may have CRS.
  // Math should be the same different CRS but we need to alter the spatial reference

  if (_.isObject(outSR)) {
    extent.spatialReference = outSR;
  }

  if (Number.isInteger(Number(outSR))) {
    extent.spatialReference = { wkid: Number(outSR) };
  } else if (_.isString(outSR)) {
    extent.spatialReference = { wkt: outSR };
  }

  return extent;
}

module.exports = { renderCountAndExtentResponse };
