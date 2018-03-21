const axios = require('axios');
const { randomLat, randomLon, getRoute } = require('./helpers.js');

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
          getRoute(c.position, res.data.customer.from).then(routeData =>
            routeData.route.forEach(step => console.log(step.polyline.points))
          );
        }
      })
      .catch(err => console.log(`ERROR: ${err.message}`));
  });
}, 5000);
