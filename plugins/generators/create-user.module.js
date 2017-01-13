'use strict';

KlarkModule(module, 'krkGeneratorsCreateUser', function($mongoose, krkModelsUser) {

  return {
    admin: admin
  };

  function admin(userCred) {
    if (!(userCred.name && userCred.email && userCred.password)) {
      throw new Error('Invalid arguments');
    }
    var user = new krkModelsUser({
      name: userCred.name,
      email: userCred.email,
      password: userCred.password,
      role: 'ADMIN',
      preferences: {},
      validationToken: 'mockValidationToken',
      validatedByAdmin: true
    });
    return user.save()
      .then(function(user) {
        return modelsUser.verifyAccount('mockValidationToken');
      })
      .then(function() {
        return user;
      });
  }

});