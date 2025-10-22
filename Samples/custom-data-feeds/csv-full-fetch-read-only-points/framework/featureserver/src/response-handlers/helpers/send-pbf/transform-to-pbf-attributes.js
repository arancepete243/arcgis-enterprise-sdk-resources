const _ = require('lodash');
const { isBigInt } = require('../../../helpers');

const typeLookup = {
  esriFieldTypeInteger: 'sintValue',
  esriFieldTypeSmallInteger: 'sintValue',
  esriFieldTypeString: 'stringValue',
  esriFieldTypeDouble: 'doubleValue',
  esriFieldTypeDate: 'sint64Value',
  esriFieldTypeBigInteger: 'sint64Value',
  esriFieldTypeGlobalID: 'stringValue',
};

function transformToPbfAttributes(attributes, fieldMap) {
  return _.chain(attributes)
    .entries(attributes)
    .map(([key, value]) => ({
      name: key,
      value,
    }))
    .orderBy(['name'], ['asc'])
    .map(({ name, value }) => {
      const type = fieldMap[name];
      const pbfType = dataTypeLookup(type, value);
      return { [pbfType]: value };
    })
    .value();
}

function dataTypeLookup(fieldType, value) {
  if (fieldType === 'esriFieldTypeOID') {
    if (isBigInt(value)) {
      return 'sint64Value';
    }
    return Number.isInteger(value) ? 'uintValue' : 'stringValue';
  }
  return typeLookup[fieldType];
}

module.exports = {
  transformToPbfAttributes,
};
