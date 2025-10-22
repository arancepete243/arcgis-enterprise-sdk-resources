const { promisify } = require('util');
const hasher = require('@sindresorhus/fnv1a');

module.exports = function extendModel({ ProviderModel, namespace, logger, cache }, options = {}) {
  class Model extends ProviderModel {
    #cacheRetrieve;
    #cacheInsert;
    #getData;
    #editData;
    #getMetadata;

    constructor({ logger, cache }, options) {
      super({ logger, log: logger }, options);
      this.namespace = namespace;
      this.logger = logger;
      this.#cacheRetrieve = this.#normalizeAndBindMethod(cache.retrieve, 3, cache);
      this.#cacheInsert = this.#normalizeAndBindMethod(cache.insert, 4, cache);
      this.#getData = this.#normalizeAndBindMethod(this.getData, 2);
      this.#getMetadata = this.getMetadata
        ? this.#normalizeAndBindMethod(this.getMetadata, 2, this)
        : async (req) => {
            req.query.resultRecordCount = 1;
            const { metadata = {} } = await this.#getData(req);
            return metadata;
          };

      if (this.editData) {
        this.#editData = this.#normalizeAndBindMethod(this.editData, 3, this);
        this.edit = async (req, editData) => {
          await this.authorizeRequest(req);
          return this.#editData(req, editData);
        };
      }
    }

    #normalizeAndBindMethod(func, callbackArgumentIndex, context = this) {
      return func?.length === callbackArgumentIndex
        ? promisify(func).bind(context)
        : func.bind(context);
    }

    async pull(req) {
      if (req._skipAuth !== true) {
        await this.authorizeRequest(req);
      }
      return this.#pull(req);
    }

    async #pull(req) {
      const key = this.#createCacheKey(req);

      try {
        const cached = await this.#cacheRetrieve(key, {});
        if (cached) {
          this.logger.debug('fetched data from cache');
          return cached;
        }
      } catch (err) {
        this.logger.debug(err);
      }

      const providerGeojson = await this.#getData(req);
      const { ttl } = providerGeojson;
      if (ttl) {
        this.#cacheInsert(key, providerGeojson, { ttl });
      }

      return providerGeojson;
    }

    async pullMetadata(req) {
      return this.#getMetadata(req);
    }

    #createCacheKey(req) {
      const providerKeyGenerator = this.createCacheKey || this.createKey;
      if (providerKeyGenerator) {
        return providerKeyGenerator(req);
      }
      const url = new URL(req.url, `http://${req.headers.host}`);
      const base = url.origin + url.pathname;
      const params = Object.assign({}, req.query, req.body);

      return hasher
        .bigInt(`${base}::${JSON.stringify(params)}`, {
          size: 128,
        })
        .toString();
    }

    async authorizeRequest(req, data = {}) {
      try {
        await this.authorize(req, data);
      } catch (error) {
        error.code = error.code || 401;
        throw error;
      }
      return;
    }
  }

  // If provider has auth methods use them, otherwise dummy methods
  if (typeof ProviderModel.prototype.authorize !== 'function') {
    Model.prototype.authorize = async () => {
      return;
    };
  }

  return new Model({ logger, cache }, options);
};
