const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const axios = require('axios');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Hong Kong area
const minLat = 22.301;
const minLon = 114.161;
const maxLat = 22.336;
const maxLon = 114.192183;

const carsAvailable = 10;

// Random coordinate functions
const randomLat = () => Math.random() * (maxLat - minLat) + minLat;
const randomLon = () => Math.random() * (maxLon - minLon) + minLon;

const toRadians = deg => deg * Math.PI / 180;

// Get distance between coordinates
const distance = (a, b) => {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const lon1 = toRadians(a.lon);
  const lon2 = toRadians(b.lon);

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

  return 6371e3 * y;
};

// Creates random cars at the beginning
const getCar = () => {
  const lat = randomLat();
  const lon = randomLon();
  return {
    position: { lat, lon },
    available: true,
    id: Math.round(Math.random() * 1000),
  };
};

const cars = new Array(carsAvailable).fill(null).map(() => getCar());

// Returns closest car to location of a ride request
const getClosestCar = pos => {
  let closest = null;
  let currentMin = Number.MAX_SAFE_INTEGER;
  cars.forEach(c => {
    if (c.available) {
      if (closest === null) closest = c;
      else {
        const dist = distance(c.position, pos);
        if (dist < currentMin) {
          currentMin = dist;
          closest = c;
        }
      }
    }
  });
  return closest;
};

/*
 * Returns a new request from customer to get a ride
 */
const getRideRequest = () => {
  const latF = randomLat();
  const lonF = randomLon();
  let latT = randomLat();
  let lonT = randomLon();
  while (distance({ lat: latF, lon: lonF }, { lat: latT, lon: lonT }) < 1000) {
    latT = randomLat();
    lonT = randomLon();
  }

  return {
    eventType: 'rideRequest',
    from: { lat: latF, lon: lonF },
    to: { lat: latT, lon: lonT },
    assignedCar: getClosestCar({ lat: latF, lon: lonF }),
    id: Math.round(Math.random() * 1000),
  };
};

// Wrapper for Google direction API
const getRoute = (from, to) => {
  axios
    .get(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${
        from.lat
      },${from.lon}&destination=${to.lat},${to.lon}&key=${
        process.env.DIRECTIONS_API_KEY
      }`
    )
    .then(res => console.log(res.data.routes[0].legs[0].steps));
};

getRoute(
  {
    lat: 22.309541798489743,
    lon: 114.18341991195182,
  },
  {
    lat: 22.329657261488418,
    lon: 114.17416566343528,
  }
);

wss.on('connection', client => {
  client.send(
    JSON.stringify({
      eventType: 'initialCars',
      cars,
    })
  );
});

// Main loop for mocking ride requests
setInterval(
  () => wss.clients.forEach(c => c.send(JSON.stringify(getRideRequest()))),
  5000
);

app.get('/', (req, res) => res.send('moro'));

server.listen(8080, () =>
  console.log(`Socket running on ${server.address().port}`)
);
