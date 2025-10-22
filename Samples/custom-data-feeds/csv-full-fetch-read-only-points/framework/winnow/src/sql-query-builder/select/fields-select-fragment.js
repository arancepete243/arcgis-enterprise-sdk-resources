function createFieldsSelectFragment(params) {
  const { fields, toEsri } = params;

  if (toEsri) {
    return selectFieldsAsEsriJson(params);
  }

  return selectFieldsAsGeoJson(fields);
}

function selectFieldsAsEsriJson(params) {
  const { fields, dateFields = [], requires_fIdGeneration = false, hashTargetKey = null } = params;
  const delimitedDateFields = dateFields.join(',');
  if (fields && fields.length > 0) {
    return `selectFieldsToEsriAttributes(properties, geometry, "${fields.join(',')}", "${delimitedDateFields}", "${requires_fIdGeneration}", "${hashTargetKey}") as attributes`;  // eslint-disable-line
  }
  return `toEsriAttributes(properties, geometry, "${delimitedDateFields}", "${requires_fIdGeneration}", "${hashTargetKey}") as attributes`;   // eslint-disable-line
}

function selectFieldsAsGeoJson(fields) {
  if (fields) {
    return `selectFields(properties, "${fields.join(',')}") as properties`;
  }
  return 'type, properties as properties';
}

module.exports = createFieldsSelectFragment;
