const { renderPrecalculatedStatisticsResponse } = require('./render-precalculated-statistics');

function renderPredeterminedQueryResult(data, requestParams) {
  const { statistics, count, extent } = data;
  const { returnCountOnly, returnExtentOnly, outStatistics, groupByFieldsForStatistics } =
    requestParams;

  if (statistics) {
    return renderPrecalculatedStatisticsResponse(data, {
      outStatistics,
      groupByFieldsForStatistics,
    });
  }

  const retVal = {};

  if (returnCountOnly) {
    retVal.count = count;
  }

  if (returnExtentOnly) {
    retVal.extent = extent;
  }

  return retVal;
}

module.exports = { renderPredeterminedQueryResult };
