// server.js
// This is the heart of your local application. It serves the webpage,
// listens for ESP32 data, and pushes real-time updates to the dashboard.

const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3000;

// --- DATA STORE (In-memory for this local version) ---
// This represents the current state of your steel plant.
const plantAreas = ['TLC Pit', 'Converter', 'Ladle Prep Bay', 'LF-1', 'RH Unit', 'Caster Machine', 'Slag Dumping', 'Maintenance Yard'];
let ladles = [
    { id: 'L-101', number: 101, location: 'Maintenance Yard', journey: [] },
    { id: 'L-245', number: 245, location: 'Caster Machine', journey: [] },
    { id: 'L-303', number: 303, location: 'LF-1', journey: [] },
    { id: 'L-418', number: 418, location: 'Slag Dumping', journey: [] },
    { id: 'L-550', number: 550, location: 'Converter', journey: [] },
    { id: 'L-621', number: 621, location: 'Maintenance Yard', journey: [] },
    { id: 'L-789', number: 789, location: 'Slag Dumping', journey: [] },
];

// Initialize journeys
ladles.forEach(l => {
    l.journey.push({
        location: l.location,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });
});


// --- MIDDLEWARE ---
// Serve the static files (HTML, CSS, JS) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
// Allow the server to parse incoming JSON data, with a high limit for base64 images
app.use(express.json({ limit: '10mb' }));


// --- API ENDPOINT FOR ESP32 ---
// This is where your ESP32 devices will send their data.
app.post('/api/ladle-data', (req, res) => {
    const { rfid, image, location } = req.body; // Location is sent by the station
    
    console.log(`Received data from ESP32 at ${location}: RFID=${rfid}`);

    if (!rfid || !location) {
        return res.status(400).send({ message: 'Missing rfid or location data.' });
    }

    const ladle = ladles.find(l => l.id === rfid);
    if (!ladle) {
        return res.status(404).send({ message: 'Ladle not found.' });
    }

    // --- 2FA LOGIC SIMULATION ---
    // In a real system, you would run an OCR process on the 'image' data.
    // Here, we simulate it with a 90% chance of success.
    const isMatch = Math.random() > 0.1;
    const ocrResult = isMatch ? ladle.number : Math.floor(Math.random() * 900) + 100;
    
    // Update ladle's location
    const oldLocation = ladle.location;
    ladle.location = location;

    // Record the journey
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    ladle.journey.push({ location, timestamp });

    // Create a log event object
    const event = {
        ladleId: ladle.id,
        oldLocation,
        newLocation: location,
        isMatch,
        ocrResult,
        timestamp,
        type: isMatch ? 'success' : 'error'
    };
    
    // Broadcast the update to all connected dashboard clients
    broadcast({ type: 'update', event, updatedLadle: ladle });

    res.status(200).send({ message: 'Data received and processed successfully.' });
});


// --- WEBSOCKET LOGIC ---
// Manages real-time communication with the dashboard.
wss.on('connection', (ws) => {
    console.log('Dashboard client connected.');

    // When a new client connects, send them the current full state of the plant.
    ws.send(JSON.stringify({
        type: 'initial-state',
        payload: {
            ladles,
            plantAreas
        }
    }));

    ws.on('close', () => {
        console.log('Dashboard client disconnected.');
    });
});

// Function to send data to all connected clients
function broadcast(data) {
    const jsonData = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
            client.send(jsonData);
        }
    });
}

// --- START THE SERVER ---
server.listen(PORT, '0.0.0.0', () => {
    console.log(`LadleTrack server running on http://localhost:${PORT}`);
    console.log(`Listening for ESP32 data at http://<YOUR_SERVER_IP>:${PORT}/api/ladle-data`);
});

