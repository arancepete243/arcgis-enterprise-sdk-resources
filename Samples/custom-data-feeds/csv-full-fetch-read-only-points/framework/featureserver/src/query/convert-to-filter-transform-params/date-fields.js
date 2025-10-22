function deriveDateFields(metadataFields, requestedFields) {
  return metadataFields
    .filter(({ type, name }) => {
      return (
        type === 'esriFieldTypeDate' &&
        (requestedFields === undefined ||
          requestedFields.length === 0 ||
          requestedFields.indexOf(name) > -1)
      );
    })
    .map(({ name }) => {
      return name;
    });
}

module.exports = deriveDateFields;
