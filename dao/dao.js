var request = require('request'),
    mssql = require('mssql'),
    config = require('config'),
    logger = require('../logger')(__filename),
    service = require('../service/service')
;

var dao = {};

module.exports = dao;

const DB_NAME = config.get('db.dbname');
const DB_ADDR = config.get('db.addr');
const DB_USER= config.get('db.user');
const DB_PWD = config.get('db.pwd');
const MSG_TABLE_NAME = config.get('db.msgTableName');
const RSP_TABLE_NAME = config.get('db.responseTableName');

dao.start = function(processid, callback) {
    var config = {
        user: DB_USER,
        password: DB_PWD,
        server: DB_ADDR,
        database: DB_NAME,
        stream: false
    };
    mssql.connect(config, function(err){
        if(err) { logger.error(__funcln + '连接数据库时发生错误：' + err); callback(err); return;}
        dao.scheduleWritingToDBTask(processid);
        logger.info('数据库连接完成。已连接到' + DB_ADDR + '，数据库名称： ' + DB_NAME + '，用户名：'+DB_USER);
        callback(null);
    });
};

dao.scheduleWritingToDBTask = function(processid) {
    if(processid !== service.getProcessId()) return;
    var messages = service.getCachedMessages();
    if(messages.length > 0) {
        messages = dao.mergeLongMessages(messages);
        service.setCachedMessages(messages);
        logger.info('开始将收到的消息插入数据库');
        messages.forEach(function(msg) {
            dao.writeMessageToDB(msg);
        });
    }
    var responseMsg = service.getCachedResponseMsg();
    if(responseMsg.length > 0) {
        logger.info('开始将自动回复的消息插入数据库');
        responseMsg.forEach(function(msg) {
            dao.writeResponseMsgToDB(msg);
        });
    }
    var taskIntervalMillis = 10*1000;
    setTimeout(function(){dao.scheduleWritingToDBTask(processid)}, taskIntervalMillis);
};

dao.mergeLongMessages = function(messages) {
    if(messages.length <= 1) return messages;

    messages.sort(function(lhs, rhs){
        return lhs.msgId - rhs.msgId;
    });

    var tmpMsg = messages[0];
    var mergedMessages = [];
    for(var i = 1; i < messages.length; i ++) {
        if(messages[i].sendTime.isSame(tmpMsg.sendTime)) {  //timestamp used by smartQQ api is in seconds
            tmpMsg.content += messages[i].content;
        }
        else {
            mergedMessages.push(tmpMsg);
            tmpMsg = messages[i];
        }
    }
    mergedMessages.push(tmpMsg);
    return mergedMessages;
};

dao.writeMessageToDB = function(msg) {
    if(msg.content.trim() === "") {
        service.deleteMessageFromCache(msg);
        return;
    }
    const query = `insert into ${MSG_TABLE_NAME} ([content] ,[senderQQ] ,[senderNick] ,[sendTime] ,[type], [username], 
                    [classification], [qqMsgId]) values 
                    ('${msg.content}', '${msg.senderQQ}', '${msg.senderNick}', '${msg.sendTime.format('YYYYMMDD hh:mm:ss a')}', 
                    '${msg.messageType}' ,'${service.getUsername()}', '${msg.classification}', '${msg.msgId}')`;

    new mssql.Request().query(query).then(function (recordset) {
        logger.info('将新消息插入数据库完成');
        service.deleteMessageFromCache(msg);
    }).catch(function (err) {
        if(err) { logger.error(__funcln+'将新消息插入数据库时错误：' + err); }
    });
};

dao.readMessageFromDB = function(limit, offset, callback) {
    if(limit === undefined) limit = 100;
    if(offset === undefined) offset = 0;
    const query = ` SELECT * FROM ${MSG_TABLE_NAME} ORDER BY sendTime DESC OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY `;

    new mssql.Request().query(query).then(function (recordset) {
        logger.info('从数据库读取消息完成');
        callback(null, recordset);
    }).catch(function (err) {
        if(err) {
            logger.error(__funcln+'从数据库读取消息时错误：' + err);
            callback(err, []);
        }
    });
};

dao.countMessageFromDB = function(callback) {
    const resultName = 'cnt';
    const query = ` SELECT COUNT(id) AS ${resultName} FROM ${MSG_TABLE_NAME} `;

    new mssql.Request().query(query).then(function (recordset) {
        logger.info('从数据库读取消息数量完成');
        callback(null, recordset[0]);
    }).catch(function (err) {
        if(err) {
            logger.error(__funcln+'从数据库读取消息数量时错误：' + err);
            callback(err, []);
        }
    });
};

dao.writeResponseMsgToDB = function(responseMsg) {
    if(responseMsg.content.trim() === "") {
        service.deleteResponseMsgFromCache(responseMsg);
        return;
    }
    const query = `insert into ${RSP_TABLE_NAME} ([content] ,[toQQ] ,[toNick], [fromQQ], [fromNick], [sendTime] ,[type],
                    [classification], [qqMsgId]) values
                    ('${responseMsg.content}', '${responseMsg.toQQ}', '${responseMsg.toNick}', '${responseMsg.fromQQ}', '${responseMsg.fromNick}',
                    '${responseMsg.sendTime.format('YYYYMMDD hh:mm:ss a')}', '${responseMsg.type}' ,'${responseMsg.classification}', '${responseMsg.qqMsgId}')`;

    new mssql.Request().query(query).then(function (recordset) {
        logger.info('将自动回复消息插入数据库完成');
        service.deleteResponseMsgFromCache(responseMsg);
    }).catch(function (err) {
        if(err) { logger.error(__funcln+'将自动回复消息插入数据库时错误：' + err); }
    });
};

// Write to db in batch:
// dao.writeMessageToDBBatch = function(messages) {
//
//     var table = new mssql.Table(MSG_TABLE_NAME); // or temporary table, e.g. #temptable
//     table.create = true;
//     table.columns.add('text', mssql.NVarChar(mssql.MAX), {nullable: true});
//     table.columns.add('senderQQ', mssql.NVarChar(50), {nullable: false});
//     table.columns.add('senderNick', mssql.NVarChar(50), {nullable: false});
//     table.columns.add('time', mssql.DateTime, {nullable: false});
//     table.columns.add('type', mssql.NVarChar(50), {nullable: false});
//     table.columns.add('username', mssql.NVarChar(50), {nullable: false});
//
//     var config = {
//         user: DB_USER,
//         password: DB_PWD,
//         server: DB_ADDR,
//         database: DB_NAME,
//         stream: false
//     };
//
//     mssql.connect(config, function(err) {
//         if(err) { logger.error('连接数据库时发生错误：' + err); return; }
//         messages.forEach(function(msg) {
//             table.rows.add(msg.text, msg.senderQQ, msg.senderNick, msg.time.toDate(), msg.messageType, service.getUsername());
//         });
//         var request = new mssql.Request();
//         request.bulk(table, function(err, rowCount) {
//             if(err) { logger.error('插入数据库时错误：' + err); return; }
//         });
//     });
// };

