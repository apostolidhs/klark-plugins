'use strict';

KlarkModule(module, 'krkDbMongooseBinders', function(_, $mongoose, krkLogger) {

  return {
    create: create,
    findByIdAndUpdate: findByIdAndUpdate,
    findById: findById,
    find: find,
    count: count,
    remove: remove,
    appliers: {
      applyPagination,
      applyFilters
    }
  };

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
    var uniqueBy = opts && opts.uniqueBy;

    const q = applyFilters();
    var cursor = model.find(q);

    if (uniqueBy) {
      cursor.distinct(uniqueBy);
    }

    if (pagination) {
      applyPagination(cursor, pagination);
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
    } else if (_.isNumber(value) || _.isBoolean(value) || _.get(value, '_bsontype') === 'ObjectID') {
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

  function applyPagination(cursor, pagination) {
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
  }

  function applyFilters(cursor, filters) {
    if (filters) {
      return _.transform(filters, function(result, value, key) {
        if (key === '__custom__' && _.isFunction(value)) {
          value(result);
        } else if (!(_.isNil(value) || (_.isString(value) && !value))) {
          result[key] = valueToFilter(value);
        }
      }, {});
    }
  }
});
