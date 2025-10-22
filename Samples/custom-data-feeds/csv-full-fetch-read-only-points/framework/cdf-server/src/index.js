const Events = require('events');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const compression = require('compression');
const Cache = require('../../cache-memory');
const createLogger = require('../../logger');
const pkg = require('../package.json');
const DataProvider = require('./data-provider');
const geoservices = require('../../output-geoservices');

class Cdf extends Events {
  #middleware;

  constructor(options = {}) {
    super();
    this.version = pkg.version;
    this.#middleware = options.middleware || [];

    this.server = initServer(options);
    this.log = options.logger || createLogger(options);

    // default to in-memory cache; another cache registration overrides this
    this.#registerCache(Cache, { size: options.cacheSize });
    this.providers = [];
    this.pluginRoutes = [];
    this.outputs = [];

    const { geoservicesDefaults } = options;

    this.register(geoservices, {
      logger: this.log,
      defaults: geoservicesDefaults,
    });

    this.server
      .on('mount', () => {
        this.log.info(`CDF ${this.version} mounted at ${this.server.mountpath}`);
      })
      .get('/status', (req, res) =>
        res.json({
          success: true,
        }),
      );
  }

  register(plugin, options) {
    if (!plugin) {
      throw new Error('Plugin registration failed: plugin undefined');
    }

    if (plugin.type === 'provider') {
      return this.#registerProvider(plugin, options);
    }

    if (plugin.type === 'cache') {
      return this.#registerCache(plugin, options);
    }

    if (plugin.type === 'output') {
      return this.#registerOutput(plugin, options);
    }

    this.log.warn('Unrecognized plugin type: "' + plugin.type + '". Defaulting to provider.');
    return this.#registerProvider(plugin, options);
  }

  #registerProvider(pluginDefinition, options) {
    const dataProvider = new DataProvider({
      logger: this.log,
      cache: this.cache,
      pluginDefinition,
      outputPlugins: this.outputs,
      options,
    });
    dataProvider.addRoutesToServer(this.server, [extractServiceParams, ...this.#middleware]);
    this.providers.push(dataProvider);
    this.log.info(`registered provider: ${dataProvider.namespace} v${dataProvider.version}`);
  }

  #registerOutput(outputClass, options) {
    this.outputs.push({ outputClass, options });
    this.log.debug(`registered output: ${outputClass.name} v${outputClass.version}`);
  }

  #registerCache(Cache, options) {
    this.cache = new Cache({ logger: options?.logger || this.log, options });
    this.log.debug(`registered cache: ${Cache.name} v${Cache.version}`);
  }
}

/**
 * express middleware setup
 */
function initServer(options) {
  const app = express()
    // parse application/json
    .use(bodyParser.json({ limit: options.bodyParserLimit || '10000kb' }))
    // parse application/x-www-form-urlencoded
    .use(bodyParser.urlencoded({ extended: false }))
    .disable('x-powered-by')
    // for demos and preview maps in providers
    .set('view engine', 'ejs')
    .use(express.static(path.join(__dirname, '/public')));

  // Use CORS unless explicitly disabled in the config
  if (options.disableCors !== true) {
    app.use(cors());
  }

  // Use compression unless explicitly disable in the config
  if (options.disableCompression !== true) {
    app.use(compression());
  }

  return app;
}

function extractServiceParams(req, res, next) {
  if (req.headers['x-esri-cdf-service-params']) {
    const serviceParams = JSON.parse(req.headers['x-esri-cdf-service-params']);

    Object.entries(serviceParams).forEach(([key, value]) => {
      req.params[key] = value;
    });
  }

  next();
}
module.exports = Cdf;
