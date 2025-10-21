const {
  normalizeInputForServerInfo: normalizeInputData,
  normalizeRequestParameters,
  validateInfoRouteParams,
} = require('./helpers');
const ServerMetadata = require('./helpers/server-metadata');
const { generalResponseHandler } = require('./response-handlers');

function serverInfo(req, res, data) {
  const requestParameters = normalizeRequestParameters(req.body, req.query);

  validateInfoRouteParams(requestParameters);

  const { layers, tables, metadata } = normalizeInputData(data);

  const {
    initialExtent,
    fullExtent,
    serviceDescription,
    description,
    copyrightText,
    spatialReference,
    capabilities,
    hasStaticData,
    allowGeometryUpdates,
    maxRecordCount,
  } = metadata;

  const payload = ServerMetadata.create({
    description,
    serviceDescription,
    copyrightText,
    capabilities,
    hasStaticData,
    initialExtent,
    fullExtent,
    allowGeometryUpdates,
    maxRecordCount,
    spatialReference,
    layers: layers.map(formatServerItemInfo),
    tables: tables.map((table, idx) => {
      return formatServerItemInfo(table, layers.length + idx);
    }),
    relationships: [],
  });

  return generalResponseHandler(res, payload, requestParameters);
}

function formatServerItemInfo(json, defaultId) {
  const {
    metadata: {
      id,
      name,
      minScale = 0,
      maxScale = 0,
      defaultVisibility,
      resourceType,
      geometryType,
    },
  } = json;

  const defaultName =
    resourceType === 'Table' ? `Table_${id || defaultId}` : `Layer_${id || defaultId}`;

  const retVal = {
    id: id || defaultId,
    name: name || defaultName,
    type: resourceType,
    parentLayerId: -1,
    defaultVisibility: defaultVisibility !== false,
    subLayerIds: null,
    minScale,
    maxScale,
  };

  if (geometryType) {
    retVal.geometryType = geometryType;
  }

  return retVal;
}

module.exports = serverInfo;
