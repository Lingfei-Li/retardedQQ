var service = {};
module.exports = service;

var moment = require('moment'),
    request = require('request'),
    session = require('./session'),
    constants = require('./constants'),
    messageUtil = require('./messageUtil'),
    groupUtil = require('./groupUtil'),
    userUtil = require('./userUtil'),
    idiotQQ = require('./idiotQQ'),
    dao = require('../dao/dao'),
    logger = require('../logger')(__filename)
    ;

// Session Data
service.getQRloadingCompleted = function() {
    return session.QRloadingCompleted;
};

service.getQR_URL = function() {
    return constants.QR_URL;
};

service.getLoginStatus = function() {
    return session.loginStatus;
};

service.loginCompleted = function() {
    return (session.loginStatus === constants.LOGIN_STATUS_CODE.OK);
};

service.getUsername = function() {
    return session.username;
};

service.getProcessId = function() {
    return session.processid;
};

service.setProcessId = function() {
    return session.processid = moment().format('YYYYMMDDHHmmss');
};

service.resetSession = function() {
    Object.keys(session).forEach(function(key) {
        session[key] = require('./sessionTemplate')[key];
    });
    session.cookieJar = request.jar();
};

service.getPsessionid = function() {
    return session.psessionid;
};

service.getVfwebqq = function() {
    return session.vfwebqq;
};

service.getPtwebqq = function() {
    return session.ptwebqq;
};

service.getUin = function() {
    return session.uin;
};

service.getCookieJar = function() {
    return session.cookieJar;
};

// MessageUtil
service.getCachedMessages = function() {
    return messageUtil.getCachedMessages();
};

service.setCachedMessages = function(messages) {
    messageUtil.cachedMessages = messages;
};

service.getCachedResponseMsg = function() {
    return messageUtil.getCachedResponseMsg();
};

service.deleteMessageFromCache = function(msg) {
    var index = messageUtil.cachedMessages.indexOf(msg);
    if(index != -1) {
        messageUtil.deleteMessageFromCache(index);
    }
    else {
        logger.error('试图从cache中删除不存在的message');
    }
};

service.deleteResponseMsgFromCache = function(responseMsg) {
    var index = messageUtil.cachedResponseMsg.indexOf(responseMsg);
    if(index != -1) {
        messageUtil.deleteResponseMsgFromCache(index);
    }
    else {
        logger.error('试图从cache中删除不存在的response message');
    }
};

service.startPollingMessage = function(processid) {
    messageUtil.pollMessage(processid);
};

service.sendMsgToUin = function(content, uin, callback) {
    messageUtil.sendMsgToUin(content, uin, callback);
};

service.sendMsgToQQ = function(content, qq, callback) {
    messageUtil.sendMsgToQQ(content, qq, callback);
};

// Group Util and User Util
service.initGroupList = function() {
    groupUtil.init();
};

service.initFriendList = function(processid) {
    userUtil.init(processid);
};

service.getFriendList = function() {
    return userUtil.friendList;
};

service.getFriendUinQQMap = function() {
    return userUtil.friendUinQQMap;
};

service.cleanUtil = function() {
    userUtil.clean();
    messageUtil.clean();
    groupUtil.clean();
};

// Database operations
service.getMessagesFromDB = function(limit, offset, callback) {
    if(offset === undefined) offset = 100;
    if(limit === undefined) limit = 100;
    dao.readMessageFromDB(limit, offset, callback);
};

service.getMessagesCountFromDB = function(callback) {
    dao.countMessageFromDB(callback);
};

service.startDAO = function(processid) {
    dao.start(processid, function(err) {
        if(err){
            logger.error('数据库连接失败：' + err);
        }
    })
};

// Request Error handling
service.handleErr = function(error, response, altLogger, funcln) {
    if(altLogger === undefined) altLogger = logger;
    if(funcln === undefined) funcln = '';
    if(error){ altLogger.error('Error: ' + funcln + error); }
    else {
        altLogger.error(funcln + 'Status Code: ' + response.statusCode);
        altLogger.error(response.body);
    }
};

// Starting/restarting the entire app
service.startApp = function() {
    service.resetSession();
    service.cleanUtil();
    idiotQQ.startApp();
};


