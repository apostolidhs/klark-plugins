'use strict';

KlarkModule(module, 'krkMiddlewareResponse', function($_) {

  var options;

  setOptions();

  return {
    success: success,
    fail: fail,
    setOptions: setOptions
  };

  function success(req, res, next) {
    if (res.locals.redirect) {
      return res.redirect(res.locals.redirect);
    }
    return response(res);
  }

  function fail(err, req, res, next) {
    if (err !== true) {
      let msg;
      if (options.showStackError === 'dev') {
        msg = {
          msg: err.message,
          stack: err.stack
        };
      }
      res.locals.errors.add('UNEXPECTED', msg);
      res.status(500);
    } else {
      var code = res.locals.errors.isUnauthorized() ? 401 : 400;
      res.status(code);
    }

    return response(res);
  }

  function response(res) {
    var meta = res.locals.meta;
    meta.process = $_.now() - meta.process;
    var errors = res.locals.errors;
    return res.json({
      meta,
      errors: errors.isEmpty() ? undefined : errors.commit(),
      data: res.locals.data
    });
  }

  function setOptions(customOptions) {
    options = $_.assignIn({
      showStackError: true
    }, customOptions);
  }
});
