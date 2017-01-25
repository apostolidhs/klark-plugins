'use strict';

KlarkModule(module, 'krkRoutesServerInfo', function(krkMiddlewareResponse) {

  return {
    register: register
  };

  function register(app, config) {
    if (!(app && config && config.apiVersion)) {
      throw new Error('Invalid arguments');
    }
    app.get('/info', [
      serverInfoRouter,
      krkMiddlewareResponse.success
    ]);
  }

  function serverInfoRouter(req, res, next) {
    var info = {
      'currentVersion': config.apiVersion
    };
    res.locals.data = info;

    next();
  }
});
