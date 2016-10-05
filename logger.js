var constants = require('./service/constants');
var winston = require('winston') ;

var logger = function(scriptName) {
    if(scriptName === undefined) scriptName = '';
    if(scriptName.indexOf('/') != -1 || scriptName.indexOf('\\') != -1) {
        scriptName = require('path').basename(scriptName);
    }
    return new (winston.Logger)({
        transports: [
            new (winston.transports.Console)({
                level: 'info',
                formatter: function(options) {
                    return options.level.toUpperCase() +': '+ scriptName + ' - ' + (undefined !== options.message ? options.message : '') +
                        (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
                }
            })
        ]
    });
};


module.exports = logger;