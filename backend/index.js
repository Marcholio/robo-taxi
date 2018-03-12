const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Hong Kong area
const minLat = 22.301441;
const minLon = 114.187131;
const maxLat = 20.30303;
const maxLon = 114.190479;

wss.on('connection', ws => ws.send('Connected'));

app.get('/', (req, res) => res.send('moro'));

server.listen(3000, () => console.log('Server up and running'));
