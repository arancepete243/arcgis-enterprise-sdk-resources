const normalizeFields = require('./out-fields');
const normalizeObjectIds = require('./object-ids');
const normalizeArray = require('../normalize-array');
const { normalizeSpatialReference } = require('../../helpers');
const logManager = require('../../log-manager');

function normalizeQueryParams(params, { maxRecordCount } = {}) {
  const outSR = normalizeSR({ outSR: params.outSR });
  const inSR = normalizeSR({ inSR: params.inSR });
  const objectIds = normalizeObjectIds(params.objectIds);
  const outFields = normalizeFields(params.outFields);
  const returnGeometry = params.returnGeometry !== false;
  const spatialRel = !params.geometry && params.spatialRel;
  const orderByFields = normalizeArray(params.orderByFields);
  const groupByFieldsForStatistics = normalizeArray(params.groupByFieldsForStatistics);
  const resultRecordCount = getInteger(params.resultRecordCount) || maxRecordCount;
  const resultOffset = getInteger(params.resultOffset);
  const f = params.f ? params.f : 'json';

  return {
    ...params,
    f,
    resultOffset,
    resultRecordCount,
    groupByFieldsForStatistics,
    orderByFields,
    spatialRel,
    returnGeometry,
    objectIds,
    outSR,
    inSR,
    outFields,
  };
}

function normalizeSR({ outSR, inSR }) {
  if (!outSR && !inSR) {
    return;
  }

  const normalizedSR = normalizeSpatialReference(outSR || inSR);

  if (!normalizedSR) {
    const msgLabel = outSR ? 'outSR' : 'inSR';
    logManager.logger.debug(
      `${msgLabel} "${outSR || inSR}" unknown. Defaulting to dataset coordinate system`,
    );
  }

  return normalizedSR;
}

function getInteger(input) {
  if (!input || !Number.isInteger(Number(input))) {
    return;
  }

  return Number(input);
}

module.exports = normalizeQueryParams;
