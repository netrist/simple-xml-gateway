var log = exports,

  _ = require('underscore'),
  async = require('async'),
  winston = require('winston');

log.initialize = function (callback) {
  async.waterfall([
    function (next) {
      winston.remove(winston.transports.Console);
      winston.add(winston.transports.Console, { timestamp: true, colorize: true, level: 'debug'});
      next();
    }
  ], function (err) {
    if (err) {
      console.error('Could not initialize logging!');
    }
    callback(err);
  });
};

log.info = function (data) {
  winston.info(_.isString(data) ? '{' + getCallerFile() + '} ' + data : data);
};

log.error = function (data) {
  if (_.isString(data)) {
    winston.error('{' + getCallerFile() + '} ' + data);
  } else {
    winston.error('Exception in ' + getCallerFile() + ':');
    winston.error(data);
  }
};

log.warn = function (data) {
  winston.warn(_.isString(data) ? '{' + getCallerFile() + '} ' + data : data);
};

log.debug = function (data) {
  winston.debug(_.isString(data) ? '{' + getCallerFile() + '} ' + data : data);
};

function getCallerFile() {
  var originalFunc = Error.prepareStackTrace;

  var callerfile;
  try {
    var err = new Error();
    var currentfile;

    Error.prepareStackTrace = function (err, stack) { return stack; };

    currentfile = err.stack.shift().getFileName();

    while (err.stack.length) {
      callerfile = err.stack.shift().getFileName();

      if(currentfile !== callerfile) break;
    }
  } catch (e) {}

  Error.prepareStackTrace = originalFunc;

  return callerfile.substring(callerfile.lastIndexOf('/') + 1).replace('.js', '');
}