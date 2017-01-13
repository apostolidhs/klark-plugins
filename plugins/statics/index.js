/* jshint esversion:6, node:true  */

'use strict';

KlarkModule(module, 'statics', ($_, $mongoose) => {
  const applicationJobs = require('../../static-data/application-jobs.json');
  if (!applicationJobs) {
    process.exit(1);
    throw new Error('application-jobs.json in missing from the "/static-data" folder');
  }

  const municipalitiesAttica = require('../../static-data/municipalities-attica.json');
  if (!municipalitiesAttica) {
    process.exit(1);
    throw new Error('municipalities-attica.json in missing from the "/static-data" folder');
  }

  const ak = require('../../static-data/ak.json');
  if (!ak) {
    process.exit(1);
    throw new Error('ak.json in missing from the "/static-data" folder');
  }

  const agents = require('../../static-data/agents.json');
  if (!agents) {
    process.exit(1);
    throw new Error('agents.json in missing from the "/static-data" folder');
  }

  const jobAlerts = require('../../static-data/job-alerts.json');
  if (!jobAlerts) {
    process.exit(1);
    throw new Error('job-alerts in missing from the "/static-data" folder');
  }

  return {
    applicationJobs: {
      jobs: applicationJobs.jobs,
      ids: $_.map(applicationJobs.jobs, 'id'),
      getName,
      isNextOf
    },
    ak,
    municipalitiesAttica,
    agents,
    jobAlerts
  };

  function getName(id) {
    const job = $_.find(applicationJobs.jobs, job => job.id === id);
    return job && job.gr;
  }

  function isNextOf(job, fromJob) {
    const jobIdx = jobs.indexOf(job);
    const fromJobIdx = jobs.indexOf(fromJob);

    if (!fromJob) {
      return job === 'excavation';
    }

    if (fromJob === 'excavation') {
      return jobIdx !== -1;
    }

    if (fromJob === 'networks') {
      return jobIdx > 0;
    }

    if (fromJob === 'overlap') {
      return job === 'overlap';
    }

    return false;
  }
});