

var express = require('express');
var router = express.Router();
var service = require('../service/service');
var constants = require('../service/constants');

router.get('/login', function(req, res) {
    if(service.getQRloadingCompleted()) {
        res.json({
            'retcode':0, 
            'QR_URL':service.getQR_URL(),
            'loginStatus': service.getLoginStatus(),
            'username': service.getUsername()
        });
    }
    else {
        res.json({'retcode':1, 'err':'二维码还未准备好'});
    }
});

router.get('/messages', function(req, res) {
    var loginStatus = service.getLoginStatus();
    if(loginStatus == constants.LOGIN_STATUS_CODE.OK) {
        var messages = service.getCachedMessages();
        res.json({'retcode':0, messages});
    }
    else if(loginStatus == constants.LOGIN_STATUS_CODE.NOT_LOGGED_IN){
        res.json({'retcode':1, 'err':'还未登录'});
    }
    else if(loginStatus == constants.LOGIN_STATUS_CODE.ERR_103) {
        res.json({'retcode':103, 'err':'请先登录qq网页版，退出，再登录本软件'});
    }
    else {
        res.json({'retcode':2, 'err':'未知错误'});
    }
});

router.get('/db/messages', function(req, res) {
    var classification = req.query['classification'], limit = req.query['limit'], offset = req.query['offset'];
    if(limit === undefined) limit = 100;
    if(offset === undefined) offset = 0;
    service.getMessagesFromDB(limit, offset, function(err, recordset) {
        if(err) {
            res.status(500).send(err);
        }
        else {
            res.send(recordset);
        }
    })
});

router.get('/db/messagescount', function(req, res) {
    service.getMessagesCountFromDB(function(err, data) {
        if(err) {
            res.status(500).send(err);
        }
        else {
            res.json(data);
        }
    })
});

router.get('/friendlist', function(req, res) {
    var data = {};
    data['friendlist'] = service.getFriendList();
    data['uinqqmap'] = service.getFriendUinQQMap();
    if(data['friendlist'] != null) {
        data['retcode'] = 0;
    }
    else {
        data['retcode'] = 1;
    }
    res.json(data);
});

router.post('/sendmsg', function(req, res) {
    if(service.loginCompleted()) {
        var content = req.body.content;
        var uin = req.body.uin;
        var qq = req.body.qq;
        var callback = function(err) {
            if(err) {
                res.status(500).end('发送QQ消息失败。错误：' + err);
            } else {
                res.json({
                    'retcode': 0,
                    'msg': '发送QQ消息完成'
                });
            }
        };
        if(content && qq) {
            service.sendMsgToQQ(content, qq, callback);
        } else if(content && uin){
            service.sendMsgToUin(content, uin, callback);
        } else {
            res.json({
                'retcode': 1,
                'msg': '待发送的QQ消息内容或目标uin/qq为空'
            });
        }
    } else {
        res.json({
            'retcode': 1,
            'err': '还未登录。登录状态：'+service.getLoginStatus()
        });
    }
});


router.get('/resetSession', function(req, res) {
    service.startApp();
    res.json({'retcode': 0, msg: 'session重置完成'});
});


module.exports = router;
