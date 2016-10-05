
var userUtil = {};
module.exports = userUtil;

var fs = require('fs'),
    moment = require('moment'),
    mkdirp = require('mkdirp'),
    string_format = require('string-format'),
    request = require('request'),
    mssql = require('mssql'),
    config = require('config'),
    constants = require('./constants'),
    session = require('./session'),
    service = require('./service'),
    messageUtil = require('./messageUtil'),
    hash = require('./hash'),
    logger = require('../logger')(__filename)
;

userUtil.friendList = null;

userUtil.friendQQUinMap = {};

userUtil.friendUinQQMap = {};

userUtil.init = function(processid) {
    userUtil.initFriendList(function(friendList) {
        userUtil.friendList = friendList;
        userUtil.scheduleQQUinMappingTask(processid);
    });
};

// Schedule a periodical update of the friend QQ-uin mapping
userUtil.scheduleQQUinMappingTask = function(processid) {
    if(processid !== service.getProcessId()) return;

    var taskIntervalMillis = 60*60*1000; // prod: 1 hour

    if(userUtil.friendList != null && userUtil.friendList.length > 0) {
        logger.info('开始获取全部好友QQ号');
        var mapCnt = Object.keys(userUtil.friendQQUinMap).length;
        if(mapCnt > 0 && mapCnt < userUtil.friendList.length) {
            logger.warn('获取的QQ号数量小于好友数量，请注意是否有失败的请求');
        }
        userUtil.getUserQQ(userUtil.friendList[0].uin, function(qq) {
            if(!qq || qq.length === 0) {
                logger.info('好友的uin已失效，将重新获取好友列表以及QQ-uin映射');
                userUtil.initFriendList(function(friendList) {
                    userUtil.friendList = friendList;
                    userUtil.friendQQUinMap = {};
                    userUtil.friendUinQQMap = {};
                    taskIntervalMillis = 1000; // retry immediately: 1 second
                });
            }
            else {
                userUtil.friendList.forEach(function(user) {
                    userUtil.mapUserQQToUin(user);
                });
            }
        });
    }

    setTimeout(function(){userUtil.scheduleQQUinMappingTask(processid)}, taskIntervalMillis);
};

// Retrieve qq number for all friends and make a map from qq to uin, then we can send message to a given qq
userUtil.mapUserQQToUin = function (user) {
    userUtil.getUserQQ(user.uin, function(userQQ) {
        user.qq = userQQ;
        userUtil.friendQQUinMap[user.qq] = user.uin;
        userUtil.friendUinQQMap[user.uin] = user.qq;
        var remain = userUtil.friendList.length - Object.keys(userUtil.friendQQUinMap).length;
        if(remain != 0 && remain%5 == 0) {
            logger.info('QQ号获取剩余 '+ remain);
        }
        else if(remain === 0){
            logger.info('全部好友QQ号获取完成');
        }
    });
};

// Retrieve qq number for a given userUin, and call the given callback when finished
userUtil.getUserQQ = function(userUin, callback) {
    var userQQ = "";
    var options = {
        url: string_format(constants.GET_QQ_BY_ID.url, userUin, session.vfwebqq),
        jar: session.cookieJar,
        headers: {
            'User-Agent': constants.USER_AGENT,
            'Referer': constants.GET_QQ_BY_ID.referer
        }
    };
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var data = JSON.parse(body);
            if(data['retcode'] == 100000) {
                logger.warn('获取用户QQ号请求得到了retcode='+data['retcode']);
                callback("");
            }
            else if(data['retcode'] == 100003 ) {
                logger.warn(__funcln+'获取用户QQ号收到retcode=100003，可能因为请求太频繁。几秒种后将重试');
                var retryIntervalMillis = 10*1000;
                setTimeout(function() {
                    userUtil.getUserQQ(userUin, callback);
                }, retryIntervalMillis);
            }
            else if(data['retcode'] != 0) {
                logger.error(__funcln+ '获取用户QQ号请求得到了retcode='+data['retcode'] + 'function将停止运行');
            }
            else {
                userQQ = data['result']['account'];
                callback(userQQ);
            }
        }
        else {
            var errMsg = '用户"'+userUin+'"QQ号请求失败。错误：'+error;
            service.handleErr(errMsg, response, logger, __funcln);
        }
    });
};

// An alias for getUserQQ. called by messageUtil when a new message is received
userUtil.setUserInfo = function(msg, callback) {
    userUtil.getSenderQQ(msg, callback);
};

// Get QQ for the message's sender. When finished, get sender's nick
userUtil.getSenderQQ = function(msg, callback) {
    userUtil.getUserQQ(msg.tempSenderUIN, function(userQQ) {
        msg.senderQQ = userQQ;
        userUtil.getSenderNick(msg, callback);
    });
};

// Get nickname for the message's sender.
userUtil.getSenderNick = function(msg, callback) {
    var senderNick = "";
    var options = {
        url: string_format(constants.GET_FRIEND_INFO.url, msg.tempSenderUIN, session.vfwebqq, session.psessionid),
        jar: session.cookieJar,
        headers: {
            'User-Agent': constants.USER_AGENT,
            'Referer': constants.GET_FRIEND_INFO.referer
        }
    };
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var data = JSON.parse(body);
            if(data['retcode'] == 100000) {
                logger.warn('获取发件人详细信息请求得到了retcode='+data['retcode']);
            }
            else if(data['retcode'] != 0) {
                logger.error(__funcln+'获取发件人详细信息请求得到了retcode='+data['retcode']);
            }
            else {
                if(data['result']['nick'] === undefined) {
                    logger.error(__funcln+'获取发件人详细信息data.result.nick === undefined');
                }
                else {
                    // success
                    senderNick = data['result']['nick'];
                }
            }
            msg.senderNick = senderNick;
            callback();
        }
        else {
            service.handleErr(error, response, logger, __funcln);
        }
    });
};

// Get the friend list from QQ api
userUtil.initFriendList = function(callback) {
    logger.info('开始获取好友列表');
    var payload = JSON.stringify({
        "vfwebqq": service.getVfwebqq(),
        "hash": hash(service.getUin(), service.getPtwebqq())
    });
    var options = {
        method: 'POST',
        url: constants.GET_FRIEND_LIST.url,
        jar: service.getCookieJar(),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': constants.USER_AGENT,
            'Referer': constants.GET_FRIEND_LIST.referer,
            'Origin': constants.GET_FRIEND_LIST.origin
        },
        form: {
            'r': payload
        }
    };

    request(options, function (error, response, body) {
        if (!error && (response.statusCode == 200 || response.status == 302 || response.status == 404)) {
            const resData = JSON.parse(body);
            if(resData['retcode'] == 0) {
                var friendList = resData['result']['info'];
                logger.info('获取好友列表成功。好友数量：' + friendList.length);
                callback(friendList);
            }
            else if(resData['retcode'] == 50){
                logger.error(__funcln+'获取好友列表失败，可能是加密算法失效。' + body);
            }
            else if(resData['retcode'] == 100003){
                logger.warn(__funcln+'获取好友列表收到retcode=100003，可能因为请求太频繁。几秒种后将重试');
                var intervalMillis = 10*1000;
                setTimeout( function(){
                    userUtil.initFriendList(callback);
                }, intervalMillis );
            }
            else {
                logger.error(__funcln+'获取好友列表失败。' + body);
            }
        }
        else {
            service.handleErr(error, response, logger, __funcln);
        }
    });
};

userUtil.lookupUinByQQ = function(qq) {
    return userUtil.friendQQUinMap[qq];
};

userUtil.clean = function() {
    userUtil.friendList = null;
    userUtil.friendQQUinMap = {};
    userUtil.friendUinQQMap = {};
};
