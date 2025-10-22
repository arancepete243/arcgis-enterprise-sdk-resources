const {
  ObjectIdField,
  FieldFromKeyValue,
  FieldFromFieldDefinition,
  ObjectIdFieldFromDefinition,
} = require('./field-classes');

class Fields {
  constructor(params) {
    const { fieldDefinitions, attributeSample = {}, uniqueIdKey } = params;

    this.fields = fieldDefinitions
      ? setFieldsFromDefinitions(fieldDefinitions, uniqueIdKey)
      : setFieldsFromProperties(attributeSample, uniqueIdKey);
  }
}

function setFieldsFromDefinitions(fieldDefinitions, idField) {
  const fields = fieldDefinitions
    .filter((fieldDefinition) => fieldDefinition.name !== idField)
    .map((fieldDefinition) => {
      return new FieldFromFieldDefinition(fieldDefinition);
    });

  const idFieldDefinition = getIdFieldDefinition(fieldDefinitions, idField);
  fields.unshift(new ObjectIdFieldFromDefinition(idFieldDefinition));
  return fields;
}

function setFieldsFromProperties(propertiesSample, uniqueIdKey) {
  const fieldNames = Object.keys(propertiesSample);
  const simpleFieldNames = fieldNames.filter((name) => name !== uniqueIdKey);

  const fields = simpleFieldNames.map((key) => {
    return new FieldFromKeyValue(key, propertiesSample[key]);
  });

  fields.unshift(new ObjectIdField(uniqueIdKey));

  return fields;
}

function getIdFieldDefinition(fieldDefinitions, uniqueIdKey) {
  if (uniqueIdKey === 'OBJECTID' || uniqueIdKey === '_fId') {
    return { name: uniqueIdKey };
  }

  return fieldDefinitions.find((definition) => {
    return definition.name === uniqueIdKey;
  });
}

module.exports = Fields;
