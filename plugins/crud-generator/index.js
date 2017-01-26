'use strict';

KlarkModule(module, 'krkCrudGenerator', function(
  $_,
  krkMiddlewareParameterValidator,
  krkMiddlewarePermissions,
  krkMiddlewareCrudController,
  krkMiddlewareResponse,
  krkCrudGeneratorUrls
) {

  return {
    create: create,
    createSingle: createSingle
  };

  function create(app, customOpts) {
    var opts = $_.defaultsDeep(customOpts, getDefaultOptions());
    var model = opts.model;
    if (!model || !opts.apiUrlPrefix) {
      throw new Error('invalid arguments');
    }
    var crudUrls = krkCrudGeneratorUrls(opts.apiUrlPrefix);

    app.get(crudUrls.retrieve(model.modelName), [
      krkMiddlewarePermissions.check(opts.retrieve.permissions),
      krkMiddlewareParameterValidator.crud.retrieve(),
      krkMiddlewareCrudController.retrieve(model),
      krkMiddlewareResponse.success,
      krkMiddlewareResponse.fail
    ]);

    app.get(crudUrls.retrieveAll(model.modelName), [
      krkMiddlewarePermissions.check(opts.retrieveAll.permissions),
      krkMiddlewareParameterValidator.crud.retrieveAll(model),
      krkMiddlewareCrudController.retrieveAll(model),
      krkMiddlewareResponse.success,
      krkMiddlewareResponse.fail
    ]);

    app.post(crudUrls.create(model.modelName), [
      krkMiddlewarePermissions.check(opts.create.permissions),
      krkMiddlewareParameterValidator.crud.create(model),
      krkMiddlewareCrudController.create(model),
      krkMiddlewareResponse.success,
      krkMiddlewareResponse.fail
    ]);

    app.put(crudUrls.update(model.modelName), [
      krkMiddlewarePermissions.check(opts.update.permissions),
      krkMiddlewareParameterValidator.crud.update(model),
      krkMiddlewareCrudController.update(model),
      krkMiddlewareResponse.success,
      krkMiddlewareResponse.fail
    ]);

    app.delete(crudUrls.delete(model.modelName), [
      krkMiddlewarePermissions.check(opts.delete.permissions),
      krkMiddlewareParameterValidator.crud.delete(model),
      krkMiddlewareCrudController.delete(model),
      krkMiddlewareResponse.success,
      krkMiddlewareResponse.fail
    ]);
  }

  function createSingle(app, customOpts) {
    if (!customOpts.apiUrlPrefix) {
      throw new Error('invalid arguments');
    }
    var crudUrls = krkCrudGeneratorUrls(customOpts.apiUrlPrefix);
    var opts = $_.defaultsDeep(customOpts, getDefaultOptions());
    var model = opts.model;
    if (!model) {
      throw new Error('invalid model argument');
    }

    app.get(crudUrls.urlWithoutId(model.modelName), [
      krkMiddlewarePermissions.check(opts.retrieve.permissions),
      // there is nothing to validate :)
      krkMiddlewareCrudController.singleRetrieve(model),
      krkMiddlewareResponse.success,
      krkMiddlewareResponse.fail
    ]);

    app.put(crudUrls.urlWithoutId(model.modelName), [
      krkMiddlewarePermissions.check(opts.retrieve.permissions),
      function(req, res, next) {
        return krkMiddlewareParameterValidator.modelValidator(model, req, res, next);
      },
      krkMiddlewareCrudController.singleUpdate(model),
      krkMiddlewareResponse.success,
      krkMiddlewareResponse.fail
    ]);
  }

  function getDefaultOptions() {
    return {
      retrieveAll: {
        permissions: 'ADMIN'
      },
      retrieve: {
        permissions: 'ADMIN'
      },
      create: {
        permissions: 'ADMIN'
      },
      update: {
        permissions: 'ADMIN'
      },
      delete: {
        permissions: 'ADMIN'
      }
    };
  }

});