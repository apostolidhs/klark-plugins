/* jshint esversion:6, node:true  */

'use strict';

KlarkModule(module, 'scriptsInitializeDb', (
  $_,
  $q,
  promiseExtension,
  config,
  logger,
  generatorsCreateUser,
  dbMongooseConnector,
  dbMongooseBinders,
  modelsUser
) => {

  let categoriesByName;
  let providersByName;

  promiseExtension.extend($q);

  dbMongooseConnector.connect()
    .then(() => dbMongooseConnector.dropDatabase())
    .then(() => generatorsCreateUser.admin())
    .then(() => logger.info('admin created'))
    // .then(() => importSimpleData('categories.json', modelsCategory, (data) => ({
    //   name: data
    // })))
    // .then((newCategories) => categoriesByName = $_.keyBy(newCategories, 'name'))
    // .then(() => logger.info('categories imported'))
    // .then(() => importSimpleData('providers.json', modelsRssProvider, (data) => ({
    //   name: data.name,
    //   link: data.link
    // })))
    // .then((newProviders) => providersByName = $_.keyBy(newProviders, 'name'))
    // .then(() => logger.info('providers imported'))
    // .then(() => importSimpleData('rss-feed-registrations.json', modelsRssRegistration, (data) => ({
    //   category: categoriesByName[data.category]._id,
    //   link: data.link,
    //   lang: data.lang,
    //   provider: providersByName[data.provider]._id
    // })))
    // .then(() => logger.info('rssFeedRegistrations imported'))
    // .then(() => createAppInfo())
    // .then(() => logger.info('appInfo created'))
    .then(() => process.exit(0))
    .catch((reason) => {
      logger.error('script failed', reason);
      process.exit(1);
    })

  function importSimpleData(filepath, model, getterFunc) {
    const simpleData = require(`../../rss-feed-sources/${filepath}`);

    const promiseOfData = $_.map(
      simpleData,
      data => dbMongooseBinders.create(model, getterFunc(data))
    );

    return $q.all(promiseOfData);
  }

  function createAppInfo() {
    const appInfo = {
      lastRssRegistrationFetch: new Date(0)
    };

    return dbMongooseBinders.create(modelsApp, appInfo);
  }

});


