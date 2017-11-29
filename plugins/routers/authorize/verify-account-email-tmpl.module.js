'use strict';

KlarkModule(module, 'krkRoutersAuthorizeVerifyAccountEmailTmpl', function() {

  return {
    template: template
  };

  function template(config) {
    if (!(config && config.user && config.verifyUrl && config.apiUrl)) {
      throw new Error('Invalid arguments');
    }
    var subject = 'Πιστοποιήστε τον λογαριασμό σας';

    var content = '\
      Κε/Κα ' + config.user.email + ',\
      <p>Ευχαριστούμε για την εγγραφή σας στην εφαρμογή<br>\
      Παρακαλούμε πατήστε <a href="' + config.verifyUrl + '">εδώ</a> για να ολοκληρωθεί η εγγραφή σας.</p>\
      Με εκτίμηση,    \
    ';

    return {
      to: config.user.email,
      subject: subject,
      content: content
    };
  }
});
