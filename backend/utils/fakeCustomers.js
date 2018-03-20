const axios = require('axios');
const { randomLat, randomLon, calculateDistance } = require('./helpers.js');

const customers = new Map();
let id = 0;

const newCustomer = () => {
  id += 1;
  const from = { lat: randomLat(), lon: randomLon() };
  let to = { lat: randomLat(), lon: randomLon() };
  while (calculateDistance(from, to) < 1000) {
    to = { lat: randomLat(), lon: randomLon() };
  }
  return { id, from, to };
};

setInterval(() => {
  const c = newCustomer();
  customers.set(c.id, c);
  axios
    .post('http://localhost:8080/newcustomer', c)
    .then(() => console.log(`New customer request created: ${c.id}`))
    .catch(err => console.log(`ERROR: ${err.message}`));
}, 15000);
