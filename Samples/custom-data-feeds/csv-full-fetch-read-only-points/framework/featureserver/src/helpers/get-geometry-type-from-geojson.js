const _ = require('lodash');
const logManager = require('../log-manager');

const arcgisLookup = {
  Point: 'esriGeometryPoint',
  MultiPoint: 'esriGeometryMultipoint',
  LineString: 'esriGeometryPolyline',
  MultiLineString: 'esriGeometryPolyline',
  Polygon: 'esriGeometryPolygon',
  MultiPolygon: 'esriGeometryPolygon',
  esriGeometryPoint: 'esriGeometryPoint',
  esriGeometryMultipoint: 'esriGeometryMultipoint',
  esriGeometryPolyline: 'esriGeometryPolyline',
  esriGeometryPolygon: 'esriGeometryPolygon',
};

module.exports = function getGeometryTypeFromGeojson({
  geometryType,
  metadata = {},
  features = [],
} = {}) {
  const type = geometryType || metadata.geometryType || findInFeatures(features);

  const arcgisGeometryType = arcgisLookup[type];

  if (!arcgisGeometryType && features.length > 0) {
    logManager.logger.debug(`Input JSON has unsupported geometryType: ${type}`);
  }
  return arcgisGeometryType;
};

function findInFeatures(features) {
  const featureWithGeometryType = features.find((feature) => {
    return _.get(feature, 'geometry.type');
  });

  if (!featureWithGeometryType) return;

  return featureWithGeometryType.geometry.type;
}
