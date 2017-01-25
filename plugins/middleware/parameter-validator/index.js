'use strict';

KlarkModule(module, 'krkMiddlewareParameterValidator', function($q, $_, krkParameterValidator) {

  var defaultPagination = {
    page: 1,
    count: 50
  };

  return {
    crud: {
      retrieve: crudRetrieveValidator,
      retrieveAll: crudRetrieveAllValidator,
      create: crudCreateValidator,
      update: crudUpdateValidator,
      delete: crudDeleteValidator
    },
    paginationValidator,
    modelValidator
  };

  function crudRetrieveValidator() {
    return idValidator;
  }

  function crudRetrieveAllValidator(model) {
    return function(req, res, next) {
      var params = paginationValidator(req);
      krkParameterValidator.checkForErrors(params, req, res, function(hasError) {
        if (hasError) {
          return next(hasError);
        }

        checkPossibleModelQueryParameters(model, req, res)
          .then(function() {
            next();
          })
          .catch(function(reason) {
            res.locals.errors.add('INVALID_PARAMS', reason);
            next(true);
          })
      });
    }
  }

  function checkPossibleModelQueryParameters(model, req, res) {
    var pathnames = [];
    model.schema.eachPath(function(pathname) {
      if (pathname.indexOf('.') === -1 && req.query[pathname]) {
        pathnames.push(pathname);
      }
    });

    var filters = {};
    var partialValidations = $_.map(pathnames, function(pathname) {
      return {
        path: pathname,
        value: req.query[pathname],
        onValidate: function(v) { return filters[pathname] = v; }
      };
    });
    res.locals.params.filters = filters;

    return krkParameterValidator.modelPartialValidator(model, partialValidations);
  }

  function crudCreateValidator(model) {
    return function(req, res, next) {
      return modelValidator(model, req, res, next);
    };
  }

  function crudUpdateValidator(model) {
    return function(req, res, next) {
      modelValidator(model, req, res, function(error) {
        if (error) {
          return next(true);
        }
        return idValidator(req, res, next);
      });
    };
  }

  function crudDeleteValidator() {
    return idValidator;
  }

  function idValidator(req, res, next) {
    res.locals.params.id = krkParameterValidator.validations.paramId(req);
    krkParameterValidator.checkForErrors(res.locals.params, req, res, next);
  }

  function modelValidator(model, req, res, next) {
    var recordParam = req.body[model.modelName];
    var record = new model(recordParam);
    record.validate(krkParameterValidator.checkForMongoValidationErrors(req, res, next, function() {
      res.locals.params[model.modelName] = recordParam;
      next();
    }));
  }

  function paginationValidator(req) {
    var validators = krkParameterValidator.partialValidations(req);
    var pagination = $_.defaults({
      page: validators.queryPage(),
      count: validators.queryCount(),
      sortBy: validators.querySortBy(),
      asc: validators.queryAsc()
    }, defaultPagination);

    var params = {
      pagination
    };

    return params;
  }

});