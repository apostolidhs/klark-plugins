'use strict';

KlarkModule(module, 'routesUsers', function(
  $crypto,
  $q,
  $_,
  krkModelsUser,
  krkRoutersAuthorizeVerifyAccountEmailTmpl,
  krkParameterValidator,
  krkNotificationsEmail,
  krkMiddlewareResponse,
  krkMiddlewareCrudController,
  krkMiddlewarePermissions
) {

  return {
    register: register
  };

  function register(app) {
    if (!(app && config && config.apiUrlPrefix)) {
      throw new Error('Invalid arguments');
    }
    app.get('/' + config.apiUrlPrefix + '/user', [
      krkMiddlewarePermissions.check('ADMIN'),
      middlewarekrkParameterValidator.crud.retrieveAll(krkModelsUser),
      krkMiddlewareCrudController.retrieveAll(krkModelsUser),
      middlewareRetrieveAllSafetyController,
      krkMiddlewareResponse.success
    ]);

    app.delete('/' + config.apiUrlPrefix + '/user/:id', [
      krkMiddlewarePermissions.check('ADMIN'),
      middlewarekrkParameterValidator.crud.delete(),
      krkMiddlewareCrudController.delete(),
      krkMiddlewareResponse.success
    ]);

    app.patch('/' + config.apiUrlPrefix + '/user/:id', [
      krkMiddlewarePermissions.check('USER'),
      middlewareUpdateParameterValidator,
      middlewareUpdateController,
      krkMiddlewareResponse.success
    ]);
  }

  function middlewareUpdateParameterValidator(req, res, next) {
    var possibleValues = [
      'name',
      'email',
      'phone',
      'newPassword',
      'oldPassword',
      'role'
    ];
    var promiseOfValidations = $_.chain(possibleValues)
      .filter(function(name) {
        return req.body[name];
      })
      .map(function(name) {
        return krkParameterValidator.modelPartialValidator(krkModelsUser, [{
          path: name === 'newPassword' || name === 'oldPassword' ? 'password' : name,
          value: req.body[name],
          onValidate: function(v) { return res.locals.params[name] = v; }
        }])
      }.then(function() {
        return name;
      }))
      .value();

    $q.allSettled(promiseOfValidations)
    .then(function(validationsResults) {
      var validations = $_.groupBy(validationsResults, validationsResult => validationsResult.state === 'fulfilled' ? 'fulfilled' : 'error');
      if (!$_.isEmpty(validations.error)) {
        $_.each(validations.error, invalid => res.locals.errors.add('INVALID_PARAMS', invalid.reason));
        return next(true);
      }

      res.locals.params.fulfilledData = validations.fulfilled;

      res.locals.params.id = krkParameterValidator.validations.paramId(req);
      krkParameterValidator.checkForErrors(res.locals.params, req, res, next);
    });
  }

  function middlewareRetrieveAllSafetyController(req, res, next) {
    res.locals.data.content = $_.map(res.locals.data.content, c => c.getSafely());
    next();
  }

  function middlewareUpdateController(req, res, next) {
    var fulfilled = res.locals.params.fulfilledData;

    krkModelsUser.findOne({_id: res.locals.params.id})
    .catch(reason => {
      res.locals.errors.add('DB_ERROR', reason);
      next(true);
    })
    .then(user => {
      var jobPromises = [];

      if ($_.find(fulfilled, v => v.value === 'newPassword')) {
        jobPromises.push(checkPassword(res, user));
      }

      if ($_.find(fulfilled, v => v.value === 'email')) {
        jobPromises.push(checkEmail(res, user));
      }

      if ($_.find(fulfilled, v => v.value === 'name')) {
        user.name = res.locals.params.name;
      }

      if ($_.find(fulfilled, v => v.value === 'phone')) {
        user.phone = res.locals.params.phone;
      }

      if ($_.find(fulfilled, v => v.value === 'role')) {
        if (res.locals.user.role !== 'ADMIN') {
          res.locals.errors.add('INVALID_PARAMS', 'Not admin user');
          return next(true);
        }
        user.role = res.locals.params.role;
      }

      $q.all(jobPromises)
        .then(() => {
          if(res.locals.errors.isEmpty()) {
            return user.save()
              .then(() => res.locals.data = user.getSafely())
              .then(() => next())
              .catch(reason => {
                res.locals.errors.add('DB_ERROR', reason);
                next(true)
              })
          } else {
            return next(true);
          }
        })
        .catch(reason => {
          res.locals.errors.add('UNEXPECTED', reason);
          next(true);
        });
    });
  }

  function checkEmail(res, user) {
    return $q.promisify(cb => $crypto.randomBytes(32, cb))
        .catch(reason => res.locals.errors.add('NOT_ENOUGH_ENTROPY', reason))
      .then(validationToken => krkModelsUser.invalidateAccount(user._id, validationToken.toString('hex'))
        .catch(reason => res.locals.errors.add('DB_ERROR', reason.errors || reason)))
      .then(updatedUser => {
        var verifyAccountRoute = '/' + config.apiUrlPrefix + '/authorize/verifyAccount';
        var emailTemplate = krkRoutersAuthorizeVerifyAccountEmailTmpl.template(updatedUser, verifyAccountRoute);
        return krkNotificationsEmail.send(emailTemplate)
          .catch(reason => res.locals.errors.add('EMAIL_FAIL', reason.errors || reason))
          .then(() => user.email = res.locals.params.email);
      });
  }

  function checkPassword(res, user) {
    if (res.locals.user.role === 'admin') {
      user.password = res.locals.params.newPassword;
      return $q.when();
    }
    if (!res.locals.params.oldPassword) {
      res.locals.errors.add('INVALID_PARAMS', 'invalid-password')
      return $q.when();
    }

    return user.comparePassword(res.locals.params.oldPassword)
    .then(() => user.password = res.locals.params.newPassword)
    .catch(reason => res.locals.errors.add('INVALID_PARAMS', 'invalid-password'));
  }

});
