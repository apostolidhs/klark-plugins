'use strict';

KlarkModule(module, 'krkRoutesAuthorize', function(
  _,
  q,
  $crypto,
  krkLogger,
  krkRoutersAuthorizeVerifyAccountEmailTmpl,
  krkNotificationsEmail,
  krkMiddlewareResponse,
  krkParameterValidator,
  krkMiddlewarePermissions,
  krkModelsUser
) {

  return {
    register: register
  };

  function register(app, config) {
    if (!(app
      && config
      && config.apiUrlPrefix
      && config.appUrl
      && config.apiUrl
      && config.EMAIL_SMTP
      && config.EMAIL_NAME
      && config.EMAIL_ADDRESS
      && config.name)) {
      throw new Error('Invalid arguments');
    }

    config.adminValidationOnSignup = config.adminValidationOnSignup || true;

    app.post('/' + config.apiUrlPrefix + '/authorize/signup', [
      krkMiddlewarePermissions.check('FREE'),
      middlewareSignupParameterValidator,
      middlewareSignUpController,
      krkMiddlewareResponse.success
    ]);

    app.post('/' + config.apiUrlPrefix + '/authorize/login', [
      krkMiddlewarePermissions.check('FREE'),
      middlewareLoginParameterValidator,
      middlewareLoginController,
      krkMiddlewareResponse.success
    ]);

    if (config.adminValidationOnSignup) {
      app.post('/' + config.apiUrlPrefix + '/authorize/verifyByAdmin/:id', [
        krkMiddlewarePermissions.check('ADMIN'),
        middlewareVerifyByAdminParameterValidator,
        middlewareVerifyByAdminController,
        krkMiddlewareResponse.success
      ]);
    }

    var verifyAccountRoute = '/' + config.apiUrlPrefix + '/authorize/verifyAccount';
    app.get(verifyAccountRoute, [
      krkMiddlewarePermissions.check('FREE'),
      middlewareVerifyAccountParameterValidator,
      middlewareVerifyAccountController,
      krkMiddlewareResponse.success
    ]);

    app.post('/' + config.apiUrlPrefix + '/authorize/refreshToken', [
      krkMiddlewarePermissions.check('USER'),
      middlewareRefreshTokenController,
      krkMiddlewareResponse.success
    ]);

    function middlewareVerifyAccountParameterValidator(req, res, next) {
      var validationOpts = [
        {path: 'validationToken', value: req.query.token, onValidate: v => res.locals.params.token = v}
      ];
      krkParameterValidator.modelPartialValidator(krkModelsUser, validationOpts)
        .then(function() { return next(); })
        .catch(function(reason) {
          res.locals.errors.add('INVALID_PARAMS', reason);
          next(true);
        });
    }


    function middlewareSignupParameterValidator(req, res, next) {
      var validationOpts = [
        {path: 'name', value: req.body.name, onValidate: function(v) { return res.locals.params.name = v;}},
        {path: 'email', value: req.body.email, onValidate: function(v) { return res.locals.params.email = v;}},
        {path: 'password', value: req.body.password, onValidate: function(v) { return res.locals.params.password = v;}},
        {path: 'phone', value: req.body.phone, onValidate: function(v) { return res.locals.params.phone = v;}}
      ];
      krkParameterValidator.modelPartialValidator(krkModelsUser, validationOpts)
        .then(function() { return next(); })
        .catch(function(reason) {
          res.locals.errors.add('INVALID_PARAMS', reason);
          next(true);
        });
    }

    function middlewareLoginParameterValidator(req, res, next) {
      var validationOpts = [
        {path: 'name', value: req.body.name, onValidate: function(v) { return res.locals.params.name = v;}},
        {path: 'password', value: req.body.password, onValidate: function(v) { return res.locals.params.password = v;}}
      ];
      krkParameterValidator.modelPartialValidator(krkModelsUser, validationOpts)
        .then(function() { return next(); })
        .catch(function(reason) {
          res.locals.errors.add('INVALID_PARAMS', reason);
          next(true);
        });
    }

    function middlewareVerifyByAdminParameterValidator(req, res, next) {
      res.locals.params.id = krkParameterValidator.validations.paramId(req);
      krkParameterValidator.checkForErrors(res.locals.params, req, res, next);
    }

    function middlewareSignUpController(req, res, next) {
      q.promisify(function(cb) { return $crypto.randomBytes(32, cb); })
          .catch(function(reason) {
            res.locals.errors.add('NOT_ENOUGH_ENTROPY', reason);
            next(true);
          })
        .then(function(validationToken) {
          return new krkModelsUser({
            validationToken: validationToken.toString('hex'),
            email: res.locals.params.email,
            name: res.locals.params.name,
            password: res.locals.params.password,
            phone: res.locals.params.phone,
            validatedByAdmin: config.adminValidationOnSignup,
            role: 'USER',
            preferences: {}
          });
        })
        .then(function(user) {
          if (process.env.UNIT_TEST) {
            krkLogger.info('send mock verification email to ' + user.name);
            return user;
          }
          var emailTemplate = krkRoutersAuthorizeVerifyAccountEmailTmpl.template({
            verifyAccountRoute: verifyAccountRoute,
            user: user,
            name: config.name,
            apiUrl: config.apiUrl
          });
          return krkNotificationsEmail.send(emailTemplate, {
            EMAIL_SMTP: config.EMAIL_SMTP,
            EMAIL_NAME: config.EMAIL_NAME,
            EMAIL_ADDRESS: config.EMAIL_ADDRESS
          })
            .catch(function(reason) {
              res.locals.errors.add('EMAIL_FAIL', reason.errors || reason);
              next(true);
            })
            .then(function() { return user; });
        })
        .then(function(newUser) {
          return newUser.save();
        })
        .catch(function(reason) {
          if (reason.code === 11000) {
            res.locals.errors.add('ALREADY_EXIST');
          } else {
            res.locals.errors.add('DB_ERROR', reason.errors || reason);
          }
          next(true);
        })
        .then(function(newUser) {
          return res.locals.data = newUser.getSafely();
        })
        .then(function() { return next(); });
    }

    function middlewareLoginController(req, res, next) {
      krkModelsUser.findOne({name: res.locals.params.name})
          .catch(function(reason) { return error('DB_ERROR', reason); })
        .then(function(user) {
          if (!user) {
            return error('UNAUTHORIZED_USER');
          }

          return user.comparePassword(req.body.password)
            .then(function(isEqual) {
              res.locals.data = krkMiddlewarePermissions.createJWT(user);

              next();
            })
            .catch(function(reason) {
              error('UNAUTHORIZED_USER');
            });
        });

        function error(type, reason) {
          res.locals.errors.add(type, reason);
          next(true);
        }
    }

    function middlewareVerifyAccountController(req, res, next) {
      krkModelsUser.verifyAccount(res.locals.params.token)
          .catch(function(reason) { return error('DB_ERROR', reason); })
        .then(function(updated) {
          if (!updated) {
            res.locals.errors.add('UNAUTHORIZED_USER');
            return next(true);
          }

          res.locals.redirect = config.appUrl + '/#/?validated=' + updated._id + '?email=' + updated.email;
          next();
        });
    }

    function middlewareVerifyByAdminController(req, res, next) {
      krkModelsUser.validateByAdmin(res.locals.params.id)
          .catch(function(reason) {
            res.locals.errors.add('DB_ERROR', reason);
            return next(true);
          })
        .then(function(updated) {
          if (!updated) {
            res.locals.errors.add('UNAUTHORIZED_USER');
            return next(true);
          }

          res.locals.data = updated;
          next();
        });
    }

    function middlewareRefreshTokenController(req, res, next) {
      krkModelsUser.findOne({_id: res.locals.user._id})
          .catch(function(reason) {
            res.locals.errors.add('DB_ERROR', reason);
            return next(true);
          })
        .then(function(user) {
          if (!user) {
            res.locals.errors.add('UNAUTHORIZED_USER');
            return next(true);
          }

          res.locals.data = krkMiddlewarePermissions.createJWT(user);
          next();
        });
    }
  }

});