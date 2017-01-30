'use strict';

KlarkModule(module, 'krkDbMongooseBinders', function(_, $mongoose, krkLogger, krkModelsApp) {

  return {
    create: create,
    findByIdAndUpdate: findByIdAndUpdate,
    findById: findById,
    find: find,
    count: count,
    remove: remove,

    getAppInfo: getAppInfo,
    updateAppInfo: updateAppInfo
  };

  function getAppInfo() {
    return find(krkModelsApp).then(_.first);
  }

  function updateAppInfo(data) {
    return getAppInfo()
            .then(function(appInfo) {
              return findByIdAndUpdate(krkModelsApp, appInfo._id, data);
            });
  }

  function create(model, record) {
    return model.create(record);
  }

  function findByIdAndUpdate(model, id, record) {
    return model.findByIdAndUpdate(id, record, {new: true});
  }

  function findById(model, id) {
    // mongoose autopopulate is not working for findById
    return model.findOne({_id: id});
  }

  function find(model, opts) {
    var pagination = opts && opts.pagination;
    var filters = opts && opts.filters;

    var q;
    if (filters) {
      q = _.transform(filters, function(result, value, key) {
        if (!(_.isNil(value) || (_.isString(value) && !value))) {
          result[key] = valueToFilter(value);
        }
      }, {});
    }

    var cursor = model.find(q);

    if (pagination) {
      if (pagination.page) {
        krkLogger.assert(pagination.count > 0);
        cursor.skip((pagination.page - 1) * pagination.count)
          .limit(pagination.count);
      }
      if (pagination.sortBy) {
        cursor.sort(_.fromPairs([[pagination.sortBy, pagination.asc ? 1 : -1]]));
      }
    }

    return cursor;
  }

  function count(model) {
    return model.count();
  }

  function remove(model, id) {
    return model.remove({_id: id});
  }

  function valueToFilter(value) {
    if (_.isString(value)) {
      return new RegExp(value, "i");
    } else if (_.isNumber(value) || _.isBoolean(value)) {
      return value;
    } else if (_.isDate(value)) {
      return {
        $lte: new Date(value.getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week range
        $gte: value
      };
    } else {
      krkLogger.assert(false, `Unsupported value type: ${value}`);
    }
  }
});
