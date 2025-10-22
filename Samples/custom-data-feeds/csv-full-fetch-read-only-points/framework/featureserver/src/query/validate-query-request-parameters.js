const joi = require('joi');
const { sharedQueryParamSchema } = require('../helpers/shared-query-request-param-schema');

const formatSchema = joi.string().valid('json', 'pjson', 'pbf', 'geojson').default('json');

const spatialReferenceSchema = joi
  .object({
    wkid: joi.number().integer().required(),
    latestWkid: joi.number().integer(),
  })
  .unknown();

const esriExtentSchema = joi.object({
  xmin: joi.number().required(),
  xmax: joi.number().required(),
  ymin: joi.number().required(),
  ymax: joi.number().required(),
  spatialReference: spatialReferenceSchema.optional(),
});

const quantizationParametersSchema = joi.object({
  originPosition: joi.string().optional(),
  tolerance: joi.number().optional(),
  extent: esriExtentSchema.optional(),
  mode: joi.string().optional(),
});

const spatialRelSchema = joi
  .string()
  .valid(
    'esriSpatialRelContains',
    'esriSpatialRelWithin',
    'esriSpatialRelIntersects',
    'esriSpatialRelEnvelopeIntersects',
  );

const queryRequestSchema = sharedQueryParamSchema
  .append({
    quantizationParameters: quantizationParametersSchema,
    f: formatSchema,
    spatialRel: spatialRelSchema,
  })
  .unknown();

function validateQueryRequestParams(queryRequestParams) {
  const { error } = queryRequestSchema.validate(queryRequestParams);

  if (error) {
    handleError(error);
  }
}

function handleError(error) {
  const [param] = error.details[0].path;
  const code = 400;
  const details = [error.details[0].message];
  let message = error.details[0].message;

  if (param === 'quantizationParameters') {
    message = "'quantizationParameters' parameter is invalid";
  }

  if (param === 'f') {
    message = 'Invalid format';
  }

  if (param === 'spatialRel') {
    message = `'spatialRel' parameter is invalid`;
  }
  throw makeError({
    message,
    code,
    details,
  });
}

module.exports = {
  validateQueryRequestParams,
};

function makeError(params) {
  const { message, details, code } = params;
  const err = new Error(message);
  err.code = code;
  err.details = details;
  return err;
}
