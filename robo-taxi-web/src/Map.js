import React, { Component } from 'react';
import { GoogleApiWrapper, Map, Marker } from 'google-maps-react';
import mapStyles from './MapStyles';
import customerIcon from './icons/customer.png';
import carAvailableIcon from './icons/car_free.png';
import carReservedIcon from './icons/car_reserved.png';

// eslint-disable-next-line no-undef
const apiKey = process.env.REACT_APP_MAPS_API_KEY;

const center = { lat: 22.3185, lng: 114.1767936 };

class MapWrapper extends Component {
  constructor() {
    super();
    this.state = { rideRequests: [], cars: [] };
  }

  componentWillMount() {
    // Connect to backend socket sending real time data to front
    const socket = new WebSocket('ws://localhost:8080');
    socket.onmessage = event => {
      const data = JSON.parse(event.data);

      if (data.eventType === 'rideRequest') {
        this.addRideRequest(data);
      } else if (data.eventType === 'initialCars') {
        this.setState({ cars: data.cars });
      }
    };
  }

  // Adds new request for ride to state to add a marker to map
  addRideRequest(data) {
    this.setState({
      rideRequests: this.state.rideRequests.concat([data]),
    });
  }

  render() {
    return this.props.google ? (
      <Map google={this.props.google} initialCenter={center} styles={mapStyles}>
        {this.state.rideRequests.map(r => (
          <Marker
            key={r.from.lat}
            position={{ lat: r.from.lat, lng: r.from.lon }}
            icon={{
              url: customerIcon,
              anchor: new this.props.google.maps.Point(8, 8),
              scaledSize: new this.props.google.maps.Size(8, 8),
            }}
            title={`${r.id.toString()} - ${r.assignedCar.id || null}`}
          />
        ))}
        {this.state.cars.map(c => (
          <Marker
            key={c.position.lat}
            position={{ lat: c.position.lat, lng: c.position.lon }}
            icon={{
              url: c.available ? carAvailableIcon : carReservedIcon,
              anchor: new this.props.google.maps.Point(8, 8),
              scaledSize: new this.props.google.maps.Size(8, 8),
            }}
            title={c.id.toString()}
          />
        ))}
      </Map>
    ) : null;
  }
}

export default GoogleApiWrapper({ apiKey, version: 3.31 })(MapWrapper);
