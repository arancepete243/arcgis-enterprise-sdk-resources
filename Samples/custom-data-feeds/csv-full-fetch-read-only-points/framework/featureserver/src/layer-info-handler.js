const {
  TableLayerMetadata,
  FeatureLayerMetadata,
  validateInfoRouteParams,
  normalizeRequestParameters,
  extractDatasetMetadata,
} = require('./helpers');
const { generalResponseHandler } = require('./response-handlers');

function layerInfo(req, res, data) {
  const requestParameters = normalizeRequestParameters(req.body, req.query);
  const layerId = Number(req.params.layer);
  const metadata = extractDatasetMetadata(data);
  validateInfoRouteParams(requestParameters);

  const payload = getPayload(data, metadata, layerId);
  return generalResponseHandler(res, payload, requestParameters);
}

module.exports = layerInfo;

function getPayload(data, metadata, layerId) {
  if (metadata.resourceType === 'Table') {
    return TableLayerMetadata.create(data, metadata, layerId);
  }

  return FeatureLayerMetadata.create(data, metadata, layerId);
}
