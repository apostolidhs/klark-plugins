'use strict';

KlarkModule(module, 'krkDbMongoosePluginsPassword', function(_, q, $bcrypt, krkLogger) {

  return passwordPlugin;

  function passwordPlugin(schema, options) {

    var passField = options.passwordField;
    krkLogger.assert(_.isString(passField));

    schema.pre('save', encryptPassword);
    schema.methods.comparePassword = comparePassword;

    function encryptPassword(next) {
      var user = this;

      if (!this.isModified(passField) && !this.isNew) {
        return next();
      }

      q.promisify(function(cb) {
        return $bcrypt.genSalt(10, cb);
      })
      .then(function(salt) {
        return q.promisify(function(cb) {
          return $bcrypt.hash(user.password, salt, cb);
        });
      })
      .then(function(hash) {
        return user[passField] = hash;
      })
      .then(function() {
        return next(user);
      })
      .catch(function(reason) {
        return next(reason);
      });
    }

    function comparePassword(password) {
      var self = this;
      return q.promisify(function(cb) {
        $bcrypt.compare(password, self.password, cb)
      })
      .then(function(isMatch) {
        if (isMatch) {
          return true;
        }
        throw new Error(false);
      })
      .catch(function(reason) {
        return cb(reason);
      });
    }
  }

});