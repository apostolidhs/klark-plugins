'use strict';

// TODO: more generic

KlarkModule(module, 'krkRoutesMultimedia', function(
  $q,
  $_,
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

  function register(app) {
    if (!(app && config && config.apiUrlPrefix && config.apiUrl)) {
      throw new Error('Invalid arguments');
    }
    var upload = $multer(getMulterOptions());

    app.get(
      '/' + config.apiUrlPrefix + 'multimedia/apps/:imageName',
      middlewareServeImageController
    );

    app.post('/' + config.apiUrlPrefix + 'multimedia/upload', [
      middlewarePermissions.check('USER'),
      upload.single('image'),
      middlewareResponse.success
    ]);

    app.delete('/' + config.apiUrlPrefix + 'multimedia/upload/:imageName', [
      middlewarePermissions.check('USER'),
      middlewareDeleteImageController,
      middlewareResponse.success
    ]);
  }

  function middlewareDeleteImageController(req, res, next) {
    var imageName = req.params.imageName;
    var filepath = getImagePath(imageName);
    if (!filepath) {
      return res.status(404).end();
    }
    $q.promisify(function(cb) {
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
    $q.promisify(function(cb) {
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
    var imageParts = $_.split(imageName, '_');
    if (imageParts.length !== 3) {
      return;
    }
    var format = imageParts[2].substring(imageParts[2].lastIndexOf('.') + 1);
    var contentType;
    if (format === 'png') {
      contentType = 'image/png';
    } else if (format === 'jpeg') {
      contentType = 'image/jpeg';
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
        fileSize: 0.6 * 1024 * 1024,
        files: 1
      },
      fileFilter
    };

    function fileFilter (req, file, next) {
      var accept = file.mimetype === 'image/png'
        || file.mimetype === 'image/jpeg';

      next(null, accept);
    }

    function storage() {
      return $multer.diskStorage({
        destination: function (req, file, next) {
          var userId = req.res.locals.user._id;
          var hashedUserId = userId.substring(userId.length - 8);
          req.res.locals.params.hashedUserId = hashedUserId;
          var dir = 'uploads/applications/' + hashedUserId;
          $q.promisify(function(cb) {
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
          var timestamp = $_.now();
          var format = file.mimetype.substring(file.mimetype.lastIndexOf('/') + 1);
          $q.promisify(function(cb) {
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

});