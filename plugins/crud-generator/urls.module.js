'use strict';

KlarkModule(module, 'krkCrudGeneratorUrls', function() {

  return function(apiUrlPrefix) {
    return {
      create: urlWithoutId,
      update: urlWithId,
      retrieve: urlWithId,
      retrieveAll: urlWithoutId,
      delete: urlWithId,
      urlWithId,
      urlWithoutId
    };

    function urlWithId(name) {
      return '/' + apiUrlPrefix + '/' + name.toLowerCase() + '/:id';
    }

    function urlWithoutId(name) {
      return '/' + apiUrlPrefix + '/' + name.toLowerCase();
    }
  }
});