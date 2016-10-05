

var http = require('http') ,
    fs = require('fs') ,
    request = require('request'),
    constants = require('./constants'),
    session = require('./session'),
    service = require('./service'),
    logger = require('../logger')(__filename),
    moment = require('moment'),
    mkdirp = require('mkdirp')
    ;

// step 1: get QR image
var getQR = function(processid){
    logger.info("1. 获取二维码...");
    constants.QR_URL = 'QR/' + moment().format('YYYYMMDDHHmmss') + '.png';
    constants.QR_PATH = 'public/' + constants.QR_URL;
    var options = {
        url: constants.GET_QR_CODE.url,
        jar: session.cookieJar,
        headers: {
            'User-Agent': constants.USER_AGENT
        }
    };

    // delete old QR images
    const QR_dir = 'public/QR/';
    mkdirp(QR_dir, function(err) {
        if(err) {
            logger.error('making directory messages/ failed. Error: ' + err);
            throw err;
        }
        fs.readdirSync(QR_dir).forEach(function(file) {
            fs.unlinkSync(QR_dir+file);
        });

        request(options)
            .on('error', function(err) {
                service.handleErr(err, response, logger);
            })
            .on('response', function(response) {
                setTimeout(function() {
                    session.QRloadingCompleted = true;
                    logger.info('二维码已保存在'+constants.QR_PATH);
                    logger.info("2. 检查二维码状态...");
                    checkQRStatus(processid);
                }, 1000);
            })
            .pipe(fs.createWriteStream(constants.QR_PATH));
    });

};


// step 2: check QR status
var checkQRStatus = function(processid){
    if(processid != session.processid) return;
    var options = {
        url: constants.VERIFY_QR_CODE.url,
        jar: session.cookieJar,
        headers: {
            'User-Agent': constants.USER_AGENT,
            'Referer': constants.VERIFY_QR_CODE.referer
        }
    };
    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            var status = body;
            var sleepIntervalMillis = 1000;
            if(status.indexOf('二维码未失效') != -1) {
                logger.debug('二维码未失效');
                setTimeout(function(){checkQRStatus(processid);}, sleepIntervalMillis);
            }
            else if(status.indexOf('二维码已失效') != -1) {
                logger.warn('二维码已失效，重新获取二维码');
                session.QRloadingCompleted = false;
                getQR(processid);
            }
            else if(status.indexOf('二维码认证中') != -1) {
                logger.debug('二维码认证中');
                setTimeout(function(){checkQRStatus(processid);}, sleepIntervalMillis);
            }
            else {      //QR scanned
                session.ptwebqq = require('cookieparser').parse(getCookieFromResponse(response))['ptwebqq'];
                var bodyParts = body.split(',');
                var username = bodyParts[bodyParts.length-1];
                session.username = username.substring(username.indexOf('\'')+1, username.lastIndexOf('\''));
                logger.info('登录用户名：' + session.username);
                status.split('\',\'').forEach(function(content){
                    if(content.indexOf('http') != -1) {
                        logger.info('二维码验证完成');
                        get_ptwebqq(content);
                    }
                });
            }
        }
        else {
            service.handleErr(error, response, logger);
        }
    }
    request(options, callback);
};

// step 3: ptwebqq
var get_ptwebqq = function(url){
    logger.info("3. 获取ptwebqq...");
    var options = {
        url: url,
        jar: session.cookieJar,
        headers: {
            'User-Agent': constants.USER_AGENT,
        }
    };
    function callback(error, response, body) {
        if ((!error && response.statusCode == 200) || (response !== undefined && response.statusCode == 404 )) {
            get_vfwebqq();
        }
        else {
            service.handleErr(error, response, logger);
        }
    }
    request(options, callback);
};


// step 4: vfwebqq
var get_vfwebqq = function() {
    logger.info("4.获取vfwebqq...");
    var options = {
        url: 'http://s.web2.qq.com/api/getvfwebqq?ptwebqq=' + session.ptwebqq + '&clientid=53999199&psessionid=&t=0.1',
        jar: session.cookieJar,
        headers: {
            'User-Agent': constants.USER_AGENT,
            'Referer': constants.GET_VFWEBQQ.referer
        }
    };

    function callback(error, response, body) {
        if (!error && (response.statusCode == 200 || response.status == 302 || response.status == 404)) {
            logger.debug(JSON.parse(body));
            var data = JSON.parse(body);
            if(data['result'] === undefined || data['result']['vfwebqq'] === undefined) {
                logger.error('vfwebqq.result or vfwebqq.result.vfwebqq is undefined');
            }
            else {
                session.vfwebqq = data['result']['vfwebqq'];
                get_psessionid_uin();
            }
        }
        else {
            service.handleErr(error, response, logger);
        }
    }
    request(options, callback);
};

// step 5: psessionid and uin
var get_psessionid_uin = function() {
    logger.info('5.获取psessionid和uin...');
    var payload = JSON.stringify({
        "ptwebqq": session.ptwebqq,
        "clientid": 53999199,
        "psessionid": "",
        "status": "online"
    });
    var options = {
        method: 'POST',
        url: constants.GET_UIN_AND_PSESSIONID.url,
        jar: session.cookieJar,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': constants.USER_AGENT,
            'Referer': constants.GET_UIN_AND_PSESSIONID.referer,
            'Origin': constants.GET_UIN_AND_PSESSIONID.origin
        },
        form: {
             'r': payload
        }
    };

    function callback(error, response, body) {
        if (!error && (response.statusCode == 200 || response.status == 302 || response.status == 404)) {
            const resData = JSON.parse(body);
            if(resData['retcode'] == 0) {
                session.psessionid = resData['result']['psessionid'];
                session.uin = resData['result']['uin'];
                session.loginStatus = constants.LOGIN_STATUS_CODE.OK;
                logger.info('登陆成功');
            }
            else {
                logger.error(body);
                logger.error('Failed at step 5');
                printAllTokens();
            }
        }
        else {
            service.handleErr(error, response, logger);
        }
    }
    request(options, callback);
};

var printAllTokens = function() {
    logger.info('Dumping info...');
    logger.info('ptwebqq:', ptwebqq);
    logger.info('vfwebqq:', vfwebqq);
    logger.info('psessionid:', psessionid);
    logger.info('uin:', uin);
};

var getCookieFromResponse = function(response) {
    if(response.headers['set-cookie'] === undefined) return "";
    return response.headers['set-cookie'].reduce(function(prev, curr){
        return prev + curr;
    });
};


var login = function(processid){
    getQR(processid);
};

module.exports = login;



