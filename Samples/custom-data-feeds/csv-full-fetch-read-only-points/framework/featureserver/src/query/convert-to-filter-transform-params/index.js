const normalizeWhere = require('./where');
const extractAggregationFields = require('./extract-aggregation-fields');
const getDateFields = require('./date-fields');
const normalizeGeometryFilter = require('./geometry-filter');
const esriPredicates = {
  esriSpatialRelContains: 'ST_Contains',
  esriSpatialRelWithin: 'ST_Within',
  esriSpatialRelIntersects: 'ST_Intersects',
  esriSpatialRelEnvelopeIntersects: 'ST_EnvelopeIntersects',
};

function buildFilterTransformParams(metadata, requestParams) {
  const { uniqueIdKey, requires_fIdGeneration, hashTargetKey, dataCrs } = metadata;

  const {
    where,
    objectIds,
    outFields,
    returnDistinctValues,
    returnGeometry,
    returnIdsOnly,
    geometry,
    spatialRel,
    inSR,
    orderByFields,
    groupByFieldsForStatistics,
    resultRecordCount,
    resultOffset,
    outStatistics,
    geometryPrecision,
    f,
    _derived: { outputCrs } = {},
  } = requestParams;

  const queryWhere = normalizeWhere(where, objectIds, uniqueIdKey);

  const requestedFields = getRequestedFields(outFields, returnIdsOnly, uniqueIdKey);

  const spatialFilter =
    returnGeometry !== false && geometry && normalizeGeometryFilter(geometry, inSR, dataCrs.wkt);
  const spatialFilterPredicate =
    returnGeometry !== false && spatialRel && esriPredicates[spatialRel];
  const limit = resultRecordCount ? resultRecordCount + 1 : undefined;
  const aggregates = extractAggregationFields(outStatistics);
  const distinct = !!returnDistinctValues;
  const dateFields = getDateFields(metadata.fields, requestedFields);
  const toEsri = f !== 'geojson';

  return {
    uniqueIdKey,
    requires_fIdGeneration,
    hashTargetKey,
    inputCrs: dataCrs,
    outputCrs,
    where: queryWhere,
    fields: requestedFields,
    dateFields,
    returnGeometry: returnGeometry !== false,
    geometry: spatialFilter,
    geometryPrecision,
    geometryPredicate: spatialFilterPredicate,
    order: orderByFields,
    groupBy: groupByFieldsForStatistics,
    limit,
    offset: resultOffset,
    aggregates,
    distinct,
    toEsri,
  };
}

function getRequestedFields(outFields, returnIdsOnly, uniqueIdKey) {
  if (returnIdsOnly) {
    return [uniqueIdKey];
  }

  return outFields;
}

module.exports = buildFilterTransformParams;
