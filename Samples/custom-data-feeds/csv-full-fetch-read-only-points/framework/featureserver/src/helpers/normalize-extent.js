const joi = require('joi');

const esriExtentSchema = joi
  .object({
    xmin: joi.number().required(),
    xmax: joi.number().required(),
    ymin: joi.number().required(),
    ymax: joi.number().required(),
    type: joi.string().optional(),
    spatialReference: joi
      .object()
      .keys({
        wkid: joi.number().integer().optional(),
        latestWkid: joi.number().integer().optional(),
        wkt: joi.string().optional(),
      })
      .optional(),
  })
  .unknown();

module.exports = function normalizeExtent(input, spatialReference) {
  if (!input) {
    return undefined;
  }

  const { value: esriExtent } = validate(input, esriExtentSchema);

  if (esriExtent) {
    return { spatialReference, ...esriExtent };
  }

  throw new Error(`Received invalid extent: ${JSON.stringify(input)}`);
};

function validate(input, schema) {
  const { error, value } = schema.validate(input);
  if (error) return { error };
  return { value };
}
