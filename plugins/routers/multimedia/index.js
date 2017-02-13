'use strict';

// TODO: more generic

KlarkModule(module, 'krkRoutesMultimedia', function(
  q,
  _,
  $fs,
  $multer,
  $crypto,
  $mkdirp,
  krkMiddlewarePermissions,
  krkMiddlewareResponse
) {

  return {
    register: register
  };

  function register(app, config) {
    if (!(app && config && config.apiUrlPrefix && config.apiUrl)) {
      throw new Error('Invalid arguments');
    }
    var upload = $multer(getMulterOptions());

    app.get(
      '/' + config.apiUrlPrefix + '/multimedia/apps/:imageName',
      middlewareServeImageController
    );

    app.post('/' + config.apiUrlPrefix + '/multimedia/upload', [
      krkMiddlewarePermissions.check('USER'),
      middlewareUploadFileController,
      krkMiddlewareResponse.success
    ]);

    function middlewareUploadFileController(req, res, next) {
      const uploadMiddleware = upload.single('image');
      uploadMiddleware(req, res, error => {
        if (error) {
          res.locals.errors.add('INVALID_FILE_TYPE');
          return next(true);
        }
        next();
      });
    }

    app.delete('/' + config.apiUrlPrefix + '/multimedia/upload/:imageName', [
      krkMiddlewarePermissions.check('USER'),
      middlewareDeleteFileController,
      krkMiddlewareResponse.success
    ]);

    function middlewareDeleteFileController(req, res, next) {
      var imageName = req.params.imageName;
      var filepath = getImagePath(imageName);
      if (!filepath) {
        return res.status(404).end();
      }
      q.promisify(function(cb) {
          return $fs.unlink(filepath.path, cb);
        })
        .catch(function() {
          return res.status(404).end();
        })
        .then(function() {
          return res.end();
        });
    }

    function middlewareServeImageController(req, res, next) {
      var imageName = req.params.imageName;
      var filepath = getImagePath(imageName);
      if (!filepath) {
        return res.status(404).end();
      }
      q.promisify(function(cb) {
          return $fs.readFile(filepath.path, cb);
        })
        .then(function(img) {
          res.writeHead(200, {'Content-Type': filepath.contentType});
          res.end(img);
        })
        .catch(function() {
          return res.status(404).end();
        });
    }

    function getImagePath(imageName) {
      var imageParts = _.split(imageName, '_');
      if (imageParts.length !== 3) {
        return;
      }
      var format = imageParts[2].substring(imageParts[2].lastIndexOf('.') + 1);
      var contentType;
      if (format === 'png') {
        contentType = 'image/png';
      } else if (format === 'jpeg') {
        contentType = 'image/jpeg';
      } else if (format === 'pdf') {
        contentType = 'application/pdf';
      } else {
        return;
      }

      var hashedUserId = imageParts[0];
      return {
        path: `uploads/applications/${hashedUserId}/${imageName}`,
        contentType: contentType
      };
    }

    function getMulterOptions() {
      return {
        storage: storage(),
        limits: {
          fileSize: 2 * 1024 * 1024,
          files: 1
        },
        fileFilter
      };

      function fileFilter (req, file, next) {
        var accept = file.mimetype === 'image/png'
          || file.mimetype === 'image/jpeg'
          || file.mimetype === 'application/pdf';

        next(accept ? null : new Error('Invalid type'), true);
      }

      function storage() {
        return $multer.diskStorage({
          destination: function (req, file, next) {
            var userId = req.res.locals.user._id;
            var hashedUserId = userId.substring(userId.length - 8);
            req.res.locals.params.hashedUserId = hashedUserId;
            var dir = 'uploads/applications/' + hashedUserId;
            q.promisify(function(cb) {
                return $mkdirp(dir, cb);
              })
              .catch(function(reason) {
                res.locals.errors.add('UNEXPECTED', reason);
                next(true);
              })
              .then(function() {
                return next(null, dir);
              })
          },
          filename: function (req, file, next) {
            var timestamp = _.now();
            var format = file.mimetype.substring(file.mimetype.lastIndexOf('/') + 1);
            q.promisify(function(cb) {
                return $crypto.randomBytes(16, cb);
              })
              .catch(function(reason) {
                res.locals.errors.add('NOT_ENOUGH_ENTROPY', reason);
                next(true);
              })
              .then(function(token) {
                var imageName = [req.res.locals.params.hashedUserId, '_', token.toString('hex'), '_', timestamp, '.', format].join('');
                var url = [config.apiUrl, '/', config.apiUrlPrefix, '/multimedia/apps/', imageName].join('');
                req.res.locals.data = {url: url};
                next(null, imageName);
              })
            }
        })
      }
    }
  }
});