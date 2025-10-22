const { extractDatasetMetadata } = require('./extract-dataset-metadata');

module.exports = function normalizeInputForServerInfo(input = {}) {
  const { layers, tables, metadata: inputMetadata, ...rest } = input;
  const metadata = extractDatasetMetadata({ metadata: { ...inputMetadata, ...rest } });

  const normalizedLayers = getLayers(input);
  const normalizedTables = getTables(input);

  const extent = getExtent(
    inputMetadata?.extent || rest.extent,
    metadata.extent,
    normalizedLayers,
    metadata.dataSpatialReference,
  );
  const initialExtent =
    inputMetadata?.initialExtent || rest.initialExtent
      ? inputMetadata?.initialExtent || rest.initialExtent
      : extent;
  const fullExtent =
    inputMetadata?.fullExtent || rest.fullExtent
      ? inputMetadata?.fullExtent || rest.fullExtent
      : extent;
  const {
    serviceDescription,
    description,
    copyrightText,
    dataCrs,
    capabilities,
    hasStaticData,
    allowGeometryUpdates,
    maxRecordCount,
    fields,
    uniqueIdKey,
  } = metadata;

  return {
    layers: normalizedLayers,
    tables: normalizedTables,
    metadata: {
      initialExtent,
      fullExtent,
      serviceDescription,
      description,
      copyrightText,
      spatialReference: dataCrs.export(),
      capabilities,
      hasStaticData,
      allowGeometryUpdates,
      maxRecordCount,
      fields,
      uniqueIdKey,
    },
  };
};

function getLayers(input) {
  const { layers, type, features } = input;

  if (layers) {
    return layers.map((layer) => {
      const { type, features } = layer;
      const metadata = extractDatasetMetadata(layer);
      return { type, features, metadata };
    });
  }

  if (type === 'FeatureCollection') {
    const metadata = extractDatasetMetadata(input);
    if (
      metadata.resourceType === 'Feature Layer' ||
      metadata.resourceType === 'Oriented Imagery Layer'
    ) {
      return [{ type, features, metadata }];
    }
  }
  return [];
}

function getTables(input) {
  const { tables, type, features } = input;
  if (tables) {
    return tables.map((table) => {
      const { type, features } = table;
      const metadata = extractDatasetMetadata(table);
      return { type, features, metadata };
    });
  }

  if (type === 'FeatureCollection') {
    const metadata = extractDatasetMetadata(input);
    if (metadata.resourceType === 'Table') {
      return [{ type, features, metadata }];
    }
  }
  return [];
}

function getExtent(providerExtent, metadataExtent, layers, spatialReference) {
  if (providerExtent) {
    return { ...providerExtent, spatialReference };
  }

  if (layers.length > 0) {
    return calculateServiceExtentFromLayers(layers, spatialReference);
  }

  return metadataExtent;
}
function calculateServiceExtentFromLayers(layers, spatialReference) {
  const { xmins, xmaxs, ymins, ymaxs } = layers.reduce(
    (accumulator, layer) => {
      const {
        metadata: { extent },
      } = layer;
      const { xmin, ymin, xmax, ymax } = extent;
      accumulator.xmins.push(xmin);
      accumulator.xmaxs.push(xmax);
      accumulator.ymins.push(ymin);
      accumulator.ymaxs.push(ymax);
      return accumulator;
    },
    { xmins: [], xmaxs: [], ymins: [], ymaxs: [] },
  );

  return {
    xmin: Math.min(...xmins),
    xmax: Math.max(...xmaxs),
    ymin: Math.min(...ymins),
    ymax: Math.max(...ymaxs),
    spatialReference,
  };
}
