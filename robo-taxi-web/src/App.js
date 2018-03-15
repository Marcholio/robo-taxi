import React, { Component } from 'react';
import Map from './Map';
import './App.css';

class App extends Component {
  componentWillMount() {
    const socket = new WebSocket('ws://localhost:8080');
    socket.onmessage = event => console.log(JSON.parse(event.data));
  }

  render() {
    return (
      <div className="App">
        <Map />
      </div>
    );
  }
}

export default App;
