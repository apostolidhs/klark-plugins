'use strict';

KlarkModule(module, 'krkModelsApp', function($mongoose) {

  var schema = new $mongoose.Schema({
    lastRssRegistrationFetch: {type: Date, required: true}
  });

  return $mongoose.model('App', schema);

});