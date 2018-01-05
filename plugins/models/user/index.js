'use strict';

KlarkModule(module, 'krkModelsUserExtension', function(
  _,
  q,
  $mongoose,
  $mongooseTypeEmail,
  $mongooseCreatedmodified,
  krkDbMongooseConnector,
  krkMiddlewarePermissionsRoles,
  krkDbMongoosePluginsPassword,
  krkNotificationsEmail
) {

  krkDbMongooseConnector.decorateMongoosePromises();

  const defaultOpts = {
    validatedByAdmin: true,
    userAccountValidationPeriod: 1 * 24 * 60 * 60 * 1000,
    supportedLanguages: ['en'],
    onSchemaOptions: _.identity,
    onSchemaMethods: _.identity
  };

  return {
    createSchema: createSchema
  };

  function createSchema(opts) {
    var options = _.defaults(opts, defaultOpts);

    var schemaOpts = {
      email: {type: $mongoose.SchemaTypes.Email, unique: true, required: true},
      password: {type: String},
      lastLogin: {type: Date, default: Date.now},
      validationExpiresAt: { type: Date, expires: options.userAccountValidationPeriod },
      validationToken: {type: String, maxlength: [64]},
      totalLogins: {type: Number, min: 0, default: 0},
      role: {type: String, enum: krkMiddlewarePermissionsRoles, required: true},
      lang: {type: String, enum: options.supportedLanguages, default: options.supportedLanguages[0]},
    };

    if (options.validatedByAdmin) {
      schemaOpts.validatedByAdmin = {type: Boolean, required: true};
    }

    schemaOpts = options.onSchemaOptions(schemaOpts);

    var schema = new $mongoose.Schema(schemaOpts);

    schema.plugin(krkDbMongoosePluginsPassword, { passwordField: 'password' });
    schema.plugin($mongooseCreatedmodified.createdModifiedPlugin);
    schema.methods.getSafely = getSafely;
    schema.methods.updateLoginInfo = updateLoginInfo;
    schema.methods.sendVerificationEmail = sendVerificationEmail;
    schema.methods.sendResetPasswordEmail = sendResetPasswordEmail;
    schema.statics.verifyAccount = verifyAccount;
    schema.statics.invalidateAccount = invalidateAccount;

    if (options.validatedByAdmin) {
      schema.statics.validateByAdmin = validateByAdmin;
    }

    schema = options.onSchemaMethods(schema);

    return $mongoose.model('User', schema);
  }


  // seconds, after signup of the account, how long will the user remain until it will be validated
  // var USER_ACCOUNT_VALIDATION_PERIOD = 1 * 24 * 60 * 60 * 1000;
  // krkDbMongooseConnector.decorateMongoosePromises();

  // var schema = new $mongoose.Schema({
  //   name: {type: String, maxlength: [64], unique: true, required: true},
  //   email: {type: $mongoose.SchemaTypes.Email, unique: true, required: true},
  //   password: {type: String, required: true},
  //   phone: {type: String, maxlength: [32]},
  //   lastLogin: {type: Date, required: true, default: Date.now},
  //   validationExpiresAt: { type: Date, default: Date.now, expires: USER_ACCOUNT_VALIDATION_PERIOD },
  //   validationToken: {type: String, maxlength: [64]},
  //   totalLogins: {type: Number, required: true, min: 0, default: 0},
  //   role: {type: String, enum: krkMiddlewarePermissionsRoles, required: true},
  //   validatedByAdmin: {type: Boolean, required: true},
  //   preferences: {type: $mongoose.Schema.Types.Mixed}
  // });

  // schema.plugin(krkDbMongoosePluginsPassword, { passwordField: 'password' });
  // schema.plugin($mongooseCreatedmodified.createdModifiedPlugin);
  // schema.methods.getSafely = getSafely;
  // schema.methods.updateLoginInfo = updateLoginInfo;
  // schema.statics.verifyAccount = verifyAccount;
  // schema.statics.invalidateAccount = invalidateAccount;
  // schema.statics.validateByAdmin = validateByAdmin;

  // return $mongoose.model('User', schema);

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

  function updateLoginInfo() {
    ++this.totalLogins;
    this.lastLogin = new Date();
    return this.save();
  }

  function sendVerificationEmail(config) {
    if (!(
      config.apiUrl
      && config.apiUrlPrefix
      && config.verifyAccountEmailTmpl
      && config.emailSmtp
      && config.emailAddress
    )) {
      throw new Error('Invalid arguments');
    }

    var verifyAccountRoute = '/' + config.apiUrlPrefix + '/authorize/verifyAccount';

    var verifyUrl = [
      config.apiUrl,
      verifyAccountRoute,
      '?token=',
      this.validationToken
    ].join('');

    var emailTemplate = config.verifyAccountEmailTmpl({
      verifyUrl: verifyUrl,
      user: this,
      apiUrl: config.apiUrl
    });

    return krkNotificationsEmail.send(emailTemplate, {
      emailSmtp: config.emailSmtp,
      emailName: config.emailName,
      emailAddress: config.emailAddress
    });
  }

  function sendResetPasswordEmail(config) {
    if (!(
      config.appUrl
      && config.name
      && config.password
      && config.resetPasswordEmailTmpl
      && config.emailSmtp
      && config.emailAddress
    )) {
      throw new Error('Invalid arguments');
    }

    var emailTemplate = config.resetPasswordEmailTmpl({
      password: config.password,
      user: this,
      name: config.name,
      appUrl: config.appUrl
    });

    return krkNotificationsEmail.send(emailTemplate, {
      emailSmtp: config.emailSmtp,
      emailName: config.emailName,
      emailAddress: config.emailAddress
    })
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
