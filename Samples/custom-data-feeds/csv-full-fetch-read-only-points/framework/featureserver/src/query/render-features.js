function renderFeaturesResponse(features, metadata, requestParams) {
  const { hasZ, geometryType, uniqueIdKey, fields } = metadata;

  const {
    outFields,
    transform,
    _derived: { exceededTransferLimit = false, outputCrs },
  } = requestParams;

  const computedProperties = {
    geometryType,
    spatialReference: outputCrs.export(),
    fields: getQueryFields(fields, outFields),
    features,
    exceededTransferLimit,
    objectIdFieldName: uniqueIdKey,
    uniqueIdField: {
      isSystemMaintained: true,
      name: uniqueIdKey,
    },
    hasZ: !!hasZ,
  };

  if (transform) {
    computedProperties.transform = transform;
  }

  return { globalIdFieldName: '', hasM: false, ...computedProperties };
}

function getQueryFields(fields, outFields) {
  if (!outFields || outFields.length === 0) {
    return fields.map(stripLayerFieldAttributes);
  }

  return fields
    .filter((field) => {
      return outFields.includes(field.name) || outFields.includes(field.alias);
    })
    .map(stripLayerFieldAttributes);
}

function stripLayerFieldAttributes(field) {
  const { editable, nullable, ...rest } = field;
  return rest;
}

module.exports = { renderFeaturesResponse };
