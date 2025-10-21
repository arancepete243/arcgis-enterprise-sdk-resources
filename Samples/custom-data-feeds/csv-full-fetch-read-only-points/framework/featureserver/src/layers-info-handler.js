const {
  normalizeInputForServerInfo,
  TableLayerMetadata,
  FeatureLayerMetadata,
  validateInfoRouteParams,
  normalizeRequestParameters,
} = require('./helpers');
const { generalResponseHandler } = require('./response-handlers');

module.exports = function layersMetadata(req, res, data) {
  const requestParameters = normalizeRequestParameters(req.body, req.query);

  validateInfoRouteParams(requestParameters);

  const { layers: layersInput, tables: tablesInput } = normalizeInputForServerInfo(data);

  const layers = layersInput.map((layer, i) => {
    return FeatureLayerMetadata.create(layer, layer.metadata, i);
  });

  const tables = tablesInput.map((table, i) => {
    return TableLayerMetadata.create(table, table.metadata, layers.length + i);
  });

  generalResponseHandler(res, { layers, tables }, requestParameters);
  return;
};
