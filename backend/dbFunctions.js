const Sequelize = require('sequelize');
const { calculateDistance } = require('./utils/helpers.js');

let sequelize;

// Create connection and clear database
const initialize = () => {
  sequelize = new Sequelize('db', '', '', {
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
};

const updateCustomer = (id, lat, lon) =>
  sequelize.query(
    `INSERT OR REPLACE INTO customers (id, lat, lon) VALUES (${id}, ${lat}, ${lon})`
  );

const updateCar = (id, lat, lon) =>
  sequelize.query(
    `INSERT OR REPLACE INTO cars (id, lat, lon) VALUES (${id}, ${lat}, ${lon})`
  );

const addRideRequest = (id, lat, lon) =>
  sequelize.query(
    `INSERT INTO rides (customer, lat, lon, status) VALUES (${id}, ${lat}, ${lon}, 'OPEN')`
  );

const isCarAvailable = id =>
  sequelize
    .query(
      `SELECT * FROM rides WHERE car=${id} AND status IS 'RESERVED' LIMIT 1`
    )
    .then(([rows]) => rows.length === 0);

const getClosestAvailableCustomer = position =>
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
          distance: calculateDistance({ lat: c.flat, lon: c.flon }, position),
        }))
        // Find closest customer
        .forEach(c => {
          if (customer === null || customer.distance > c.distance) {
            customer = c;
          }
        });
      return customer;
    });

const checkIfClosestAvailableCar = (carId, customer) =>
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
      return min.id === carId;
    });

const updateRideRequest = (carId, rideId, status) =>
  sequelize.query(
    `UPDATE rides SET car=${carId}, status='${status}' WHERE id=${rideId} AND status='OPEN'`
  );

module.exports = {
  initialize,
  updateCustomer,
  addRideRequest,
  updateCar,
  isCarAvailable,
  getClosestAvailableCustomer,
  checkIfClosestAvailableCar,
  updateRideRequest,
};
