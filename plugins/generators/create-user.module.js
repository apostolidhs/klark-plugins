'use strict';

KlarkModule(module, 'krkGeneratorsCreateUser', function($mongoose, krkModelsUser) {

  return {
    admin: admin,
    simple: simple
  };

  function simple(userOpts) {
    return createUser('USER', userOpts);
  }

  function admin(userOpts) {
    return createUser('ADMIN', userOpts);
  }

  function createUser(role, userCred) {
    if (!(userCred.name && userCred.email && userCred.password)) {
      throw new Error('Invalid arguments');
    }
    var user = new krkModelsUser({
      name: userCred.name,
      email: userCred.email,
      password: userCred.password,
      role,
      preferences: {
        surname: 'admin',
        firstname: 'admin'
      },
      validationToken: 'mockValidationToken',
      validatedByAdmin: true
    });
    return user.save()
      .then(function(user) {
        return krkModelsUser.verifyAccount('mockValidationToken');
      })
  }

});
