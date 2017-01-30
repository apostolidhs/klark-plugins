'use strict';

KlarkModule(module, 'krkDbMongooseConnector', function(q, $mongoose, krkLogger) {

  var promiseOfConnection;
  decorateMongoosePromises();

  return {
    connect: connect,
    dropDatabase: dropDatabase
  };

  function decorateMongoosePromises() {
    $mongoose.Promise = q.Promise;
  }

  function connect(mongodbUrl) {
    if (!mongodbUrl) {
      throw new Error('Invalid arguments');
    }
    if (promiseOfConnection) {
      return promiseOfConnection;
    }

    var deffered = q.defer();

    $mongoose.connect(mongodbUrl);
    var db = $mongoose.connection;
    db.on('error', function(err) {
      krkLogger.error('Connection error:', err);
      deffered.reject(err);
    });
    db.once('open', function() {
      krkLogger.info('Connected to mongo');
      deffered.resolve();
    });

    promiseOfConnection = deffered.promise;
    return promiseOfConnection;
  }

  function dropDatabase() {
    return $mongoose.connection.db.dropDatabase();
  }

});
