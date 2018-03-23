const axios = require('axios');
const {
  randomLat,
  randomLon,
  getRoute,
  decodePolyline,
  calculateDistance,
} = require('./helpers.js');

const cars = new Map();
const carCount = 15;

let id = 0;

const newCar = () => {
  id += 1;
  const position = { lat: randomLat(), lon: randomLon() };
  return {
    id,
    position,
    route: [],
  };
};

// Create cars
for (let i = 0; i < carCount; i += 1) {
  const car = newCar();
  cars.set(car.id, car);
}

setInterval(() => {
  cars.forEach(c => {
    let car = c;
    if (c.route.length > 0 && c.route[0].time < new Date().getTime() / 1000) {
      car = Object.assign(c, {
        position: { lat: c.route[0].lat, lon: c.route[0].lon },
        route: c.route.slice(1, c.route.length),
      });
      if (c.route.length === 1) {
        console.log(`Customer reached for car ${c.id}`);
      }
    }
    axios
      .post('http://localhost:8080/car', car)
      .then(res => {
        // New customer
        if (res.data.customer) {
          console.log(
            `New customer ${res.data.customer.id} assigned for ${c.id}`
          );
          getRoute(car.position, res.data.customer.from).then(routeData => {
            const coords = decodePolyline(routeData.route);
            // Used to calculate times when car should report being at given point
            let time = new Date().getTime() / 1000;
            for (let i = 1; i < coords.length; i += 1) {
              const dist = calculateDistance(coords[i], coords[i - 1]);
              time += dist / routeData.distance * routeData.duration;
              coords[i] = Object.assign(coords[i], { time });
            }
            cars.set(
              c.id,
              Object.assign(c, {
                route: coords.slice(1, coords.length),
                customer: res.data.customer,
              })
            );
          });
        }
      })
      .catch(err => console.log(`ERROR: ${err.message}`));
  });
}, 5000);
