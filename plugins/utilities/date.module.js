/* jshint esversion:6, node:true  */

'use strict';

KlarkModule(module, 'utilitiesDate', ($_, $moment) => {

  const dateFormat = 'MM/DD/YYYY HH:mm:ss';

  return {
    stringify,
    duration
  };

  function stringify(date) {
    date = date === undefined ? new Date() : new Date(date);
    return $moment(date).format(dateFormat);
  }

  function duration(start, finish) {
    finish = finish === undefined ? new Date() : new Date(finish);
    return $moment.utc($moment(finish).diff($moment(new Date(start)))).format('HH:mm:ss');
  }
});