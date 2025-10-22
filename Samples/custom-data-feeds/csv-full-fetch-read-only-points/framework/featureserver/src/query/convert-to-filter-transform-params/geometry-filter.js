const _ = require('lodash');
const normalizeArray = require('../normalize-array');
const { arcgisToGeoJSON } = require('@terraformer/arcgis');
const bboxPolygon = require('@turf/bbox-polygon').default;
const projectCoordinates = require('./project-coordinates');
const normalizeGeometryFilterSpatialReference = require('./geometry-filter-spatial-reference');

function normalizeGeometryFilter(geometry, inSR, dataWkt) {
  const { wkt: filterWkt } = normalizeGeometryFilterSpatialReference(geometry, inSR) || {
    wkt: dataWkt,
  };

  const geometryFilter = transformGeometryToGeojson(geometry);

  if (!geometryFilter || filterWkt === dataWkt) {
    return geometryFilter;
  }

  geometryFilter.coordinates = projectCoordinates({
    coordinates: geometryFilter.coordinates,
    fromSR: filterWkt,
    toSR: dataWkt,
  });

  return geometryFilter;
}

function transformGeometryToGeojson(geometry) {
  if (_.isString(geometry) || Array.isArray(geometry)) {
    const coordinates = normalizeArray(geometry);

    if (coordinates.length === 2) {
      return {
        type: 'Point',
        coordinates: coordinates.map(Number),
      };
    }

    const { geometry: polygon } = bboxPolygon(coordinates);
    return polygon;
  }

  if (geometry.xmin || geometry.xmin === 0) {
    return transformEsriEnvelopeToPolygon(geometry);
  }

  if (geometry.x || geometry.rings || geometry.paths || geometry.points) {
    return arcgisToGeoJSON(geometry);
  }

  return;
}

function transformEsriEnvelopeToPolygon({ xmin, ymin, xmax, ymax }) {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [xmin, ymin],
        [xmax, ymin],
        [xmax, ymax],
        [xmin, ymax],
        [xmin, ymin],
      ],
    ],
  };
}

module.exports = normalizeGeometryFilter;
