const { query: queryAndTransform } = require('../../../winnow');
const convertToFilterTransformParams = require('./convert-to-filter-transform-params');

function filterAndTransform(features, metadata, requestParams) {
  // normalize everything here; winnow should have a strict contract
  const filterAndTransformParams = convertToFilterTransformParams(metadata, requestParams);

  const result = queryAndTransform(features, filterAndTransformParams);

  const { outStatistics } = requestParams;

  if (outStatistics) {
    return {
      statistics: result,
    };
  }

  if (result.length > requestParams.resultRecordCount) {
    result.pop();

    return { features: result, exceededTransferLimit: true };
  }

  return { features: result, exceededTransferLimit: false };
}

module.exports = { filterAndTransform };
