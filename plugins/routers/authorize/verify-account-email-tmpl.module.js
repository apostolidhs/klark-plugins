'use strict';

KlarkModule(module, 'krkRoutersAuthorizeVerifyAccountEmailTmpl', function(config) {

  return {
    template: template
  };

  function template(config) {
    if (!(config && config.user && config.verifyAccountRoute && config.name && config.apiUrl)) {
      throw new Error('Invalid arguments');
    }
    var subject = config.name + 'Πιστοποιήστε τον λογαριασμό σας';

    var verifyUrl = [config.apiUrl, config.verifyAccountRoute, '?token=', config.user.validationToken].join('');
    var content = '\
      <h1>' + config.name + '</h1>\
      <h3>Γειά σας ' + config.user.name + '</h3>\
      <p>Δημιουργήσατε λογαριασμό σε εμάς</p>\
      <p>Παρακαλώ, <a href="' + verifyUrl + '">πιστοποιήστε τον λογαριασμό σας</a></p>\
    ';

    return {
      to: config.user.email,
      subject: subject,
      content: content
    };
  }
});
