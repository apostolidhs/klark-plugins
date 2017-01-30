'use strict';

KlarkModule(module, 'krkParameterValidator', (q, _, $expressValidator) => {

  return {
    validations: getValidations(),
    partialValidations: getValidations,
    checkForErrors: checkForErrors,
    checkForMongoValidationErrors: checkForMongoValidationErrors,
    modelPartialValidator: modelPartialValidator
  };

  function getValidations(rootReq) {
    return {
      paramUrlQuery: function(req) {
        req = rootReq || req;
        req.checkQuery('q').isURL();
        return req.sanitizeQuery('q').toString();
      },
      paramId: function(req) {
        req = rootReq || req;
        req.checkParams('id').isMongoId();
        return req.sanitizeParams('id').toString();
      },

      queryPage: function(req) {
        req = rootReq || req;
        req.checkQuery('page').optional().isInt({min: 0});
        return req.sanitizeQuery('page').toInt();
      },
      queryCount: function(req) {
        req = rootReq || req;
        req.checkQuery('count').optional().isInt({min: 1});
        return req.sanitizeQuery('count').toInt();
      },
      querySortBy: function(req) {
        req = rootReq || req;
        req.checkQuery('sortBy').optional().isAlpha();
        return req.sanitizeQuery('sortBy').toString();
      },
      queryAsc: function(req) {
        req = rootReq || req;
        return _.has(req.query, 'asc') && req.query.asc !== 'false';
      }
    };
  }

  function checkForErrors(params, req, res, next) {
    var errors = req.validationErrors();
    if (errors) {
      res.locals.errors.add('INVALID_PARAMS', errors);
      return next(true);
    }

    res.locals.params = params;
    next();
  }

  function checkForMongoValidationErrors(req, res, onFail, onSuccess) {
      return function(err) {
        if (err) {
          res.locals.errors.add('INVALID_PARAMS', err && err.errors || err);
          return onFail(true);
        } else {
          return onSuccess();
        }
      }
  }

  // {path: 'v', value: v, isValid: v => v = v},
  function modelPartialValidator(model, opts) {
    var errors = _.chain(opts)
      .map(function(opt) {
        var path = model.schema.path(opt.path);

        if (_.isEmpty(opt.value) && !path.isRequired) {
          return;
        }

        var isInvalid = _.find(path.validators, function(validatorModel) {
          return !validatorModel.validator(opt.value);
        });

        if (isInvalid) {
          return isInvalid.message.replace('{PATH}', opt.path);
        } else {
          opt.onValidate(path.cast(opt.value));
        }
      })
      .compact()
      .value();

    if (_.isEmpty(errors)) {
      return q.when(true);
    } else {
      return q.reject(errors);
    }
  }

});
