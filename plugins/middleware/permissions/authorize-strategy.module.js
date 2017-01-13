'use strict';

KlarkModule(module, 'krkMiddlewarePermissionsAuthorizeStrategy', function(
  $_,
  $passportJwt,
  krkModelsUser
) {

  return {
    register
  };

  function register(passport, jwtSecret) {
    var opts = {};
    opts.jwtFromRequest = $passportJwt.ExtractJwt.fromAuthHeader();
    opts.secretOrKey = jwtSecret;

    var strategy = new $passportJwt.Strategy(opts, function(jwtPayload, done) {
      return krkModelsUser.findOne({_id: jwtPayload.user._id})
        .then(user => done(null, user || false))
        .catch(reason => done(null, false));
    });

    passport.use(strategy);
  }

});
