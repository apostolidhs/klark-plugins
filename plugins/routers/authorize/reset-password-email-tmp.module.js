'use strict';

KlarkModule(module, 'krkRoutersAuthorizeResetPasswordEmailTmpl', function(config) {

  return {
    template: template
  };

  function template(config) {
    if (!(config && config.user && config.password && config.name && config.appUrl)) {
      throw new Error('Invalid arguments');
    }
    var subject = config.name + ' Επαναφορά κωδικού πρόσβασης';

    var settingsUrl = [config.appUrl, '/#/settings'].join('');

    var content = '\
      <h1>' + config.name + '</h1>\
      <h3>Γειά σας ' + config.user.email + '</h3>\
      <p>Ο νέος σας προσωρινός κωδικό είναι ' + config.password + '</p>\
      <p>Θα ήταν ασφαλέστερο αν <a href="' + settingsUrl + '">αλλάζατε τον προσωρινό σας κωδικό</a></p>\
    ';

    return {
      to: config.user.email,
      subject: subject,
      content: content
    };
  }
});
