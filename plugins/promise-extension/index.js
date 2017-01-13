'use strict';

KlarkModule(module, 'krkPromiseExtension', function($_) {

  return {
    extend
  };

  function extend(q) {

    q.promisify = promisify;
    q.throttle = throttle;

    function promisify(ctx) {
      var deferred = q.defer();

      // in case that callback is not asynchronous
      setTimeout(
        function() {
          return ctx(function(err, value) {
            if (err) {
              deferred.reject(err);
            } else {
              deferred.resolve(value);
            }
          });
        }, 0);

      return deferred.promise;
    }


    function throttle(opts) {
      if (!(opts && opts.list && opts.promiseTransformator)) {
        throw new Error('invalid arguments');
      }

      $_.defaultsDeep(opts, getDefaultValues());

      var deferred = q.defer();
      var chunks = $_.chunk(opts.list, opts.slices);
      var chunksLen = chunks.length;
      var result = [];

      innerThrottledResolve(0, 0);

      return deferred.promise;

      function innerThrottledResolve(sliceIdx, listIdx) {
        if (sliceIdx >= chunksLen) {
          return deferred.resolve(result);
        }
        var chunk = chunks[sliceIdx];
        var promisesOfChuck = $_.map(chunk, function(item) {
          return opts.promiseTransformator(item, listIdx++);
        });
        var promisesOfChuckResolver = q[opts.policy](promisesOfChuck);
        return promisesOfChuckResolver
          .then(function(resolvedChucks) {
            return result = result.concat(resolvedChucks);
          })
          .then(function() {
            return $_.delay(function() {
              return innerThrottledResolve(++sliceIdx, listIdx);
            }, opts.timeout);
          })
          .catch(function(reason) {
            return deferred.reject(reason);
          });
      }

      function getDefaultValues() {
        return {
          slices: 5,
          timeout: 10,
          policy: 'all'
        };
      }
    }
  }

});