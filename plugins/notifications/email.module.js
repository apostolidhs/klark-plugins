'use strict';

KlarkModule(module, 'krkNotificationsEmail', function(_, q, $nodemailer) {

  return {
    send: send
  };

  function send(opts, config) {
    if (!(config.emailSmtp && config.emailName && config.emailAddress)) {
      throw new Error('Invalid arguments');
    }
    var to = _.castArray(opts.to);
    var subject = opts.subject;
    var content = opts.content;

    var transporter = $nodemailer.createTransport(config.emailSmtp);

    var from = config.emailName ? '"' + config.emailName + '" <' + config.emailAddress + '>'
                  : config.emailAddress;

    var mailOptions = {
        from, // sender address
        to: _.join(to, ', '), // list of receivers
        subject: subject, // Subject line
        html: content // html body
    };

    return q.promisify(function(cb) {
      return transporter.sendMail(mailOptions, cb);
    });
  }

});
