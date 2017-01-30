'use strict';

KlarkModule(module, 'krkNotificationsEmail', function(_, q, $nodemailer) {

  return {
    send: send
  };

  function send(opts, config) {
    if (!(config.EMAIL_SMTP && config.EMAIL_NAME && config.EMAIL_ADDRESS)) {
      throw new Error('Invalid arguments');
    }
    var to = _.castArray(opts.to);
    var subject = opts.subject;
    var content = opts.content;

    var transporter = $nodemailer.createTransport(config.EMAIL_SMTP);

    var from = config.EMAIL_NAME ? '"' + config.EMAIL_NAME + '" <' + config.EMAIL_ADDRESS + '>'
                  : config.EMAIL_ADDRESS;

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