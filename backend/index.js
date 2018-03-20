const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const axios = require('axios');
const bodyParser = require('body-parser');
const Sequelize = require('sequelize');
require('dotenv').config();

const { calculateDistance } = require('./utils/helpers.js');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const sequelize = new Sequelize('db', '', '', {
  host: 'localhost',
  dialect: 'sqlite',
  operatorsAliases: false,
  storage: './db.sqlite',
  logging: false,
});

// Clear database when faker scripts start
sequelize.query('DELETE FROM customers WHERE 1 = 1');
sequelize.query('DELETE FROM rides WHERE 1 = 1');
sequelize.query('DELETE FROM cars WHERE 1 = 1');

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
  const { id, from, to } = req.body;
  const { lat, lon } = from;

  // Update customer on db
  sequelize.query(
    `INSERT OR REPLACE INTO customers (id, lat, lon) VALUES (${id}, ${lat}, ${lon})`
  );

  // Add ride request to database
  sequelize.query(
    `INSERT INTO rides (customer, lat, lon, status) VALUES (${id}, ${to.lat}, ${
      to.lon
    }, 'OPEN')`
  );

  broadcast({ eventType: 'rideRequest', customer: req.body });
  res.sendStatus(200);
});

app.post('/car', (req, res) => {
  const { id, position } = req.body;
  const { lat, lon } = position;

  // Update cars position on db
  sequelize.query(
    `INSERT OR REPLACE INTO cars (id, lat, lon) VALUES (${id}, ${lat}, ${lon})`
  );

  // Check if this car currently has a customer
  sequelize
    .query(
      `SELECT * FROM rides WHERE car=${id} AND status IS 'RESERVED' LIMIT 1`
    )
    .then(([rows]) => {
      if (rows.length === 0) {
        // Check if there are any rides to complete
        sequelize
          .query(
            `SELECT
              rides.id as rid,
              customers.id as cid,
              customers.lat as flat,
              customers.lon as flon,
              rides.lat as tlat,
              rides.lon as tlon
            FROM rides JOIN customers ON customers.id = rides.customer
            WHERE car IS NULL AND status IS NOT 'COMPLETED'`
          )
          .then(([availableCustomers]) => {
            let customer = null;
            availableCustomers
              .map(c => ({
                rideId: c.rid,
                id: c.cid,
                from: { lat: c.flat, lon: c.flon },
                to: { lat: c.tlat, lon: c.tlon },
                distance: calculateDistance(
                  { lat: c.flat, lon: c.flon },
                  position
                ),
              }))
              // Find closest customer
              .forEach(c => {
                if (customer === null || customer.distance > c.distance) {
                  customer = c;
                }
              });
            if (customer !== null) {
              let available = true;
              sequelize
                .query(
                  `SELECT id, lat, lon FROM cars WHERE id NOT IN (SELECT car FROM rides WHERE status='RESERVED')`
                )
                // Check that this car is the closest to the customer
                .then(([availableCars]) => {
                  let min = null;
                  availableCars.forEach(c => {
                    const distance = calculateDistance(customer.from, {
                      lat: c.lat,
                      lon: c.lon,
                    });
                    if (min === null || distance < min.distance) {
                      min = { id: c.id, distance };
                    }
                  });

                  // No customer available if the car was not the closest to it
                  if (min.id !== id) {
                    customer = null;
                  }
                })
                .then(() => {
                  // Plain OK means no customer available
                  if (customer === null) {
                    res.sendStatus(200);
                  } else {
                    // Send new customer's data for car
                    res.send({ customer });

                    // Update ride request
                    sequelize.query(
                      `UPDATE rides SET car=${id}, status='RESERVED' WHERE id=${
                        customer.rideId
                      } AND status='OPEN'`
                    );
                    available = false;
                  }
                  broadcast({
                    car: Object.assign(req.body, { available }),
                    eventType: 'updateCar',
                  });
                });
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
