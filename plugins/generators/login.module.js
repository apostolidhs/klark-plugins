'use strict';

KlarkModule(module, 'krkGeneratorsLogin', (krkMiddlewarePermissions) => {

  return {
    login: login
  };

  function login(user) {
    return krkMiddlewarePermissions.createJWT(user);
  }

});