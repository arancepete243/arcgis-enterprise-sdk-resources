const { renderCountAndExtentResponse } = require('./render-count-and-extent');
const { renderFeaturesResponse } = require('./render-features');
const { renderStatisticsResponse } = require('./render-statistics');

function renderGeoserviceQueryResults(data, metadata, requestParams) {
  const { returnCountOnly, returnExtentOnly, returnIdsOnly, _derived } = requestParams;
  const { outputCrs } = _derived || {};

  // TODO: if only count, and f=pbf need to encode response
  if (returnCountOnly || returnExtentOnly) {
    return renderCountAndExtentResponse(data.features, {
      returnCountOnly,
      returnExtentOnly,
      outputCrs,
    });
  }

  if (returnIdsOnly) {
    return renderIdsOnlyResponse(data.features, metadata.uniqueIdKey);
  }

  if (data.statistics) {
    return renderStatisticsResponse(data.statistics, metadata.fields, requestParams);
  }

  return renderFeaturesResponse(data.features, metadata, requestParams);
}

function renderIdsOnlyResponse(features, uniqueIdKey) {
  const objectIds = features.map(({ attributes }) => {
    return attributes[uniqueIdKey];
  });

  return {
    objectIdFieldName: uniqueIdKey,
    objectIds,
  };
}

module.exports = { renderGeoserviceQueryResults };
