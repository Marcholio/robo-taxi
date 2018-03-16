const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Hong Kong area
const minLat = 22.301;
const minLon = 114.161;
const maxLat = 22.336;
const maxLon = 114.192183;

/*
 * Returns a new request from customer to get a ride
 */
const getRideRequest = () => {
  const lat = Math.random() * (maxLat - minLat) + minLat;
  const lon = Math.random() * (maxLon - minLon) + minLon;
  return { eventType: 'rideRequest', lat, lon };
};

// Main loop for mocking ride requests
setInterval(
  () => wss.clients.forEach(c => c.send(JSON.stringify(getRideRequest()))),
  5000
);

app.get('/', (req, res) => res.send('moro'));

server.listen(8080, () =>
  console.log(`Socket running on ${server.address().port}`)
);
