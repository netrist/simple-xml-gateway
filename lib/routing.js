//process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
//process.chdir(directory);

var routing = exports,

  fs = require('fs'),
  async = require('async'),
  xsd = require('libxml-xsd'),
  libxslt = require('libxslt'),
  _ = require('underscore'),
  request = require('request'),
  middleware = require('./middleware'),
  log = require('./logging');

routing.bind = function (routeDefinition, app, callback) {
  log.info('Binding ' + routeDefinition.path);

  app.post('/' + routeDefinition.path, function (req, res) {
    var body = '';
    req.on('data', function (data) {
      body += data;
    });
    req.on('end', function () {
      var route;
      async.waterfall([
        // Find route definition for SOAP Action if necessary
        function (next) {
          var i;
          if (routeDefinition.soapActions && routeDefinition.soapActions.length > 0) {
            var routeFound = false;
            for (i = 0; i < routeDefinition.soapActions.length; i++) {
              if (routeDefinition.soapActions[i].action === req.headers.soapaction) {
                route = routeDefinition.soapActions[i];
                routeFound = true;
                log.debug('Found corresponding route for SOAP Action ' + req.headers.soapaction);
                break;
              }
            }
            if(routeFound == false){
              route = routeDefinition.default;
            }
          } else {
            route = routeDefinition.default;
          }

          if (route) {
            next();
          } else {
            next(new Error('No route found for the specified SOAP action!'));
          }
        },

        // Create response and send outbound request in parallel
        function (next) {
          routing.validateRequest(route, body, next);
        },

        // Pipe request
        function (validationFault, next) {
          if (validationFault) {
            next(null, {
              validationFault: validationFault
            });
          } else {
            log.info('Sending request to pipeline');
            routing.pipeRequest(route, body, req.headers, next);
          }
        }
      ], function (err, result) {
        if (err) {
          res.send(routing.generateSoapFault('Server', err.message));
        } else {
          res.send(result.validationFault || result.responseBody);
        }
      });
    });
  });

  callback();
};

routing.validateRequest = function (route, body, callback) {
  var validationErrors = [];
  async.waterfall([

    // Validate against SOAP Envelope schema
    function (next) {
      if (route.validate.envelope) {
        routing.validateBody(body, __dirname + '/../schemas/SOAP/SoapEnvelope.xsd', next);
      } else {
        next(null, []);
      }
    },

    // Handle errors and strip SOAP envelope
    function (errors, next) {
      // Add SOAP Envelope errors
      if(errors) {
        validationErrors = validationErrors.concat(errors);
      }

      // Strip SOAP Envelope
      routing.transform(body, __dirname + '/../schemas/gateway-transforms/removeSoap.xslt', next);
    },

    // Validate result
    function (strippedBody, next) {
      // Validate against specified schema
      if (route.validate.schema) {
        routing.validateBody(strippedBody, route.validate.schemaPath, next);
      } else {
        next(null, []);
      }
    },

    // Handle errors and generate SOAP fault
    function (errors, next) {
      // Add specific schema errors
      if (errors) {
        validationErrors = validationErrors.concat(errors);
      }

      // Create SOAP Fault from errors
      if (validationErrors.length > 0) {
        next(null, routing.generateSoapFault('Client', validationErrors));
      } else {
        next(null, null);
      }
    }
  ], callback);
};

routing.pipeRequest = function (route, body, requestHeaders, callback) {

  async.waterfall([function(next) {
    var data = [];
    data.body = body;
    log.debug("PIPELINE COUNT: " + route.pipelines.length);
    data.requestHeaders = requestHeaders;
    try {
      for (var i = 0; i < route.pipelines.length; i++) {
        log.debug("Running pipeline " + route.pipelines[i].pipelineName + " to the pipeline list.");
        var pipelineInstance = middleware[route.pipelines[i].moduleName];
        pipelineInstance.configureOptions(route.pipelines[i].defaults);
        log.debug("Loaded pipeline " + route.pipelines[i].pipelineName);
        data = pipelineInstance.process(data, next);
      }
      next(null, data);
    } catch (ex) {
      next(ex);
    }
  }, function(data, next){

    // TODO: gzip encoding is not working even with compression middleware
    data.requestHeaders['accept-encoding'] = 'text/*';

    data.requestHeaders['content-length'] = data.body.length;
    for (var key in data.requestHeaders) {
      log.debug("Request Header " + key + ": " + data.requestHeaders[key]);
    }

    log.debug("Sending request body: " + data.body);
    log.info('Sending request to ' + route.pipe.url);
    request({
      url: route.pipe.url,
      method: 'POST',
      timeout: 30000,
      headers: data.requestHeaders,
      body: data.body
    }, next);

  }], function (err, response, responseBody) {
    if (err) {
      log.error('Could not pipe request to outbound host!');
      log.error(err);
    } else {
      log.info('Successfully piped request to outbound host.');
      log.debug(responseBody);
    }
    callback(null, {
      responseBody: responseBody
    });
  });
};

routing.transform = function (body, schemaPath, callback) {
  try {
    var stylesheet = libxslt.parse(fs.readFileSync(schemaPath, {encoding: 'utf-8'}));
    log.info("Transforming request body with " + schemaPath);
    //use asynchronously
    stylesheet.apply(body, null, callback);
  } catch (ex) {
    callback(ex);
  }
};

routing.validateBody = function (body, schemaPath, next) {
  async.waterfall([
    async.apply(xsd.parseFile, schemaPath),
    function (schema, next) {
      schema.validate(body, next);
    }
  ], next);
};

routing.generateSoapFault = function (code, message){
  return '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
    '<soap:Body>' +
      '<soap:Fault>' +
        '<faultcode>soap:' + code + '</faultcode>' +
        '<faultstring>' + (_.isArray(message) ? message.join('\n') : message) + '</faultstring>' +
      '</soap:Fault>' +
    '</soap:Body>' +
  '</soap:Envelope>';
};