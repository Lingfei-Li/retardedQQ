var messageUtil = {};
module.exports = messageUtil;

var fs = require('fs'),
    moment = require('moment'),
    mkdirp = require('mkdirp'),
    request = require('request'),
    mssql = require('mssql'),
    config = require('config'),
    constants = require('./constants'),
    session = require('./session'),
    service = require('./service'),
    userUtil = require('./userUtil'),
    groupUtil = require('./groupUtil'),
    logger = require('../logger')(__filename)
;

messageUtil.cachedMessages = [];
messageUtil.cachedResponseMsg = [];

messageUtil.getMessageFromData = function(data) {
    if(data['result'] === undefined || data['result'][0] === undefined) return {text:"", messageType:"data error", senderID: -1};
    var content = data['result'][0]['value']['content'];
    var messageType = data['result'][0]['poll_type'];
    var senderUIN = data['result'][0]['value']['from_uin'];
    var receiverQQ = data['result'][0]['value']['to_uin'];
    var msgId = data['result'][0]['value']['msg_id'];
    if(messageType !== 'message') {         //group/discussion message
        senderUIN = data['result'][0]['value']['send_uin'];     //for group/discuss message, send_uin is the sender ID. from_uin is group id
    }
    var sendTime = moment(data['result'][0]['value']['time']*1000);
    content = content.map(function(msg){
        if(typeof msg == 'string')
            return msg;
        return null;
    }).filter(function(msg) {
        return msg != null;
    }).reduce(function(prev, curr) {
        return prev+' '+curr;
    }, '');
    var msg = {
        content: content,
        messageType: messageType,
        tempSenderUIN: senderUIN,
        receiverQQ: receiverQQ,
        msgId: msgId,
        senderQQ: "",
        senderNick: "",
        sendTime: sendTime
    };
    messageUtil.classifyMessage(msg);           //classify by customer type: buy, sell, default
    return msg;
};


messageUtil.classifyMessage = function(msg) {
    //better classification algorithms awaits
    var classification = "";
    if(msg.content.indexOf('求购') != -1) {
        classification += "buy ";
    }
    if(msg.content.indexOf('出售') != -1){
        classification += "sell ";
    }
    if(classification === '') { msg.classification = 'default'; }
    else { msg.classification = classification.trim(); }
    userUtil.setUserInfo(msg, function() {
        messageUtil.pushMessageToCache(msg);
        messageUtil.printMessage(msg);

        // var responseMsgContent = '科亿已经收到了您的信息，感谢使用科亿平台。这条消息是自动回复的，' +
        //     '我们正在开发一项新功能，以后会根据您在科亿QQ平台发布的需求，自动给您回复可能感兴趣的信息。' +
        //     '如果自动回复的信息对您造成了不便，请联系科亿总部QQ以关闭这项功能';
        var responseMsgContent = '这条是自动回复，请忽略';
        messageUtil.sendResponseMsg(msg, responseMsgContent);
    });
};


messageUtil.pollMessage = function(processid) {
    if(processid != session.processid) return;
    var retryIntervalMillis = 10 * 1000;
    logger.info('等待消息...');
    var payload = JSON.stringify({
        "ptwebqq": session.ptwebqq,
        "clientid": 53999199,
        "psessionid": session.psessionid,
        "key": ""
    });
    var options = {
        method: 'POST',
        url: constants.POLL_MESSAGE.url,
        jar: session.cookieJar,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': constants.USER_AGENT,
            'Referer': constants.POLL_MESSAGE.referer,
            'Origin': constants.POLL_MESSAGE.origin
        },
        form: {
            'r': payload
        }
    };
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var data = JSON.parse(body);
            if(data['retcode'] == 0) {
                if(data['result'] !== undefined) {
                    messageUtil.getMessageFromData(data);
                }
                messageUtil.pollMessage(processid);
            }
            else if(data['retcode'] == 103) {
                logger.error(__funcln+'请登录网页版qq (w.qq.com)，确认可以接受消息，退出，再运行本程序（接收消息得到retcode=103）');
                session.loginStatus = 103;
            }
            else {
                logger.error(__funcln+'pollMessage失败，retcode: ' + data['retcode'] + ', body: ' + body);
                setTimeout(function(){messageUtil.pollMessage(processid)}, retryIntervalMillis);    //retry after some seconds
            }
        }
        else {
            service.handleErr(error, response, logger, __funcln);
            setTimeout(function(){messageUtil.pollMessage(processid)}, retryIntervalMillis);    //retry after some seconds
        }
    });
};

messageUtil.sendResponseMsg = function(recvMsg, content) {
    if(recvMsg === undefined || content === undefined || content.length == 0) {
        logger.error(__funcln+'自动回复时，recvMsg或者content为空');
        return;
    }
    var responseMsg = {
        content: content,
        sendTime: moment(),
        qqMsgId: recvMsg.msgId,
        toQQ: recvMsg.senderQQ,
        toNick: recvMsg.senderNick,
        fromQQ: recvMsg.receiverQQ,
        fromNick: service.getUsername(),
        type: recvMsg.messageType,
        classification: recvMsg.classification
    };
    messageUtil.sendMsgToUin(content, recvMsg.tempSenderUIN, function(err) {
        if(err) {
            logger.err(__funcln+'自动回复消息发送失败：' + err);
        }
        else {
            logger.info('自动回复消息发送完成');
            messageUtil.pushResponseMsgToCache(responseMsg);
        }
    });
};

messageUtil.sendMsgToQQ = function(content, qq, callback) {
    var uin = userUtil.lookupUinByQQ(qq);
    if(uin) {
        messageUtil.sendMsgToUin(content, uin, callback);
    } else {
        logger.error(__funcln+'发送消息到QQ号'+qq+'失败，无法搜索到对应uin');
        callback('发送消息到QQ号'+qq+'失败，无法搜索到对应uin');
    }
};

messageUtil.sendMsgToUin = function(content, uin, callback) {
    if(content === undefined || uin === undefined || content.length == 0) {
        callback('content或者uin为空');
        return;
    }
    var payload = JSON.stringify({
        "to": uin,
        "content": JSON.stringify([ content, [ "font", { "name": "宋体", "size": 10, "style": [ 0, 0, 0 ], "color": "000000" } ] ]),
        "face": 522,
        "clientid": 53999199,
        "msg_id": 65890001,
        "psessionid": service.getProcessId()
    });
    var options = {
        method: 'POST',
        url: constants.SEND_MESSAGE_TO_FRIEND.url,
        jar: service.getCookieJar(),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': constants.USER_AGENT,
            'Referer': constants.SEND_MESSAGE_TO_FRIEND.referer,
            'Origin': constants.SEND_MESSAGE_TO_FRIEND.origin
        },
        form: {
            'r': payload
        }
    };
    request(options, function (error, response, body) {
        if (!error && (response.statusCode == 200 || response.status == 302 || response.status == 404)) {
            const resData = JSON.parse(body);
            if(resData['errCode'] == 0) {
                callback();
            }
            else if(resData['retcode'] == 1202) {
                logger.warn(__funcln+'发送消息时收到retcode=1202');
                callback();
            }
            else {
                callback(__funcln+'发送消息时发生错误：' + body);
            }
        }
        else {
            service.handleErr(error, response, logger, __funcln);
        }
    });
};

messageUtil.printMessage = function(msg) {
    logger.info('-------------------新消息-------------------');
    logger.info('   消息内容：', msg.content);
    logger.info('   消息类型：', msg.messageType);
    logger.info('   发件人QQ：', msg.senderQQ);
    logger.info('   发件人昵称：', msg.senderNick);
    logger.info('   msgId：', msg.msgId);
    logger.info('   发送时间：', msg.sendTime.format('YYYY-MM-DD h:mm:ss a'));
    logger.info('--------------------------------------------');
};

messageUtil.getCachedMessages = function() {
    return messageUtil.cachedMessages;
};

messageUtil.pushMessageToCache = function(msg) {
    messageUtil.cachedMessages.push(msg);
};

messageUtil.getCachedResponseMsg = function() {
    return messageUtil.cachedResponseMsg;
};

messageUtil.pushResponseMsgToCache = function(responseMsg) {
    messageUtil.cachedResponseMsg.push(responseMsg);
};

messageUtil.deleteMessageFromCache = function(index) {
    if(index >= 0 && index < messageUtil.cachedMessages.length) {
        messageUtil.cachedMessages.splice(index, 1);
    }
    else {
        logger.error(__funcln+'试图从cache中删除消息的index越界');
    }
};

messageUtil.deleteResponseMsgFromCache = function(index) {
    if(index >= 0 && index < messageUtil.cachedResponseMsg.length) {
        messageUtil.cachedResponseMsg.splice(index, 1);
    }
    else {
        logger.error(__funcln+'试图从cache中删除自动回复消息的index越界');
    }
};

messageUtil.clean = function() {
    messageUtil.cachedMessages = [];
    messageUtil.cachedResponseMsg = [];
};
