const _ = require('lodash');
const {
  serverInfo,
  layerInfo,
  layersInfo,
  query,
  transformApplyEditsInput,
  setLogger,
  setDefaults,
  // generateRenderer,
  validateLayerApplyEdits,
  validateServerApplyEdits,
} = require('../../featureserver');
const Logger = require('../../logger');
let logger = new Logger();
const ARCGIS_UNAUTHORIZED_MESSAGE = 'Item does not exist or is inaccessible.';

const authorizationError = {
  error: {
    code: 400,
    messageCode: 'CONT_0001',
    message: ARCGIS_UNAUTHORIZED_MESSAGE,
    details: [],
  },
};

class GeoServices {
  #logger;

  static type = 'output';
  static version = require('../package.json').version;
  static routes = [
    {
      path: 'rest/services/FeatureServer($|/$|\\?)',
      methods: ['get', 'post'],
      handler: 'serviceInfoHandler',
    },
    {
      path: 'rest/services/FeatureServer/applyEdits',
      methods: ['post'],
      handler: 'serviceApplyEditsHandler',
    },
    {
      path: 'rest/services/FeatureServer/layers($|/$|\\?)',
      methods: ['get', 'post'],
      handler: 'layersInfoHandler',
    },
    {
      path: 'rest/services/FeatureServer/(?<layer>[0-9]+)($|/$|\\?)',
      methods: ['get', 'post'],
      handler: 'layerInfoHandler',
    },
    {
      path: 'rest/services/FeatureServer/(?<layer>[0-9]+)/info',
      methods: ['get', 'post'],
      handler: 'layerInfoHandler',
    },
    {
      path: 'rest/services/FeatureServer/(?<layer>[0-9]+)/query',
      methods: ['get', 'post'],
      handler: 'queryHandler',
    },
    {
      path: 'rest/services/FeatureServer/(?<layer>[0-9]+)/applyEdits',
      methods: ['post'],
      handler: 'layerApplyEditsHandler',
    },
    // {

    //   path: '$namespace/rest/services/FeatureServer/:layer([0-9]+)/generateRenderer',
    //   methods: ['get', 'post'],
    //   handler: 'generateRendererHandler',
    // },
    {
      path: 'rest/services/FeatureServer/*',
      methods: ['get', 'post'],
      handler: 'notFoundHandler',
    },
  ];

  constructor(model, options = {}) {
    this.model = model;
    this.#logger = options.logger || logger;

    setLogger({ logger: this.#logger });

    // Set overrides
    setDefaults(options.defaults);
  }

  #errorHandler(error, res) {
    const { code, message, stack, details = [] } = normalizeError(error);

    res.status(200); // ArcGIS standard is to wrap errors in 200 success

    if (isUnauthorizedError(code, message)) {
      return res.json(authorizationError);
    }

    this.#logger.error(error);

    const errorPayload = {
      code: code || 500,
      message,
      details: details.map(this.#detailsHandler.bind(this)),
    };

    if (stack && this.#logger.level === 'silly') {
      errorPayload.stack = stack;
    }

    return res.json({
      error: errorPayload,
    });
  }

  #detailsHandler(detail) {
    if (detail instanceof Error) {
      const err = {
        message: detail.message,
      };
      if (this.#logger.level === 'silly') {
        err.stack = detail.stack;
      }
      return err;
    }
    return detail;
  }

  async #pullHandler(req, res, handler) {
    const { query, body, params, headers, _user } = req;
    const requestData = { ...query, ...body };
    const modelParam = { query: requestData, body, params, headers, _user };
    try {
      const data = await this.model.pull(modelParam);
      return handler(modelParam, res, data);
    } catch (error) {
      this.#errorHandler(error, res);
    }
  }

  async serviceInfoHandler(req, res) {
    this.#pullHandler(req, res, serverInfo);
  }

  async layersInfoHandler(req, res) {
    this.#pullHandler(req, res, layersInfo);
  }

  async layerInfoHandler(req, res) {
    this.#pullHandler(req, res, layerInfo);
  }

  async queryHandler(req, res) {
    this.#pullHandler(req, res, query);
  }

  // async generateRendererHandler(req, res) {
  //   this.#pullHandler(req, res, generateRenderer);
  // }

  async layerApplyEditsHandler(req, res) {
    try {
      const body = recursiveTryParse(req.body);
      const result = await this.#handleLayerEdit(req, body);
      res.status(200).json(result);
    } catch (error) {
      return this.#errorHandler(error, res);
    }
  }

  async serviceApplyEditsHandler(req, res) {
    try {
      const body = recursiveTryParse(req.body);
      validateServerApplyEdits(body);
      const result = await this.#batchLayerEdit(req, body.edits);
      res.status(200).json(result);
    } catch (error) {
      return this.#errorHandler(error, res);
    }
  }

  async #batchLayerEdit(req, data) {
    const promises = data.map((layerEditData) => {
      const { id, ...rest } = layerEditData;
      const reqClone = _.chain(req).cloneDeep().set('params.layer', id).value();
      const promise = this.#handleLayerEdit(reqClone, rest);
      return promise;
    });

    const results = await Promise.allSettled(promises);

    const rejected = results.find(({ status }) => status === 'rejected');

    if (rejected) {
      throw rejected.reason;
    }

    return results.map(({ value }, index) => {
      return { id: data[index]?.id, ...value };
    });
  }

  async #handleLayerEdit(req, data) {
    const metadata = await this.model.pullMetadata(req);
    validateLayerApplyEdits(data, metadata);
    // transform - to geoJSON and re-project to native
    const editData = transformApplyEditsInput(data, metadata);

    return this.model.edit(req, editData);
  }

  notFoundHandler(req, res) {
    res.status(200); // ArcGIS standard is to wrap errors in 200 success

    return res.json({
      error: {
        code: 400,
        message: 'This operation is not supported.',
        details: ['This operation is not supported.'],
      },
    });
  }
}

function isUnauthorizedError(code, message) {
  return code === 403 || message === ARCGIS_UNAUTHORIZED_MESSAGE;
}

function normalizeError(error) {
  if (error.error) {
    return error.error;
  }

  return error;
}

function recursiveTryParse(value) {
  if (Array.isArray(value)) {
    return value.map(recursiveTryParse);
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => {
        return [key, recursiveTryParse(val)];
      }),
    );
  }
  return tryJsonParse(value);
}

function tryJsonParse(value) {
  try {
    return JSON.parse(value);
    // eslint-disable-next-line
  } catch (e) {
    return value;
  }
}

module.exports = GeoServices;
