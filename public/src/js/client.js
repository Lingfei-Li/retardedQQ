import React from "react"
import ReactDom from "react-dom"
import Home from "./components/Home"
import Root from "./Root"
import Messages from "./components/Messages"
import FriendList from "./components/FriendList"
import { Router, IndexRoute, Route, hashHistory } from 'react-router'



const app = document.getElementById("app");


ReactDom.render(
    <Router history={hashHistory}>
        <Route path="/" component={Root}>
            <IndexRoute component={Home} />
            <Route path="/messages" component={Messages}/>
            <Route path="/friends" component={FriendList}/>
        </Route>
    </Router>
, app );
