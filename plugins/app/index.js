/* jshint esversion:6, node:true  */

'use strict';

KlarkModule(module, 'app', (
  $_,
  $q,
  $express,
  $path,
  $serveFavicon,
  $expressValidator,
  $bodyParser,
  $cookieParser,
  $morgan,
  $mongoose,
  $passport,
  $helmet,
  $moment,
  config,
  promiseExtension,
  middlewarePermissionsAuthorizeStrategy,
  router,
  dbMongooseConnector,
  middlewareInitiateResponseParams,
  middlewareResponse,
  routesServerInfo,
  routesAuthorize,
  routesApplications,
  routesStatics,
  routesMultimedia,
  routesUsers,
  periodicalProcessJobAlerts
) => {

  return {
    create
  };

  function create() {
    $moment.locale('el');
    promiseExtension.extend($q);
    dbMongooseConnector.connect();
    middlewarePermissionsAuthorizeStrategy.register($passport);

    return createApp();
  }

  function createApp() {
    const app = $express();

    app.use(allowCrossDomain);
    if (config.RUN_MODE === 'dist') {
      app.use($helmet());
    }
    app.use(middlewareInitiateResponseParams);

    app.use($morgan('dev'));
    app.use($bodyParser.json());
    app.use($bodyParser.urlencoded({ extended: false }));
    app.use($expressValidator());
    app.use($cookieParser());
    app.use($express.static($path.join(__dirname, '../../', 'public')));

    routesServerInfo.register(app);
    routesAuthorize.register(app);
    routesApplications.register(app);
    routesStatics.register(app);
    routesMultimedia.register(app);
    routesUsers.register(app);

    app.use(router);

    periodicalProcessJobAlerts.start();

    app.use(middlewareResponse.fail);

    return app;
  }

  function allowCrossDomain(req, res, next) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH');
      res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');

      next();
  }

});
