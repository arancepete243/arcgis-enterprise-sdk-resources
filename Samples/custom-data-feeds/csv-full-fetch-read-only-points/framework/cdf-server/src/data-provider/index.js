const Joi = require('joi');
const extendRouteController = require('./extend-controller');
const extendModel = require('./extend-model');
const ProviderRoute = require('./provider-route');

const providerOptionsSchema = Joi.object({
  cache: Joi.object()
    .keys({
      retrieve: Joi.function().arity(3).required(),
      insert: Joi.function().arity(3).required(),
    })
    .unknown(true)
    .optional(),
  routePrefix: Joi.string().optional(),
  before: Joi.function().optional(),
  after: Joi.function().optional(),
  name: Joi.string().optional(),
  defaultToOutputRoutes: Joi.boolean().optional(),
}).unknown(true);

module.exports = class DataProvider {
  #options;
  #providerController;
  #definedProviderRoutes;
  #outputPluginControllers;
  #urlSafeNamespace;
  #logger;

  constructor(params) {
    const {
      logger,
      cache,
      authModule,
      pluginDefinition,
      outputPlugins = [],
      options = {},
    } = params;

    this.namespace = getProviderName(pluginDefinition, options);
    this.#validateOptions(options);
    this.defaultToOutputRoutes = options.defaultToOutputRoutes || false;

    this.#options = options;

    this.version = pluginDefinition.version || pluginDefinition?.status?.version || 'unknown';

    this.#urlSafeNamespace = this.namespace.replace(/\s/g, '-').toLowerCase();

    const model = extendModel(
      {
        ProviderModel: pluginDefinition.Model,
        namespace: this.namespace,
        logger,
        cache,
        authModule,
      },
      options,
    );

    this.#definedProviderRoutes = pluginDefinition.routes || [];

    this.#outputPluginControllers = outputPlugins.map(({ outputClass, options }) => {
      return extendRouteController(model, outputClass, options);
    });

    this.#providerController = extendRouteController(model, pluginDefinition.Controller);

    this.#logger = logger;
    this.#createOutputRoutes();
    this.#createProviderRoutes();
  }

  addRoutesToServer(server, middleware = []) {
    if (this.defaultToOutputRoutes) {
      this.#addOutputRoutes(server, middleware);
      this.#addProviderRoutes(server, middleware);
      return;
    }

    this.#addProviderRoutes(server, middleware);
    this.#addOutputRoutes(server, middleware);
  }

  #createOutputRoutes() {
    this.outputPluginRoutes = this.#outputPluginControllers.map((controller) => {
      const routes = controller.routes.map((route) => {
        const { handler, path, methods } = route;

        const compositeRoute = new ProviderRoute({
          controller,
          handler,
          path,
          methods,
          providerNamespace: this.#urlSafeNamespace,
          outputNamespace: controller.namespace,
          routePrefix: this.#options.routePrefix,
          absolutePath: this.#options.absolutePath,
        });
        return compositeRoute;
      });

      return {
        namespace: controller.namespace,
        routes,
      };
    });
  }

  #createProviderRoutes() {
    this.providerRoutes = this.#definedProviderRoutes.map((route) => {
      const { handler, path, methods } = route;
      const registeredRoute = new ProviderRoute({
        controller: this.#providerController,
        handler,
        path,
        methods,
        providerNamespace: this.#urlSafeNamespace,
        routePrefix: this.#options.routePrefix,
        absolutePath: true,
      });
      return registeredRoute;
    });
  }

  #addOutputRoutes(server, middleware) {
    this.outputPluginRoutes.forEach((output) => {
      const { namespace: outputNamespace, routes } = output;
      this.#logger.debug(`"${outputNamespace}" routes for the "${this.namespace}" provider:`);
      this.#addRouteCollection(server, routes, middleware);
    });
  }

  #addProviderRoutes(server, middleware) {
    if (this.providerRoutes.length > 0) {
      this.#logger.debug(`[${this.namespace}] defined routes:`);
    }

    this.#addRouteCollection(server, this.providerRoutes, middleware);
  }

  #addRouteCollection(server, routes, middleware) {
    return routes.forEach((route) => {
      const { methods, path, handler } = route;
      methods.forEach((method) => {
        try {
          server[method.toLowerCase()](path, [...middleware, handler]);
        } catch (err) {
          console.log(err);
        }
      });

      const routeLabel = path
        .toString()
        .replace(/\/\\/g, '')
        .replace(/\\\//g, '/')
        .replace('(?<layer>[0-9]+)', ':layer')
        .replace('($|/$|\\?)/i', '')
        .replace(/\/i$/, '');
      this.#logger.debug(`ROUTE | [${methods.join(', ').toUpperCase()}] | ${routeLabel}`);
    });
  }

  #validateOptions(params) {
    const result = providerOptionsSchema.validate(params);
    if (result.error) {
      throw new Error(
        `Provider "${this.namespace}" has invalid option: ${result.error.details[0].message}`,
      );
    }
  }
};

function getProviderName(provider, options) {
  return (
    options?.name ||
    provider.namespace ||
    provider.pluginName ||
    provider.plugin_name ||
    provider.name
  );
}
