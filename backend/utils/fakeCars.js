const axios = require('axios');
const { randomLat, randomLon } = require('./helpers.js');

const cars = new Map();
const carCount = 3;

let id = 0;

const newCar = () => {
  id += 1;
  const position = { lat: randomLat(), lon: randomLon() };
  return {
    id,
    position,
  };
};

// Create cars
for (let i = 0; i < carCount; i += 1) {
  const car = newCar();
  cars.set(car.id, car);
}

setInterval(() => {
  cars.forEach(c => {
    axios
      .post('http://localhost:8080/car', c)
      .then(res => {
        // New customer
        if (res.data.customer) {
          console.log(
            `New customer ${res.data.customer.id} assigned for ${c.id}`
          );
        }
      })
      .catch(err => console.log(`ERROR: ${err.message}`));
  });
}, 5000);
