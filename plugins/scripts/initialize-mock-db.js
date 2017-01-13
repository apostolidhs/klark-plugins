/* jshint esversion:6, node:true  */

'use strict';

KlarkModule(module, 'scriptsInitializeMockDb', (
  $_,
  $q,
  promiseExtension,
  config,
  logger,
  generatorsCreateUser,
  statics,
  dbMongooseConnector,
  dbMongooseBinders,
  modelsUser,
  modelsApplication
) => {

  let user;
  let applications;

  promiseExtension.extend($q);

  dbMongooseConnector.connect()
    .then(() => dbMongooseConnector.dropDatabase())
    .then(() => generatorsCreateUser.admin())
    .then(_user => user = _user)
    .then(() => logger.info('admin created'))
    .then(() => insertApplicationsData())
    .then(() => logger.info('applications created'))
    .then(() => process.exit(0))
    .catch((reason) => {
      logger.error('script failed', reason);
      process.exit(1);
    });

  function insertApplicationsData() {
    const applicationsPrms = $_.map($_.times(3), v => {
      const deffered = $q.defer();
      const app = new modelsApplication(createApplicationData(statics.applicationJobs.ids[0], v));
      app.save()
        .then(app => deffered.resolve(app));
      return deffered.promise;
    });

    return $q.all(applicationsPrms)
      .then(apps => {
        const app = new modelsApplication(createApplicationData(statics.applicationJobs.ids[1], '4', apps[0]._id));
        applications = apps;
        return app.save()
          .then(app => applications.push(app));
      });
  }

  function createApplicationData(job, uniquenessId, associatedApplicationId) {
    return {
      "applicationId": `test_applicationId${uniquenessId}`,
      "job": job,
      "ak": `test_ak${uniquenessId}`,
      "municipality": `test_municipality${uniquenessId}`,
      "address": `test_address${uniquenessId}`,
      "kk": `test_kk${uniquenessId}`,
      "image": `http://www.google${uniquenessId}.com`,
      "comment": `test_comment${uniquenessId}`,
      "arrivalDate": 1478432672913,
      "associatedApplicationId": associatedApplicationId,
      "userCreated": user._id
    };
  }

});