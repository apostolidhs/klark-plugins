'use strict';

KlarkModule(module, 'krkNotificationsEmail', function(_, q, $nodemailer) {

  return {
    send: send
  };

  function send(opts, config) {
    if (!(config.emailSmtp && config.emailAddress)) {
      throw new Error('Invalid arguments');
    }
    var to = _.castArray(opts.to);
    var subject = opts.subject;
    var content = opts.content;

    var ma = config.emailSmtp;
// var ma = {
//   host: "smtp-mail.outlook.com", // hostname
//   secureConnection: false, // TLS requires secureConnection to be false
//   port: 587, // port for secure SMTP
//   auth: {
//       user: "info@wiregoose.com",
//       pass: "MikroMouPony!@#"
//   },
//   tls: {
//       ciphers:'SSLv3'
//   }
// };

    var transporter = $nodemailer.createTransport(ma);

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
