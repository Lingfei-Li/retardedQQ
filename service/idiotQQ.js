var idiotQQ = {};
module.exports = idiotQQ;

var logger = require('../logger')(__filename),
    service = require('../service/service')
;

idiotQQ.startApp = function(){
    service.resetSession();
    var processid = service.setProcessId();
    require('./login')(processid);
    service.startDAO(processid);
    checkLogin(processid);
};

var checkLogin = function(processid) {
    if(processid != service.getProcessId()) return;
    if(service.getLoginStatus() == 0)
        setTimeout(function(){checkLogin(processid)}, 1000);
    else{
        logger.info('开始接收消息');
        service.startPollingMessage(processid);
        service.initFriendList(processid);
        service.initGroupList();
    }
};

