import React, { Component } from 'react';
import { GoogleApiWrapper, Map, Marker, Polygon } from 'google-maps-react';
import Immutable from 'immutable';
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
    this.state = { rideRequests: [], cars: Immutable.Map() };
  }

  componentWillMount() {
    // Connect to backend socket sending real time data to front
    const socket = new WebSocket('ws://localhost:8080');
    socket.onmessage = event => {
      const data = JSON.parse(event.data);

      if (data.eventType === 'rideRequest') {
        this.addRideRequest(data.customer);
      } else if (data.eventType === 'updateCar') {
        this.updateCar(data.car);
      }
    };
  }

  // Adds new request for ride to state to add a marker to map
  addRideRequest(data) {
    this.setState({
      rideRequests: this.state.rideRequests.concat([data]),
    });
  }

  // Update car's data on map
  updateCar(data) {
    this.setState({
      cars: this.state.cars.set(data.id, data),
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
            title={`${r.id.toString()}`}
          />
        ))}
        {this.state.cars.valueSeq().map(c => {
          return (
            <Marker
              key={c.id}
              position={{
                lat: c.position.lat,
                lng: c.position.lon,
              }}
              icon={{
                url: c.customer === null ? carAvailableIcon : carReservedIcon,
                anchor: new this.props.google.maps.Point(8, 8),
                scaledSize: new this.props.google.maps.Size(8, 8),
              }}
              title={c.id.toString()}
            />
          );
        })}
        {this.state.cars.valueSeq().map(c => {
          if (c.route) {
            return c.route.route.map(r => (
              <Polygon
                paths={[
                  { lat: r.start_location.lat, lng: r.start_location.lng },
                  { lat: r.end_location.lat, lng: r.end_location.lng },
                ]}
                strokeColor={'#ff0000'}
              />
            ));
          }
          return null;
        })}
      </Map>
    ) : null;
  }
}

export default GoogleApiWrapper({ apiKey, version: 3.31 })(MapWrapper);
