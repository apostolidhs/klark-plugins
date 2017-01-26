# klark plugins

Plugin modules for [KlarkJS](https://github.com/apostolidhs/klark-js)

We are trying to create an ecosystem of utilities and functionalities that improve dramatically the automation of creating a robust API in NodeJS, ExpressJS and [KlarkJS](https://github.com/apostolidhs/klark-js).

<!-- MarkdownTOC depth=4 autolink=true bracket=round -->

- [Install plugins](#install-plugins)
- [Example](#example)
  - [Create a simple CRUD api](#create-a-simple-crud-api)
    - [Unauthorized creation](#unauthorized-creation)
    - [Authorized creation, invalid arguments](#authorized-creation-invalid-arguments)
  - [Create a custom CRUD api](#create-a-custom-crud-api)
- [Plugins](#plugins)
  - [krkCrudGenerator](#krkcrudgenerator)
  - [krkCrudGeneratorUrls](#krkcrudgeneratorurls)
  - [krkDbMongooseBinders](#krkdbmongoosebinders)
  - [krkDbMongooseConnector](#krkdbmongooseconnector)
  - [krkDbMongoosePluginsPassword](#krkdbmongoosepluginspassword)
  - [krkErrors](#krkerrors)
  - [krkGeneratorsCreateUser](#krkgeneratorscreateuser)
  - [krkGeneratorsLogin](#krkgeneratorslogin)
  - [krkLogger](#krklogger)
  - [krkMiddlewareCrudController](#krkmiddlewarecrudcontroller)
  - [krkMiddlewareInitiateResponseParams](#krkmiddlewareinitiateresponseparams)
  - [krkMiddlewareParameterValidator](#krkmiddlewareparametervalidator)
  - [krkMiddlewarePermissionsAuthorizeStrategy](#krkmiddlewarepermissionsauthorizestrategy)
  - [krkMiddlewarePermissions](#krkmiddlewarepermissions)
  - [krkMiddlewarePermissionsRoles](#krkmiddlewarepermissionsroles)
  - [krkMiddlewareResponse](#krkmiddlewareresponse)
  - [krkModelsApp](#krkmodelsapp)
  - [krkModelsUser](#krkmodelsuser)
  - [krkNotificationsEmail](#krknotificationsemail)
  - [krkParameterValidator](#krkparametervalidator)
  - [krkPromiseExtension](#krkpromiseextension)
  - [krkRouter](#krkrouter)
  - [krkRoutesAuthorize](#krkroutesauthorize)
  - [krkRoutersAuthorizeVerifyAccountEmailTmpl](#krkroutersauthorizeverifyaccountemailtmpl)
  - [krkRoutesMultimedia](#krkroutesmultimedia)
  - [krkRoutesServerInfo](#krkroutesserverinfo)
  - [krkRoutesUsers](#krkroutesusers)
  - [krkServer](#krkserver)
  - [krkUtilitiesDate](#krkutilitiesdate)

<!-- /MarkdownTOC -->

The main architecture that came up when we integrate a NodeJS API is the following:

1. Receive request
2. Check permissions
3. Check Parameters
4. Execute the controller
5. Response

Hopefully, express js is organized in [middlewares](http://expressjs.com/en/guide/using-middleware.html).
We created a collection of middlewares and utilities in order to automate the CRUD functionality. The CRUD model is based on the Mongoose models.

## Install plugins

1) In the root project folder install klark-js-plugins

> `npm install --save klark-js-plugins`

2) Open the file that contains the Klark registration code.

```javascript
var modules = `plugins/**/index.js`;
var subModules = `plugins/**/*.module.js`;

// locate the klark plugins inside the node_modules folder
var klarkPlugins = `node_modules/klark-js-plugins/plugins/**/*.js`;

klark.run({
  predicateFilePicker: function() {
    return [
      modules,
      subModules,
      klarkPlugins
    ]
  }
});
```

**Notice**

If you want to include a subset of the plugins, you should include only the corresponding internal dependencies.
Let's assume that we only want to use the `generators/create-user.module.js`. Our configuration should look like this:

```javascript
var modules = `plugins/**/index.js`;
var subModules = `plugins/**/*.module.js`;

// locate only the necessary klark plugins inside the node_modules folder
var klarkPlugins = [
    `node_modules/klark-js-plugins/plugins/generators/create-user.module.js`,
    `node_modules/klark-js-plugins/plugins/models/user/index.js`
  ];

klark.run({
  predicateFilePicker: function() {
    return [
      modules,
      subModules,
      klarkPlugins
    ]
  }
});

```


## Example

Considering the following mongoose model:

```javascript
var todoSchema = new $mongoose.Schema({
  content: {type: String, maxlength: [16], required: true}
});
var todoModel = $mongoose.model('Todo', schema);
```

### Create a simple CRUD api

[krkCrudGenerator](#krkCrudGenerator) creates and registers the CRUD functionality for a mongoose model.

```javascript
KlarkModule(module, 'createSimpleTodoApi', function(krkCrudGenerator) {
  var app = // express app

  krkCrudGenerator(app, todoModel, {
    apiUrlPrefix: 'v1'
  });
});
```

#### Unauthorized creation

**Request**
```json
POST http://.../v1/todo
{
  "content": "hi"
}
```

**Response**
```json
401
{
  "code": 4001,
  "msg": "unauthorized user"
}
```

#### Authorized creation, invalid arguments

**Request**
```json
HEADER Authorization: JWT ...
POST http://.../v1/todo
{
  "content": "hiiiiiiiiiiiiiiii"
}
```

**Response**
```json
400
{
  "code": 1003,
  "msg": "invalid params, 'content' length"
}
```

### Create a custom CRUD api

```javascript
KlarkModule(module, 'createCustomTodoApi', function(krkCrudGenerator) {
  var app = // express app

  app.get(crudUrls.retrieveAll('Application'), [
    // everybody can access this route
    krkMiddlewarePermissions.check('FREE'),
    // check and sanitize all the necessary arguments like page, count etc
    krkMiddlewareParameterValidator.crud.retrieveAll(modelsApplication),
    // retrieves the records from the MongoDB
    middlewareRetrieveAllController,
    // response
    krkMiddlewareResponse.success
  ]);
});
```

## Plugins

### krkCrudGenerator

**Name:** krkCrudGenerator

**Path:** `/plugins/crud-generator/index.js`

**Dependencies:** [lodash](https://www.npmjs.com/package/lodash), [krkMiddlewareParameterValidator](#krkMiddlewareParameterValidator), [krkMiddlewarePermissions](#krkMiddlewarePermissions), [krkMiddlewareCrudController](#krkMiddlewareCrudController), [krkMiddlewareResponse](#krkMiddlewareResponse), [krkCrudGeneratorUrls](#krkCrudGeneratorUrls)

---

### krkCrudGeneratorUrls

**Name:** krkCrudGeneratorUrls

**Path:** `/plugins/crud-generator/urls.module.js`

---

### krkDbMongooseBinders

**Name:** krkDbMongooseBinders

**Path:** `/plugins/db/mongoose-binders/index.js`

**Dependencies:** [lodash](https://www.npmjs.com/package/lodash), [mongoose](https://www.npmjs.com/package/mongoose), [krkLogger](#krkLogger), [krkModelsApp](#krkModelsApp)

---

### krkDbMongooseConnector

**Name:** krkDbMongooseConnector

**Path:** `/plugins/db/mongoose-connector/index.js`

**Dependencies:** [q](https://www.npmjs.com/package/q), [mongoose](https://www.npmjs.com/package/mongoose), [krkLogger](#krkLogger)

---

### krkDbMongoosePluginsPassword

**Name:** krkDbMongoosePluginsPassword

**Path:** `/plugins/db/mongoose-plugins/password.module.js`

**Dependencies:** [lodash](https://www.npmjs.com/package/lodash), [q](https://www.npmjs.com/package/q), [bcrypt](https://www.npmjs.com/package/bcrypt), [krkLogger](#krkLogger)

---

### krkErrors

**Name:** krkErrors

**Path:** `/plugins/errors/index.js`

**Dependencies:** [lodash](https://www.npmjs.com/package/lodash), [krkLogger](#krkLogger)

---

### krkGeneratorsCreateUser

**Name:** krkGeneratorsCreateUser

**Path:** `/plugins/generators/create-user.module.js`

**Dependencies:** [mongoose](https://www.npmjs.com/package/mongoose), [krkModelsUser](#krkModelsUser)

---

### krkGeneratorsLogin

**Name:** krkGeneratorsLogin

**Path:** `/plugins/generators/login.module.js`

**Dependencies:** [krkMiddlewarePermissions](#krkMiddlewarePermissions)

---

### krkLogger

**Name:** krkLogger

**Path:** `/plugins/logger/index.js`

---

### krkMiddlewareCrudController

**Name:** krkMiddlewareCrudController

**Path:** `/plugins/middleware/crud-controller/index.js`

**Dependencies:** [lodash](https://www.npmjs.com/package/lodash), [q](https://www.npmjs.com/package/q), [krkDbMongooseBinders](#krkDbMongooseBinders)

---

### krkMiddlewareInitiateResponseParams

**Name:** krkMiddlewareInitiateResponseParams

**Path:** `/plugins/middleware/initiate-response-params/index.js`

**Dependencies:** [lodash](https://www.npmjs.com/package/lodash), [krkLogger](#krkLogger), [krkErrors](#krkErrors)

---

### krkMiddlewareParameterValidator

**Name:** krkMiddlewareParameterValidator

**Path:** `/plugins/middleware/parameter-validator/index.js`

**Dependencies:** [q](https://www.npmjs.com/package/q), [lodash](https://www.npmjs.com/package/lodash), [krkParameterValidator](#krkParameterValidator)

---

### krkMiddlewarePermissionsAuthorizeStrategy

**Name:** krkMiddlewarePermissionsAuthorizeStrategy

**Path:** `/plugins/middleware/permissions/authorize-strategy.module.js`

**Dependencies:** [lodash](https://www.npmjs.com/package/lodash), [passport-jwt](https://www.npmjs.com/package/passport-jwt), [krkModelsUser](#krkModelsUser)

---

### krkMiddlewarePermissions

**Name:** krkMiddlewarePermissions

**Path:** `/plugins/middleware/permissions/index.js`

**Dependencies:** [lodash](https://www.npmjs.com/package/lodash), [passport](https://www.npmjs.com/package/passport), [jwt-simple](https://www.npmjs.com/package/jwt-simple), [krkLogger](#krkLogger), [krkMiddlewarePermissionsRoles](#krkMiddlewarePermissionsRoles)

---

### krkMiddlewarePermissionsRoles

**Name:** krkMiddlewarePermissionsRoles

**Path:** `/plugins/middleware/permissions/roles.module.js`

---

### krkMiddlewareResponse

**Name:** krkMiddlewareResponse

**Path:** `/plugins/middleware/response/index.js`

**Dependencies:** [lodash](https://www.npmjs.com/package/lodash)

---

### krkModelsApp

**Name:** krkModelsApp

**Path:** `/plugins/models/app/index.js`

**Dependencies:** [mongoose](https://www.npmjs.com/package/mongoose)

---

### krkModelsUser

**Name:** krkModelsUser

**Path:** `/plugins/models/user/index.js`

**Dependencies:** [lodash](https://www.npmjs.com/package/lodash), [q](https://www.npmjs.com/package/q), [mongoose](https://www.npmjs.com/package/mongoose), [mongoose-type-email](https://www.npmjs.com/package/mongoose-type-email), [mongoose-createdmodified](https://www.npmjs.com/package/mongoose-createdmodified), [krkMiddlewarePermissionsRoles](#krkMiddlewarePermissionsRoles), [krkDbMongoosePluginsPassword](#krkDbMongoosePluginsPassword)

---

### krkNotificationsEmail

**Name:** krkNotificationsEmail

**Path:** `/plugins/notifications/email.module.js`

**Dependencies:** [lodash](https://www.npmjs.com/package/lodash), [q](https://www.npmjs.com/package/q), [nodemailer](https://www.npmjs.com/package/nodemailer)

---

### krkParameterValidator

**Name:** krkParameterValidator

**Path:** `/plugins/parameter-validator/index.js`

**Dependencies:** [q](https://www.npmjs.com/package/q), [lodash](https://www.npmjs.com/package/lodash), [express-validator](https://www.npmjs.com/package/express-validator)

---

### krkPromiseExtension

**Name:** krkPromiseExtension

**Path:** `/plugins/promise-extension/index.js`

**Dependencies:** [lodash](https://www.npmjs.com/package/lodash)

---

### krkRouter

**Name:** krkRouter

**Path:** `/plugins/router/index.js`

**Dependencies:** [express](https://www.npmjs.com/package/express)

---

### krkRoutesAuthorize

**Name:** krkRoutesAuthorize

**Path:** `/plugins/routers/authorize/index.js`

**Dependencies:** [lodash](https://www.npmjs.com/package/lodash), [q](https://www.npmjs.com/package/q), [crypto](https://www.npmjs.com/package/crypto), [krkLogger](#krkLogger), [krkDbMongooseBinders](#krkDbMongooseBinders), [krkRoutersAuthorizeVerifyAccountEmailTmpl](#krkRoutersAuthorizeVerifyAccountEmailTmpl), [krkNotificationsEmail](#krkNotificationsEmail), [krkMiddlewareResponse](#krkMiddlewareResponse), [krkParameterValidator](#krkParameterValidator), [krkMiddlewarePermissions](#krkMiddlewarePermissions), [krkModelsUser](#krkModelsUser)

---

### krkRoutersAuthorizeVerifyAccountEmailTmpl

**Name:** krkRoutersAuthorizeVerifyAccountEmailTmpl

**Path:** `/plugins/routers/authorize/verify-account-email-tmpl.module.js`

**Dependencies:** [config](#config)

---

### krkRoutesMultimedia

**Name:** krkRoutesMultimedia

**Path:** `/plugins/routers/multimedia/index.js`

**Dependencies:** [q](https://www.npmjs.com/package/q), [lodash](https://www.npmjs.com/package/lodash), [fs](https://www.npmjs.com/package/fs), [multer](https://www.npmjs.com/package/multer), [crypto](https://www.npmjs.com/package/crypto), [mkdirp](https://www.npmjs.com/package/mkdirp), [krkMiddlewarePermissions](#krkMiddlewarePermissions), [krkMiddlewareResponse](#krkMiddlewareResponse)

---

### krkRoutesServerInfo

**Name:** krkRoutesServerInfo

**Path:** `/plugins/routers/server-info/index.js`

**Dependencies:** [krkMiddlewareResponse](#krkMiddlewareResponse)

---

### krkRoutesUsers

**Name:** krkRoutesUsers

**Path:** `/plugins/routers/users/index.js`

**Dependencies:** [crypto](https://www.npmjs.com/package/crypto), [q](https://www.npmjs.com/package/q), [lodash](https://www.npmjs.com/package/lodash), [krkModelsUser](#krkModelsUser), [krkRoutersAuthorizeVerifyAccountEmailTmpl](#krkRoutersAuthorizeVerifyAccountEmailTmpl), [krkParameterValidator](#krkParameterValidator), [krkNotificationsEmail](#krkNotificationsEmail), [krkMiddlewareResponse](#krkMiddlewareResponse), [krkMiddlewareCrudController](#krkMiddlewareCrudController), [krkMiddlewarePermissions](#krkMiddlewarePermissions)

---

### krkServer

**Name:** krkServer

**Path:** `/plugins/server/index.js`

**Dependencies:** [http](https://www.npmjs.com/package/http), [krkLogger](#krkLogger)

---

### krkUtilitiesDate

**Name:** krkUtilitiesDate

**Path:** `/plugins/utilities/date.module.js`

**Dependencies:** [lodash](https://www.npmjs.com/package/lodash), [moment](https://www.npmjs.com/package/moment)
