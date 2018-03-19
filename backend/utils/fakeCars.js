const axios = require('axios');
const { randomLat, randomLon } = require('./helpers.js');

const cars = new Map();
const carCount = 5;

let id = 0;

const newCar = () => {
  id += 1;
  const position = { lat: randomLat(), lon: randomLon() };
  return {
    id,
    position,
    customer: null,
    route: null,
  };
};

// Just wait for a while to give server some time to start
setTimeout(() => {
  for (let i = 0; i < carCount; i += 1) {
    const car = newCar();
    cars.set(car.id, car);
    axios
      .post('http://localhost:8080/car', car)
      .then(() => console.log(`New car created: ${car.id}`))
      .catch(err => console.log(`ERROR: ${err.message}`));
  }
}, 2500);

setInterval(() => {
  cars.forEach(c => {
    axios
      .post('http://localhost:8080/car', c)
      .then(res => {
        if (res.data.customer && c.customer === null) {
          console.log(
            `Customer ${res.data.customer.id} assigned for car ${res.data.id}`
          );
          cars.set(res.data.id, res.data);
        }
      })
      .catch(err => console.log(`ERROR: ${err.message}`));
  });
}, 5000);
