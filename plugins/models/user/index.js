'use strict';

KlarkModule(module, 'krkModelsUser', function(
  _,
  q,
  $mongoose,
  $mongooseTypeEmail,
  $mongooseCreatedmodified,
  krkMiddlewarePermissionsRoles,
  krkDbMongoosePluginsPassword
) {
  // seconds, after signup of the account, how long will the user remain until it will be validated
  var USER_ACCOUNT_VALIDATION_PERIOD = 1 * 24 * 60 * 60 * 1000;

  var schema = new $mongoose.Schema({
    name: {type: String, maxlength: [64], unique: true, required: true},
    email: {type: $mongoose.SchemaTypes.Email, required: true, unique: true},
    password: {type: String, required: true},
    phone: {type: String, maxlength: [32]},
    lastLogin: {type: Date, required: true, default: Date.now},
    validationExpiresAt: { type: Date, default: Date.now, expires: USER_ACCOUNT_VALIDATION_PERIOD },
    validationToken: {type: String, maxlength: [64]},
    totalLogins: {type: Number, required: true, min: 0, default: 0},
    role: {type: String, enum: krkMiddlewarePermissionsRoles, required: true},
    validatedByAdmin: {type: Boolean, required: true},
    preferences: {type: $mongoose.Schema.Types.Mixed}
  });

  schema.plugin(krkDbMongoosePluginsPassword, { passwordField: 'password' });
  schema.plugin($mongooseCreatedmodified.createdModifiedPlugin);
  schema.methods.getSafely = getSafely;
  schema.statics.verifyAccount = verifyAccount;
  schema.statics.invalidateAccount = invalidateAccount;
  schema.statics.validateByAdmin = validateByAdmin;

  return $mongoose.model('User', schema);

  function getSafely() {
    var userObj = this.toObject();
    var safeUser = _.omit(userObj, [
      'password',
      'validationToken'
    ]);

    if (!userObj.validationToken) {
      safeUser.isEmailValid = true;
    }

    return safeUser;
  }

  function invalidateAccount(id, validationToken) {
    var q = {
      validationToken,
      validationExpiresAt: new Date()
    };
    return this.findOneAndUpdate({_id: id}, q, {new: true});
  }

  function verifyAccount(validationToken) {
    var unset = {
      $unset: {
        validationExpiresAt: 1,
        validationToken: 1
      }
    };
    return this.findOneAndUpdate({validationToken}, unset, {new: true});
  }

  function validateByAdmin(id) {
    return this.findOneAndUpdate({_id: id}, {validatedByAdmin: true}, {new: true});
  }

});