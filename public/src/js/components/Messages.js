
import React from "react"
import * as axios from "axios"
import moment from "moment"
import uuid from 'uuid'



export default class Messages extends React.Component {
    
    constructor(){
        super();
        this.state = {
            'messages': [],
            'messagesCount': 0
        };
    }

    componentDidMount() {
        this.getMessagesFromDB();
        this.getMessagesCountFromDB();
    }

    getMessagesFromDB() {
        var limit = this.props.location.query['limit'];
        var offset = this.props.location.query['offset'];
        if(limit === undefined) limit = 100;
        if(offset === undefined) offset = 0;
        axios.get('api/db/messages', {
            params: {
                limit,
                offset
            }
        }).then((res)=>{
            this.setState({'messages': res.data});
        }).catch((res)=>{
            alert(moment().format("MM/DD h:mm a") + ': ' + res);
        });
    }

    getMessagesCountFromDB() {
        axios.get('api/db/messagescount').then((res)=>{
            var messagesCount = res.data['cnt'];
            this.setState({messagesCount})
        }).catch((res)=>{
            alert(moment().format("MM/DD h:mm a") + ': ' + res);
        });

    }

    render(){
        var messageComponents = this.state.messages.map((msg, index)=>{
            return (
                <div key={uuid.v1()}>
                    <div>{index}:</div>
                    <div className="message">
                        <div>
                            内容：{msg.content}
                        </div>
                        <div>
                            QQ: {msg.senderQQ}
                        </div>
                        <div>
                            昵称: {msg.senderNick}
                        </div>
                        <div>
                            分类: {msg.classification}
                        </div>
                        <div>
                            时间: {moment(msg.sendTime).format("YYYY-MM-DD h:mm a")}
                        </div>
                    </div>
                </div>
            );
        });
        return(
            <div>
                <h2> hello idiot messages</h2>
                <h3>数据库中共有{this.state.messagesCount}条信息</h3>
                {messageComponents}
            </div>
        );
    };
}