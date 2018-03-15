import React, { Component } from 'react';
import { GoogleApiWrapper, Map } from 'google-maps-react';
import process from 'process';
import mapStyles from './MapStyles';

const apiKey = process.env.REACT_APP_MAPS_API_KEY;

const center = { lat: 22.3185, lng: 114.1767936 };

class MapWrapper extends Component {
  render() {
    return (
      <Map
        google={this.props.google}
        initialCenter={center}
        styles={mapStyles}
      />
    );
  }
}

export default GoogleApiWrapper({ apiKey })(MapWrapper);
