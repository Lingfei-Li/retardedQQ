


module.exports = {
    // login
    "GET_QR_CODE": {
        "url": "https://ssl.ptlogin2.qq.com/ptqrshow?appid=501004106&e=0&l=M&s=5&d=72&v=4&t=0.1",
        "referer": ""
    },
    "VERIFY_QR_CODE":{
        "url":
            "https://ssl.ptlogin2.qq.com/ptqrlogin?" +
            "webqq_type=10&remember_uin=1&login2qq=1&aid=501004106&" +
            "u1=http%3A%2F%2Fw.qq.com%2Fproxy.html%3Flogin2qq%3D1%26webqq_type%3D10&" +
            "ptredirect=0&ptlang=2052&daid=164&from_ui=1&pttype=1&dumy=&fp=loginerroralert&" +
            "action=0-0-157510&mibao_css=m_webqq&t=1&g=1&js_type=0&js_ver=10143&login_sig=&pt_randsalt=0",
        "referer":
            "https://ui.ptlogin2.qq.com/cgi-bin/login?" +
            "daid=164&target=self&style=16&mibao_css=m_webqq&appid=501004106&enable_qlogin=0&no_verifyimg=1&" +
            "s_url=http%3A%2F%2Fw.qq.com%2Fproxy.html&f_url=loginerroralert&strong_login=1&login_state=10&t=20131024001"
    },
    "GET_PTWEBQQ":{
        "url": "{0}",
        "referer": "http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1"
    },
    "GET_VFWEBQQ":{
        "url": "http://s.web2.qq.com/api/getvfwebqq?ptwebqq={0}&clientid=53999199&psessionid=&t=0.1",
        "referer": "http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1"
    },
    "GET_UIN_AND_PSESSIONID":{
        "url": "http://d1.web2.qq.com/channel/login2",
        "referer": "http://d1.web2.qq.com/proxy.html?v=20151105001&callback=1&id=2",
        "origin": "http://d1.web2.qq.com"
    },
    // list
    "GET_FRIEND_LIST":{
        "url":"http://s.web2.qq.com/api/get_user_friends2",
        "referer":"http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1",
        "origin":"http://s.web2.qq.com"
    },
    "GET_GROUP_LIST":{
        "url":"http://s.web2.qq.com/api/get_group_name_list_mask2",
        "referer":"http://d1.web2.qq.com/proxy.html?v=20151105001&callback=1&id=2",
        "origin":"http://s.web2.qq.com"
    },
    // receiving msg
    "POLL_MESSAGE": {
        "url":"http://d1.web2.qq.com/channel/poll2",
        "referer":"http://d1.web2.qq.com/proxy.html?v=20151105001&callback=1&id=2",
        "origin":"http://d1.web2.qq.com"
    },
    // send msg
    "SEND_MESSAGE_TO_GROUP": {
        "url":"http://d1.web2.qq.com/channel/send_qun_msg2",
        "referer":"http://d1.web2.qq.com/proxy.html?v=20151105001&callback=1&id=2"
    },
    "SEND_MESSAGE_TO_FRIEND":{
        "url": "http://d1.web2.qq.com/channel/send_buddy_msg2",
        "referer": "http://d1.web2.qq.com/proxy.html?v=20151105001&callback=1&id=2",
        "origin":"http://d1.web2.qq.com"
    },
    // get user/group info
    "GET_QQ_BY_ID":{
        "url":"http://s.web2.qq.com/api/get_friend_uin2?tuin={}&type=1&vfwebqq={}&t=0.1",
        "referer":"http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1"
    },
    "GET_FRIEND_INFO":{
        "url":"http://s.web2.qq.com/api/get_friend_info2?tuin={}&vfwebqq={}&clientid=53999199&psessionid={}&t=0.1",
        "referer":"http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1"
    },

    "USER_AGENT": "Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.101 Safari/537.36",
    "SESSIONDATA_PATH": "sessionData.json",
    "QR_PATH":"public/QR.png",
    "QR_URL":"QR.png",
    "LOG_FILENAME": "log.txt",
    "LOGIN_STATUS_CODE": {
        "NOT_LOGGED_IN":0,
        "OK": 1,
        "ERR_103": 103
    }
};

