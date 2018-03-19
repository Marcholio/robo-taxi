// Hong Kong area
const minLat = 22.301;
const minLon = 114.161;
const maxLat = 22.336;
const maxLon = 114.192183;

// Random coordinate functions
const randomLat = () => Math.random() * (maxLat - minLat) + minLat;
const randomLon = () => Math.random() * (maxLon - minLon) + minLon;

const toRadians = deg => deg * Math.PI / 180;

// Get distance between coordinates
const calculateDistance = (a, b) => {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const lon1 = toRadians(a.lon);
  const lon2 = toRadians(b.lon);

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

  return 6371e3 * y;
};

module.exports = { randomLat, randomLon, calculateDistance };
