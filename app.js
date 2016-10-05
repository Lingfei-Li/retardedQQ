var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var service = require('./service/service');
require('dotenv').config();

var app = express();

app.set('port', (process.env.PORT || 8080));

// app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use("/api", require('./resource/resource'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: {}
  });
});

// Add access to line number and function name
Object.defineProperty(global, '__stack', {
    get: function() {
        var orig = Error.prepareStackTrace;
        Error.prepareStackTrace = function(_, stack) {
            return stack;
        };
        var err = new Error;
        Error.captureStackTrace(err, arguments.callee);
        var stack = err.stack;
        Error.prepareStackTrace = orig;
        return stack;
    }
});
Object.defineProperty(global, '__line', {
  get: function() {
    return __stack[1].getLineNumber() + ' ';
  }
});
Object.defineProperty(global, '__function', {
  get: function() {
    return __stack[1].getFunctionName() + ' ';
  }
});
Object.defineProperty(global, '__funcln', {
    get: function() {
        // return 'at line ' + __stack[1].getLineNumber() + ', func "' + __stack[1].getFunctionName() + '" - ';
        return 'at line ' + __stack[1].getLineNumber()  + ' - ';
    }
});

// Start idiotQQ app
service.startApp();


app.listen(app.get('port'), function() {
    console.log('IdiotQQ is running on port '+ app.get('port') + ', mode:', process.env.NODE_ENV);
});

