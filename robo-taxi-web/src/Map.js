import React, { Component } from 'react';
import { GoogleApiWrapper, Map, Marker } from 'google-maps-react';
import mapStyles from './MapStyles';

// eslint-disable-next-line no-undef
const apiKey = process.env.REACT_APP_MAPS_API_KEY;

const center = { lat: 22.3185, lng: 114.1767936 };

class MapWrapper extends Component {
  constructor() {
    super();
    this.state = { rideRequests: [] };
  }

  componentWillMount() {
    // Connect to backend socket sending real time data to front
    const socket = new WebSocket('ws://localhost:8080');
    socket.onmessage = event => {
      const data = JSON.parse(event.data);

      if (data.eventType === 'rideRequest') {
        this.addRideRequest(data);
      }
    };
  }

  // Adds new request for ride to state to add a marker to map
  addRideRequest({ lat, lon }) {
    this.setState({
      rideRequests: this.state.rideRequests.concat([{ lat, lon }]),
    });
  }

  render() {
    return (
      <Map google={this.props.google} initialCenter={center} styles={mapStyles}>
        {this.state.rideRequests.map(r => (
          <Marker key={r.lat} position={{ lat: r.lat, lng: r.lon }} />
        ))}
      </Map>
    );
  }
}

export default GoogleApiWrapper({ apiKey, version: 3.31 })(MapWrapper);
