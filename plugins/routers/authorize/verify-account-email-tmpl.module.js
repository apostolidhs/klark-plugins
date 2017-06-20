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
      Κε/Κα ' + config.name + ',\
      <p>Ευχαριστούμε για την εγγραφή σας στην εφαρμογή <strong>RFS-iSAFE WebApp!</strong><br>\
      Παρακαλούμε πατήστε <a href="' + verifyUrl + '">εδώ</a> για να ολοκληρωθεί η εγγραφή σας.</p>\
      Με εκτίμηση,    \
    ';

    return {
      to: config.user.email,
      subject: subject,
      content: content
    };
  }
});
