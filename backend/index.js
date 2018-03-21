const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const bodyParser = require('body-parser');
require('dotenv').config();

const db = require('./dbFunctions.js');

const app = express();
app.use(bodyParser.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Create connection and clear database
db.initialize();

wss.on('connection', client => {
  db
    .getAllCars()
    .then(([cars]) =>
      cars.map(c => ({
        id: c.id,
        position: {
          lat: c.lat,
          lon: c.lon,
        },
        available: c.status === null,
      }))
    )
    .then(cars => {
      cars.forEach(c =>
        client.send(JSON.stringify({ car: c, eventType: 'updateCar' }))
      );
    });
  db
    .getAllOpenRideRequests()
    .then(([rides]) =>
      rides.map(r => ({
        id: r.cid,
        from: {
          lat: r.flat,
          lon: r.flon,
        },
      }))
    )
    .then(rides => {
      rides.forEach(r =>
        client.send(JSON.stringify({ customer: r, eventType: 'rideRequest' }))
      );
    });
});

// Send given object as JSON to all clients
const broadcast = data =>
  wss.clients.forEach(c => c.send(JSON.stringify(data)));

app.post('/ride', (req, res) => {
  const { id, from, to } = req.body;

  db.updateCustomer(id, from.lat, from.lon);
  db.addRideRequest(id, to.lat, to.lon);

  broadcast({ eventType: 'rideRequest', customer: req.body });
  res.sendStatus(200);
});

app.post('/car', (req, res) => {
  const { id, position: { lat, lon } } = req.body;

  db.updateCar(id, lat, lon);

  db.isCarAvailable(id).then(isAvailable => {
    if (isAvailable) {
      db.getClosestAvailableCustomer({ lat, lon }).then(customer => {
        if (customer !== null) {
          let available = true;
          db.checkIfClosestAvailableCar(id, customer).then(isClosest => {
            if (!isClosest) {
              res.sendStatus(200);
            } else {
              // Send new customer's data for car
              res.send({ customer });

              db.updateRideRequest(id, customer.rideId, 'RESERVED');
              available = false;
            }
            broadcast({
              car: Object.assign(req.body, { available }),
              eventType: 'updateCar',
            });
          });
          // No customers available
        } else {
          broadcast({
            car: Object.assign(req.body, { available: true }),
            eventType: 'updateCar',
          });
        }
      });
    } else {
      // Continue with existing customer
      res.sendStatus(200);
      broadcast({
        car: Object.assign(req.body, { available: false }),
        eventType: 'updateCar',
      });
    }
  });
});

app.get('/', (req, res) => res.send('Server is up'));

server.listen(8080, () =>
  console.log(`Socket running on ${server.address().port}`)
);
