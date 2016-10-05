
import React from "react"
import * as axios from "axios"
import moment from "moment"
import {Link} from "react-router"



export default class Layout extends React.Component {
    
    constructor(){
        super();
        this.state = {
            'QR_URL':'',
            'loginStatus': 0,
            'notice':'',
            'username': '',
            'messages': []
        };
        this.login();
        this.retryIntervalMillis = 1000;
    }

    login() {
        axios.get('api/login').then((res)=>{
            var data = res.data;
            if(data.retcode == 0) { // server side QR loading ok
                // Setting QR
                this.setState({
                    "QR_URL":data.QR_URL    // QR source will be updated if expired
                });

                //Checking login status
                this.setState({
                    'loginStatus': data.loginStatus
                });
                if(data.loginStatus == 1){      //login completed. start receiving message
                    console.log('login status ok');
                    this.setState({
                        'username': data.username,
                        'notice': '登录时间：'+moment().format('h:mm a')
                    });
                    this.receiveMessages();
                }
                else if(data.loginStatus == 103){   //103 error: need to login w.qq.com
                    console.log('login status 103');
                }
                else if(data.loginStatus == 0){     //not logged in yet
                    setTimeout(this.login.bind(this), this.retryIntervalMillis);
                }
                else {                              //unknown error
                    alert(moment().format("MM/DD h:mm a")+': Unknown error api/login. retcode:'+data.retcode+', err:'+data.err);
                }
            }
            else if(data.retcode == 1){ // server QR not loaded
                setTimeout(this.login.bind(this), this.retryIntervalMillis);
                console.log('retcode=1, err:', data.err);
            }
            else {  //unkown error
                alert(moment().format("MM/DD h:mm a")+': Unknown error api/login. retcode:'+data.retcode+', err:'+data.err);
            }
        }).catch((res)=>{
            alert(moment().format("MM/DD h:mm a") + ': ' + res);
        });
    }


    receiveMessages() {
        console.log('receiving messages');
        axios.get('api/messages').then((res)=>{
            var data = res.data;
            if(data.retcode == 0) {
                this.setState({
                    'messages': JSON.stringify(data.messages, null, 2)
                });
                setTimeout(this.receiveMessages.bind(this), this.retryIntervalMillis);
            }
            else if(data.retcode == 1 || data.retcode == 103){
                var notice = '';
                if(data.retcode == 1) {
                    notice = '对话已过期，请重新登录';
                }
                else {
                    notice = '收到103错误，请先登录网页版qq（w.qq.com），退出登录，再使用本程序';
                }
                alert(moment().format("MM/DD h:mm a") + ': ' + notice);
                this.setState({
                    'QR_URL':'',
                    'loginStatus': 0,
                    'username': '',
                    'messages': [],
                    'notice': notice
                });
                this.login();
            }
        }).catch((res)=>{
            alert(moment().format("MM/DD h:mm a") + ': ' + res);
        });
    }
    
    logout() {
        axios.get('api/resetSession').then((res)=>{
            this.setState({
                'QR_URL':'',
                'loginStatus': 0,
                'username': '',
                'messages': [],
                'notice': ''
            });

            var data = res.data;
            if(data.retcode == 0) {
                this.login();
            }
            else {
                console.log('Error reset session: ', res);
            }
        }).catch((res)=>{
            alert(moment().format("MM/DD h:mm a") + ': ' + res);
        });
    }

    render(){
        return(
            <div>
                <h2> hello idiot </h2>
                <div>
                    <div> <Link to="/messages">查看所有采集的消息</Link> </div>
                    <div> <Link to="/friends">查看好友列表</Link> </div>
                </div>
                <div>
                    <img src={this.state.QR_URL} className={(this.state.loginStatus==0) ? null:'hidden' } />
                </div>
                <div>
                    在这里显示的是未插入数据库的消息。数据库操作每10秒钟进行一次，插入完毕后，这里的消息将消失
                </div>
                <div>
                    {this.state.loginStatus}
                    {this.state.username}
                    {this.state.notice}
                </div>
                <div>
                    <button className="btn btn-sm btn-default" onClick={this.logout.bind(this)}>退出</button>
                </div>
                <div>
                    <pre>{this.state.messages}</pre>
                </div>
            </div>
        );
    };
}