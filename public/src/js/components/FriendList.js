
import React from "react"
import * as axios from "axios"
import moment from "moment"
import uuid from 'uuid'



export default class Messages extends React.Component {
    
    constructor(){
        super();
        this.state = {
            friendList: [],
            friendUinQQMap: {}
        };
    }

    componentDidMount() {
        this.getFriendList();
    }

    getFriendList() {
        axios.get('api/friendlist').then((res)=>{
            if(res.data['retcode'] === 0) {
                var friendList = res.data['friendlist'];
                this.setState({friendList});
                var friendUinQQMap = res.data['uinqqmap'];
                this.setState({friendUinQQMap});
            }
            else if(res.data['retcode'] === 1) {
                // friend list not loaded yet
                var intervalMillis = 1000;
                setTimeout(this.getFriendList.bind(this), intervalMillis);
            }
            else {
                alert('获取好友列表失败。服务器响应：' + res);
            }
        }).catch((res)=>{
            alert(moment().format("MM/DD h:mm a") + ': 获取好友列表失败。服务器响应：' + res);
        });
    }

    render(){
        var friendComponents = this.state.friendList.map((friend)=>{
            return (
                <div key={uuid.v1()}>
                    <div className="friend">
                        <div>{friend.nick}</div>
                        <div>QQ号：{this.state.friendUinQQMap[friend.uin]}</div>
                        <div>UIN：{friend.uin}</div>
                    </div>
                </div>
            );
        });
        return(
            <div>
                <h2> hello idiot friends</h2>
                <div>共有{this.state.friendList.length}个好友</div>
                {friendComponents}
            </div>
        );
    };
}