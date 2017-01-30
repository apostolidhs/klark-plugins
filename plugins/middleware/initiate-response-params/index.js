'use strict';

KlarkModule(module, 'krkMiddlewareInitiateResponseParams', function(_, krkLogger, krkErrors) {

  return function (config) {
    if (!(config.name && config.version)) {
      throw new Error('Invalid arguments');
    }
    return function(req, res, next) {
      if (!_.isObject(req) || !_.isObject(res) || !_.isFunction(next)) {
        krkLogger.error('krkMiddlewareInitiateResponseParams should be called as a middleware function');
      }

      res.locals.errors = krkErrors.build();
      res.locals.data = undefined;
      res.locals.params = {};
      res.locals.meta = {
        name: config.name,
        version: config.version,
        process: _.now()
      };

      next();
    }
  }
});
