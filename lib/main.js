var express = require('express'),
  async = require('async'),
  compression = require('compression'),
  config = require('config'),

  log = require('./logging'),
  routing = require('./routing'),

  app;

async.waterfall([
  async.apply(log.initialize),
  function (next) {
    log.info('Starting Simple XML Gateway...');

    app = express();
    app.use(compression());
    app.get('/', function (req, res) {
      res.send('Simple XML Gateway')
    });

    log.info('Binding SOAP routes...');
    async.each(config.get('routes'), function (route, cont) {
      routing.bind(route, app, cont);
    }, next);
  },
  function (next) {
    log.info('Starting web server...');
    app.listen(config.get('port'), next);
  }
], function (err) {
  if (err) {
    console.error('There was an error starting the server.');
    console.error(err);
  } else {
    log.info('Simple XML Gateway started.');
  }
});