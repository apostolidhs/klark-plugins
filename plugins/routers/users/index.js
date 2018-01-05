'use strict';

KlarkModule(module, 'krkRoutesUsers', function(
  $crypto,
  q,
  _,
  krkModelsUser,
  krkRoutersAuthorizeVerifyAccountEmailTmpl,
  krkParameterValidator,
  krkCrudGenerator,
  krkMiddlewareParameterValidator,
  krkMiddlewareResponse,
  krkMiddlewareCrudController,
  krkMiddlewarePermissions
) {

  return {
    register: register
  };

  function register(app, config) {
    if (!(app
      && config
      && config.apiUrl
      && config.apiUrlPrefix
      && config.emailSmtp
      && config.emailAddress
    )) {
      throw new Error('Invalid arguments');
    }

    config.verifyAccountEmailTmpl = config.verifyAccountEmailTmpl || getDefaultVerificationEmail;

    const crudOpts = {
      model: krkModelsUser,
      apiUrlPrefix: config.apiUrlPrefix,
      retrieve: safetyReturnUser(middlewareSingleSafetyController),
      retrieveAll: safetyReturnUser(middlewareRetrieveAllSafetyController),
      create: safetyReturnUser(middlewareSingleSafetyController),
      update: safetyReturnUser(middlewareSingleSafetyController),
      delete: safetyReturnUser(middlewareSingleSafetyController)
    };
    krkCrudGenerator.create(app, crudOpts);

    app.patch('/' + config.apiUrlPrefix + '/user/:id', [
      krkMiddlewarePermissions.check('USER', {onlyOwner: true}),
      middlewareUpdateParameterValidator,
      middlewareUpdateController,
      krkMiddlewareResponse.success
    ]);

    function middlewareUpdateParameterValidator(req, res, next) {
      var possibleValues = [
        'email',
        'newPassword',
        'oldPassword',
        'role'
      ];
      var promiseOfValidations = _.chain(possibleValues)
        .filter(function(name) {
          return req.body[name];
        })
        .map(function(name) {
          return krkParameterValidator.modelPartialValidator(krkModelsUser, [{
            path: name === 'newPassword' || name === 'oldPassword' ? 'password' : name,
            value: req.body[name],
            onValidate: function(v) { return res.locals.params[name] = v; }
          }]).then(function() {
            return name;
          })
        })
        .value();

      q.allSettled(promiseOfValidations)
      .then(function(validationsResults) {
        var validations = _.groupBy(validationsResults, function(validationsResult) {
          return validationsResult.state === 'fulfilled' ? 'fulfilled' : 'error';
        });
        if (!_.isEmpty(validations.error)) {
          _.each(validations.error, function(invalid) {
            return res.locals.errors.add('INVALID_PARAMS', invalid.reason);
          });
          return next(true);
        }

        res.locals.params.fulfilledData = validations.fulfilled;

        res.locals.params.id = krkParameterValidator.validations.paramId(req);
        krkParameterValidator.checkForErrors(res.locals.params, req, res, next);
      });
    }

    function middlewareRetrieveAllSafetyController(req, res, next) {
      res.locals.data.content = _.map(res.locals.data.content, function(user) {
        return user.getSafely();
      });
      next();
    }

    function middlewareSingleSafetyController(req, res, next) {
      if (res.locals.data) {
        res.locals.data = res.locals.data.getSafely();
      }
      next();
    }

    function safetyReturnUser(middlewareCtrl) {
      return {
        onMiddlewareGenerated: function(middlewares) {
          middlewares.splice(3, 0, middlewareCtrl);
          return middlewares;
        }
      }
    }

    function middlewareUpdateController(req, res, next) {
      var fulfilled = res.locals.params.fulfilledData;

      krkModelsUser.findOne({_id: res.locals.params.id})
      .catch(function(reason) {
        res.locals.errors.add('DB_ERROR', reason);
        next(true);
      })
      .then(function(user) {
        var jobPromises = [];

        if (_.find(fulfilled, function(v) { return v.value === 'newPassword'; })) {
          jobPromises.push(checkPassword(res, user));
        }

        if (_.find(fulfilled, function(v) { return v.value === 'email'; })) {
          jobPromises.push(checkEmail(res, user));
        }

        if (_.find(fulfilled, function(v) { return v.value === 'role'; })) {
          if (res.locals.user.role !== 'ADMIN') {
            res.locals.errors.add('INVALID_PARAMS', 'Not admin user');
            return next(true);
          }
          user.role = res.locals.params.role;
        }

        q.all(jobPromises)
          .then(function() {
            if(res.locals.errors.isEmpty()) {
              return user.save()
                .then(function() { return res.locals.data = user.getSafely(); })
                .then(function() { return next(); })
                .catch(function(reason) {
                  res.locals.errors.add('DB_ERROR', reason);
                  next(true)
                })
            } else {
              return next(true);
            }
          })
          .catch(function(reason) {
            res.locals.errors.add('UNEXPECTED', reason);
            next(true);
          });
      });
    }

    function checkEmail(res, user) {
      return q.promisify(function(cb) {
            return $crypto.randomBytes(32, cb);
          })
          .catch(function(reason) {
            return res.locals.errors.add('NOT_ENOUGH_ENTROPY', reason);
          })
        .then(function(validationToken) {
            return krkModelsUser.invalidateAccount(user._id, validationToken.toString('hex'));
          })
          .catch(function(reason) {
            return res.locals.errors.add('DB_ERROR', reason.errors || reason);
          })
        .then(function(updatedUser) {
          updatedUser.email = res.locals.params.email;
          return updatedUser.sendVerificationEmail({
            apiUrl: config.apiUrl,
            apiUrlPrefix: config.apiUrlPrefix,
            verifyAccountEmailTmpl: config.verifyAccountEmailTmpl,
            emailSmtp: config.emailSmtp,
            emailName: config.emailName,
            emailAddress: config.emailAddress
          })
            .catch(function(reason) {
              return res.locals.errors.add('EMAIL_FAIL', reason.errors || reason);
            })
            .then(function() {
              return user.email = res.locals.params.email;
            });
        });
    }

    function checkPassword(res, user) {
      if (res.locals.user.role === 'ADMIN') {
        user.password = res.locals.params.newPassword;
        return q.when();
      }
      if (!res.locals.params.oldPassword) {
        res.locals.errors.add('INVALID_PARAMS', 'invalid-password')
        return q.when();
      }

      return user.comparePassword(res.locals.params.oldPassword)
      .then(function() {
        return user.password = res.locals.params.newPassword;
      })
      .catch(function(reason) {
        res.locals.errors.add('INVALID_PARAMS', 'invalid-password');
      });
    }

    function getDefaultVerificationEmail(opts) {
      return krkRoutersAuthorizeVerifyAccountEmailTmpl.template({
        verifyUrl: opts.verifyUrl,
        user: opts.user,
        apiUrl: opts.apiUrl
      });
    }
  }
});
