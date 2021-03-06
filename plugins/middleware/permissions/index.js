'use strict';

KlarkModule(module, 'krkMiddlewarePermissions', function(
  _,
  $passport,
  $jwtSimple,
  krkLogger,
  krkMiddlewarePermissionsRoles,
  krkParameterValidator
) {

  var options;

  return {
    check: check,
    createJWT: createJWT,
    decodeJWT: decodeJWT,
    setOptions: setOptions
  };

  function check(permission, _permOpts) {
    const permOpts = _.defaultsDeep(_permOpts, {
      onlyOwner: false
    });
    if (_.indexOf(krkMiddlewarePermissionsRoles, permission) === -1) {
      krkLogger.error(`unsupported permission (${permission})`);
    }

    if (permission === 'FREE') {
      return function(req, res, next) {
        return next();
      };
    }

    return function(req, res, next) {
      var authOptions = {
        session: false,
        failWithError: true
      };
      $passport.authenticate('jwt', authOptions)(req, res, onPassportAuthenticationFinished);

      function onPassportAuthenticationFinished(error) {
        if (error) return unauthorized();

        var token = getToken(req.headers);
        var decodedToken = decodeJWT(token);

        if (!(_.isObject(decodedToken) && decodedToken.session && decodedToken.user)) {
          return unauthorized();
        }

        if (decodedToken.session.expiresAt < _.now()) {
          return unauthorized();
        }

        var user = decodedToken.user;

        if (!((permission === 'USER' && (user.role === 'USER' || user.role === 'ADMIN'))
          || permission === 'ADMIN' && (user.role === 'ADMIN'))) {
            return unauthorized();
        }

        if (permOpts.onlyOwner) {
          const tarketUserIs = krkParameterValidator.validations.paramId(req);
          if(user.role === 'USER' && user._id !== tarketUserIs) {
            return unauthorized();
          }
        }

        res.locals.user = decodedToken.user;
        res.locals.session = decodedToken.session
        next();
      }

      function unauthorized() {
        res.locals.errors.add('UNAUTHORIZED_USER');
        return next(true);
      }
    };

  }

  function getToken (headers) {
    if (headers && headers.authorization) {
      var parted = headers.authorization.split(' ');
      return parted.length === 2 && parted[0] === 'JWT' ? parted[1] : undefined;
    }
  };

  function createJWT(user) {
    var tokenData = {
      user: user.getSafely(),
      session: {
        expiresAt: _.now() + options.expirationPeriod
      }
    };

    var token = $jwtSimple.encode(tokenData, options.secret);

    return `JWT ${token}`;
  }

  function decodeJWT(token) {
    return $jwtSimple.decode(token, options.secret);
  }

  function setOptions(customOptions) {
    if (!(customOptions.expirationPeriod && customOptions.secret)) {
      throw new Error('Invalid arguments');
    }
    options = customOptions;
  }
});
