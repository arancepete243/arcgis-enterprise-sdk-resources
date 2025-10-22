const _ = require('lodash');
const toEsriAttributes = require('./to-esri-attributes');

function selectFieldsToEsriAttributes(
  properties,
  geometry,
  delimitedFields,
  dateFields,
  requires_fIdGeneration,
  hashTargetKey,
) {
  const transformedProperties = toEsriAttributes(
    properties,
    geometry,
    dateFields,
    requires_fIdGeneration,
    hashTargetKey,
  );
  const fields = delimitedFields.split(',');
  return _.pick(transformedProperties, fields);
}

module.exports = selectFieldsToEsriAttributes;
