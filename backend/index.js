const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const { calculateDistance } = require('./utils/helpers.js');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Returns closest car to location of a ride request
/*
const getClosestCar = pos => {
  let closest = null;
  let currentMin = Number.MAX_SAFE_INTEGER;
  cars.forEach(c => {
    if (c.available) {
      if (closest === null) closest = c;
      else {
        const dist = calculateDistance(c.position, pos);
        if (dist < currentMin) {
          currentMin = dist;
          closest = c;
        }
      }
    }
  });
  return closest;
};
*/
// Wrapper for Google direction API
const getRoute = (from, to) =>
  axios
    .get(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${
        from.lat
      },${from.lon}&destination=${to.lat},${to.lon}&key=${
        process.env.DIRECTIONS_API_KEY
      }`
    )
    .then(res => {
      const route = res.data.routes[0];
      // Distance in meters
      const distance = route.legs
        .map(l => l.distance.value)
        .reduce((acc, cur) => acc + cur);

      // Duration in minutes
      const duration = Math.round(
        route.legs
          .map(l => l.duration.value)
          .reduce((acc, cur) => acc + cur / 60)
      );

      // Coordinate points and durations for route subdivisions
      const routeCoords = route.legs
        .map(l => l.steps)
        .reduce((acc, cur) => acc.concat(cur));
      return { distance, duration, route: routeCoords };
    });

const broadcast = data =>
  wss.clients.forEach(c => c.send(JSON.stringify(data)));

app.use(bodyParser.json());

app.post('/newcustomer', (req, res) => {
  broadcast(
    Object.assign({}, { customer: req.body }, { eventType: 'rideRequest' })
  );
  res.sendStatus(200);
});

app.post('/car', (req, res) => {
  broadcast(Object.assign({}, { car: req.body }, { eventType: 'updateCar' }));
  if (!req.body.customer) {
    res.send({ msg: 'moro' });
  } else {
    res.sendStatus(200);
  }
});

app.get('/', (req, res) => res.send('Server is up'));

server.listen(8080, () =>
  console.log(`Socket running on ${server.address().port}`)
);
