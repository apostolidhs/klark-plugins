'use strict';

KlarkModule(module, 'krkMiddlewareCrudController', function(_, q, krkDbMongooseBinders) {

  return {
    create: createCtrl,
    update: updateCtrl,
    retrieve: retrieveCtrl,
    retrieveAll: retrieveAllCtrl,
    delete: deleteCtrl,

    singleRetrieve: singleRetrieveCtrl,
    singleUpdate: singleUpdateCtrl
  };

  function createCtrl(model) {
    return function(req, res, next) {
      var record = res.locals.params[model.modelName];
      performAndResponse(function() {
        return krkDbMongooseBinders.create(model, record);
      }, res, next);
    };
  }

  function updateCtrl(model) {
    return function(req, res, next) {
      var id = res.locals.params.id;
      var record = res.locals.params[model.modelName];
      performAndResponse(function() {
        return krkDbMongooseBinders.findByIdAndUpdate(model, id, record);
      }, res, next);
    };
  }

  function retrieveCtrl(model) {
    return function(req, res, next) {
      var id = res.locals.params.id;
      performAndResponse(function() {
        return krkDbMongooseBinders.findById(model, id);
      }, res, next);
    };
  }

  function retrieveAllCtrl(model) {
    return function(req, res, next) {
      var findOpts = {
        pagination: res.locals.params.pagination,
        filters: res.locals.params.filters,
        uniqueBy: res.locals.params.uniqueBy
      };

      q.all([
        krkDbMongooseBinders.find(model, findOpts),
        krkDbMongooseBinders.count(model),
        (findOpts.filters || findOpts.uniqueBy) && krkDbMongooseBinders.find(model, findOpts).count()
      ])
      .then(function(resolvedPromises) {
        var data = {};
        data.content = resolvedPromises[0];
        data.total = resolvedPromises[1];
        data.filteredTotal = resolvedPromises[2];
        res.locals.data = data;

        next();
      })
      .catch(function(reason) {
        res.locals.errors.add('DB_ERROR', reason);
        next(true);
      });
    };
  }

  function deleteCtrl(model) {
    return function(req, res, next) {
      var id = res.locals.params.id;
      performAndResponse(function() {
        return krkDbMongooseBinders.remove(model, id);
      }, res, next);
    };
  }

  function singleRetrieveCtrl(model) {
    return function(req, res, next) {
      performAndResponse(function() {
        return krkDbMongooseBinders
          .find(model)
          .then(_.first);
      }, res, next);
    };
  }

  function singleUpdateCtrl(model) {
    return function(req, res, next) {
      var updatedRecord = res.locals.params[model.modelName];
      performAndResponse(function() {
        return krkDbMongooseBinders
          .find(model)
          .then(_.first)
          .then((record) => krkDbMongooseBinders.findByIdAndUpdate(model, record._id, updatedRecord));
      }, res, next);
    };
  }

  function performAndResponse(ctx, res, next) {
    ctx()
      .then(function(data) {
        res.locals.data = data;
        next();
      })
      .catch(function(reason) {
        res.locals.errors.add('DB_ERROR', reason);
        next(true);
      });
  }

});
