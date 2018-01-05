'use strict';

KlarkModule(module, 'krkRoutesAuthorize', function(
  _,
  q,
  $crypto,
  krkLogger,
  krkRoutersAuthorizeVerifyAccountEmailTmpl,
  krkRoutersAuthorizeResetPasswordEmailTmpl,
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
      && config.name
      && config.emailSmtp
      && config.emailAddress
    )) {
      throw new Error('Invalid arguments');
    }

    config.adminValidationOnSignup = config.adminValidationOnSignup || true;
    config.verifyAccountEmailTmpl = config.verifyAccountEmailTmpl || getDefaultVerificationEmail;
    config.resetPasswordEmailTmpl = config.resetPasswordEmailTmpl || getDefaultResetPasswordEmail;

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

    app.post('/' + config.apiUrlPrefix + '/authorize/resetPassword', [
      krkMiddlewarePermissions.check('FREE'),
      middlewareResetPasswordValidator,
      middlewareResetPasswordController,
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
        {path: 'email', value: req.body.email, onValidate: function(v) { return res.locals.params.email = v;}},
        {path: 'password', value: req.body.password, onValidate: function(v) { return res.locals.params.password = v;}},
        {path: 'lang', value: req.body.lang, onValidate: function(v) { return res.locals.params.lang = v;}}
      ];

      // If we marked it as non-required in the schema
      if (!validationOpts[0].value) {
        res.locals.errors.add('INVALID_PARAMS', ['invalid password']);
        return next(true);
      }

      const pass = validationOpts[1].value;
      if (!(_.isString(pass) && pass.length >= 6)) {
        res.locals.errors.add('INVALID_PARAMS', ['invalid email address']);
        return next(true);
      }

      krkParameterValidator.modelPartialValidator(krkModelsUser, validationOpts)
        .then(function() { return next(); })
        .catch(function(reason) {
          res.locals.errors.add('INVALID_PARAMS', reason);
          next(true);
        });
    }

    function middlewareLoginParameterValidator(req, res, next) {
      var validationOpts = [
        {path: 'email', value: req.body.email, onValidate: function(v) { return res.locals.params.email = v;}},
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

    function middlewareResetPasswordValidator(req, res, next) {
      var validationOpts = [
        {path: 'email', value: req.body.email, onValidate: v => res.locals.params.email = v}
      ];
      krkParameterValidator.modelPartialValidator(krkModelsUser, validationOpts)
        .then(function() { return next(); })
        .catch(function(reason) {
          res.locals.errors.add('INVALID_PARAMS', reason);
          next(true);
        });
    }

    function middlewareSignUpController(req, res, next) {
      krkModelsUser.findOne({email: res.locals.params.email})
        .then(user => {
          if (user) {
            res.locals.errors.add('ALREADY_EXIST');
            throw new Error();
          }
        })
        .then(() => q.promisify(function(cb) { return $crypto.randomBytes(32, cb); })
          .catch(function(reason) {
            res.locals.errors.add('NOT_ENOUGH_ENTROPY', reason);
            throw new Error();
          }))
        .then(function(validationToken) {
          const userObj = {
            validationToken: validationToken.toString('hex'),
            validationExpiresAt: new Date(),
            email: res.locals.params.email,
            password: res.locals.params.password,
            lang: res.locals.params.lang,
            role: 'USER'
          };
          if (config.adminValidationOnSignup) {
            userObj.validatedByAdmin = false;
          }
          return new krkModelsUser(userObj);
        })
        .then(function(user) {
          return user.sendVerificationEmail({
            apiUrl: config.apiUrl,
            apiUrlPrefix: config.apiUrlPrefix,
            verifyAccountEmailTmpl: config.verifyAccountEmailTmpl,
            emailSmtp: config.emailSmtp,
            emailName: config.emailName,
            emailAddress: config.emailAddress
          })
          .catch(function(reason) {
            res.locals.errors.add('EMAIL_FAIL', reason.errors || reason);
            next(true);
          })
          .then(function() { return user; })
        })
        .then(function(newUser) {
          return newUser.save()
            .catch(function(reason) {
              if (reason.code === 11000) {
                res.locals.errors.add('ALREADY_EXIST');
              } else {
                res.locals.errors.add('DB_ERROR', reason.errors || reason);
              }
              throw new Error();
            })
        })
        .then(function(newUser) {
          res.locals.data = newUser.getSafely();
          return next();
        })
        .catch(function() { return next(true); });
    }

    function middlewareLoginController(req, res, next) {
      krkModelsUser.findOne({email: res.locals.params.email})
          .catch(function(reason) { return error('DB_ERROR', reason); })
        .then(function(user) {
          if (!user) {
            return error('UNAUTHORIZED_USER');
          }

          return user.comparePassword(res.locals.params.password)
            .then(function(isEqual) {
              res.locals.data = krkMiddlewarePermissions.createJWT(user);
              user.updateLoginInfo();
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

          res.locals.redirect = config.appUrl + '?validated=' + updated.email;
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

    function middlewareResetPasswordController(req, res, next) {
      krkModelsUser.findOne({email: res.locals.params.email})
        .catch(function(reason) {
          res.locals.errors.add('DB_ERROR', reason);
          throw new Error();
        })
        .then(user => {
          if (!user) {
            return next();
          }

          q.promisify(function(cb) { return $crypto.randomBytes(16, cb); })
            .catch(function(reason) {
              res.locals.errors.add('NOT_ENOUGH_ENTROPY', reason);
              throw new Error();
            })
          .then(function(newPassword) {
            user.password = newPassword.toString('hex');
            return user.sendResetPasswordEmail({
              password: user.password,
              name: config.name,
              appUrl: config.appUrl,
              resetPasswordEmailTmpl: config.resetPasswordEmailTmpl,
              emailSmtp: config.emailSmtp,
              emailName: config.emailName,
              emailAddress: config.emailAddress
            })
            .catch(function(reason) {
              res.locals.errors.add('EMAIL_FAIL', reason.errors || reason);
              throw new Error();
            });
          })
          .then(function() {
            return user.save()
              .catch(function(reason) {
                res.locals.errors.add('DB_ERROR', reason.errors || reason);
                throw new Error();
              })
          })
          .then(function() { return next(); })
          .catch(function(reason) { return next(true); })
        })
    }

    function getDefaultVerificationEmail(opts) {
      return krkRoutersAuthorizeVerifyAccountEmailTmpl.template({
        verifyUrl: opts.verifyUrl,
        user: opts.user,
        apiUrl: opts.apiUrl
      });
    }

    function getDefaultResetPasswordEmail(opts) {
      return krkRoutersAuthorizeResetPasswordEmailTmpl.template({
        password: opts.newPassword,
        user: opts.user,
        name: opts.name,
        appUrl: opts.appUrl
      });
    }
  }

});
