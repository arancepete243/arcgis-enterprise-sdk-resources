const _ = require('lodash');
const { queryResponseHandler } = require('../response-handlers');
const { validateQueryRequestParams } = require('./validate-query-request-parameters');
const { normalizeRequestParameters } = require('../helpers/normalize-request-params');
const { extractDatasetMetadata } = require('../helpers');
const normalizeQueryParams = require('./normalize-query-params');
const { renderPredeterminedQueryResult } = require('./render-precalculated-query-results');
const { filterAndTransform } = require('./filter-and-transform');
const { renderGeoserviceQueryResults } = require('./render-geoservice-query-results');
const { logProviderDataWarnings } = require('./log-provider-data-warnings');

function queryHandler(req, res, data) {
  const metadata = extractDatasetMetadata(data);
  const requestParams = normalizeRequestParameters(req.body, req.query);
  validateQueryRequestParams(requestParams);
  const queryOperationParams = normalizeQueryParams(requestParams, {
    maxRecordCount: metadata.maxRecordCount,
  });

  const params = prepareParams(queryOperationParams, metadata);

  if (shouldRenderPrecalculatedData(data, params)) {
    return renderPredeterminedQueryResult(data, params);
  }

  logProviderDataWarnings(metadata, requestParams, data.metadata?.fields);
  const result = shouldFilterOrTransform(data.features, metadata.filtersApplied)
    ? filterAndTransform(data.features, metadata, params)
    : data.features || [];

  params._derived.exceededTransferLimit =
    metadata.exceededTransferLimit !== undefined
      ? metadata.exceededTransferLimit
      : result.exceededTransferLimit;

  const json = formatQueryResponseJson(result, metadata, params);

  return queryResponseHandler(res, json, params);
}

function formatQueryResponseJson(result, metadata, requestParams) {
  if (requestParams.f === 'geojson') {
    return {
      type: 'FeatureCollection',
      features: result.features,
    };
  }

  return renderGeoserviceQueryResults(result, metadata, requestParams);
}

function shouldFilterOrTransform(features, filtersApplied) {
  return !!features && features.length > 0 && filtersApplied !== 'all';
}

function prepareParams(queryParams, metadata) {
  const params = removeParamsAlreadyApplied(metadata.filtersApplied, queryParams);

  return {
    ...params,
    _derived: {
      outputCrs: queryParams.outSR || metadata.dataCrs,
    },
  };
}

function removeParamsAlreadyApplied(alreadyApplied, requestParams) {
  const parameters = _.cloneDeep(requestParams);
  for (const key in alreadyApplied) {
    delete parameters[key];
  }

  return parameters;
}

function shouldRenderPrecalculatedData(json, requestParameters) {
  const { statistics, count, extent } = json;
  const { returnCountOnly, returnExtentOnly } = requestParameters;

  return (
    !!statistics ||
    (returnCountOnly === true && count !== undefined) ||
    (returnExtentOnly === true && extent && !returnCountOnly)
  );
}
module.exports = queryHandler;
