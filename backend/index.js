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
const cars = new Map();

// Returns closest car to location of a ride request
const getClosestCar = pos => {
  let closest = null;
  let currentMin = Number.MAX_SAFE_INTEGER;
  cars.forEach(c => {
    if (c.customer === null) {
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
  const car = getClosestCar(req.body.from);
  if (car !== null) {
    getRoute(car.position, req.body.from)
      .then(route =>
        cars.set(
          car.id,
          Object.assign(car, {
            customer: req.body,
            route,
          })
        )
      )
      .then(() =>
        broadcast(
          Object.assign(
            {},
            { car: cars.get(car.id) },
            { eventType: 'updateCar' }
          )
        )
      );
  }
  broadcast(
    Object.assign(
      {},
      { customer: req.body },
      { eventType: 'rideRequest' },
      { car }
    )
  );
  res.send(car);
});

app.post('/car', (req, res) => {
  broadcast(Object.assign({}, { car: req.body }, { eventType: 'updateCar' }));
  if (!req.body.customer) {
    if (cars.get(req.body.id) && cars.get(req.body.id).customer !== null) {
      res.send(cars.get(req.body.id));
    }
  } else {
    res.sendStatus(200);
  }
  cars.set(req.body.id, req.body);
});

app.get('/', (req, res) => res.send('Server is up'));

server.listen(8080, () =>
  console.log(`Socket running on ${server.address().port}`)
);
