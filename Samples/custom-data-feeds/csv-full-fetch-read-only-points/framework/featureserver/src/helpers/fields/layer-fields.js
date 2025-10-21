const Fields = require('./fields');

class LayerFields extends Fields {
  static create(fieldDefinitions, attributeSample, uniqueIdKey) {
    return new LayerFields(fieldDefinitions, attributeSample, uniqueIdKey);
  }

  constructor(fieldDefinitions, attributeSample, uniqueIdKey) {
    super({ fieldDefinitions, attributeSample, uniqueIdKey });

    return this.fields.map((field) => {
      const { editable = false, nullable = false } = findDefinition(field.name, fieldDefinitions);
      field.setEditable(editable).setNullable(nullable);
      return field;
    });
  }
}

function findDefinition(fieldName, fieldDefinitions = []) {
  return (
    fieldDefinitions.find((definition) => {
      return definition.name === fieldName;
    }) || {}
  );
}
module.exports = LayerFields;
