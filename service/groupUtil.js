
var groupUtil = {};
module.exports = groupUtil;

var fs = require('fs'),
    moment = require('moment'),
    mkdirp = require('mkdirp'),
    request = require('request'),
    config = require('config'),
    constants = require('./constants'),
    session = require('./session'),
    service = require('./service'),
    hash = require('./hash'),
    messageUtil = require('./messageUtil'),
    logger = require('../logger')(__filename)
    ;

groupUtil.groupList = [];

groupUtil.init = function() {
    groupUtil.initGroupList();
};

groupUtil.initGroupList = function() {
    logger.info('开始获取群列表');
    var payload = JSON.stringify({
        "vfwebqq": service.getVfwebqq(),
        "hash": hash(service.getUin(), service.getPtwebqq())
    });
    var options = {
        method: 'POST',
        url: constants.GET_GROUP_LIST.url,
        jar: service.getCookieJar(),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': constants.USER_AGENT,
            'Referer': constants.GET_GROUP_LIST.referer,
            'Origin': constants.GET_GROUP_LIST.origin
        },
        form: {
            'r': payload
        }
    };

    request(options, function (error, response, body) {
        if (!error && (response.statusCode == 200 || response.status == 302 || response.status == 404)) {
            const resData = JSON.parse(body);
            if(resData['retcode'] == 0) {
                logger.info('获取群列表成功');
                groupUtil.groupList = resData['result']['gnamelist'];
            }
            else if(resData['retcode'] == 50){
                logger.error(__funcln+'获取群列表失败，可能是加密算法失效。' + body);
            }
            else {
                logger.error(__funcln+'获取群列表失败。' + body);
            }
        }
        else {
            service.handleErr(error, response, logger, __funcln);
        }
    });
};

groupUtil.clean = function() {
    groupUtil.groupList = [];
};