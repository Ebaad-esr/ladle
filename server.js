const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json({ limit: '5mb' })); // Allow large image payloads
app.use(express.static(path.join(__dirname, 'public')));

// --- INITIAL DATA STATE & SEQUENCES ---
const plantAreas = ['TLC Pit', 'Converter', 'Ladle Prep Bay', 'LF-1', 'RH Unit', 'Caster Machine', 'Slag Dumping', 'Maintenance Yard'];
const mainSequence = ['Ladle Prep Bay', 'TLC Pit', 'Converter', 'RH Unit', 'LF-1', 'Caster Machine']; // Maintenance is the end of the line before restart

let ladles = [
    { id: 'L-101', number: 101, location: 'Maintenance Yard', journey: [] },
    { id: 'L-245', number: 245, location: 'Caster Machine', journey: [] },
    { id: 'L-303', number: 303, location: 'LF-1', journey: [] },
    { id: 'L-418', number: 418, location: 'Slag Dumping', journey: [] },
    { id: 'L-550', number: 550, location: 'Converter', journey: [] },
    { id: 'L-621', number: 621, location: 'Maintenance Yard', journey: [] },
    { id: 'L-789', number: 789, location: 'TLC Pit', journey: [] },
];

// Initialize journey history
ladles.forEach(ladle => {
    ladle.journey.push({
        location: ladle.location,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit'})
    });
});

// --- API ENDPOINT FOR ESP32 ---
app.post('/api/ladle-data', (req, res) => {
    const { rfid, image, location } = req.body;
    if (!rfid || !location) {
        return res.status(400).send({ message: 'Missing rfid or location data.' });
    }
    console.log(`Data received: RFID=${rfid}, Location=${location}`);
    let ladle = ladles.find(l => l.id === rfid);
    if (!ladle) {
        ladle = { id: rfid, number: parseInt(rfid.split('-')[1]), location: 'Maintenance Yard', journey: [] };
        ladles.push(ladle);
    }
    const oldLocation = ladle.location;
    ladle.location = location;
    const isMatch = Math.random() > 0.1;
    const ocrResult = isMatch ? ladle.number : Math.floor(Math.random() * 900) + 100;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    ladle.journey.push({ location, timestamp });
    const event = { ladleId: ladle.id, oldLocation, newLocation: location, isMatch, ocrResult, timestamp, type: isMatch ? 'success' : 'error' };
    broadcast({ type: 'update', event, updatedLadle: ladle });
    res.status(200).send({ message: 'Data received and processed successfully.' });
});

// --- SEQUENTIAL MOVEMENT SIMULATION ---
function simulateLadleMovement() {
    // Select any ladle to potentially move
    if (ladles.length === 0) return;
    
    const ladleToMove = ladles[Math.floor(Math.random() * ladles.length)];
    const oldLocation = ladleToMove.location;
    let newLocation;

    const currentIndex = mainSequence.indexOf(oldLocation);

    // Determine the next location based on the sequence
    if (oldLocation === 'Maintenance Yard') {
        // If in maintenance, the next step is to go back to the prep bay
        newLocation = 'Ladle Prep Bay';
    } else if (oldLocation === 'Converter' && Math.random() < 0.3) {
        // 30% chance to go to Slag Dumping from Converter
        newLocation = 'Slag Dumping';
    } else if (oldLocation === 'Slag Dumping') {
        // After slag dumping, return to the start of the process
        newLocation = 'Ladle Prep Bay';
    } else if (currentIndex !== -1 && currentIndex < mainSequence.length - 1) {
        // Move to the next step in the main sequence
        newLocation = mainSequence[currentIndex + 1];
    } else {
        // If at the end of the sequence (Caster Machine) or in a state not in the main sequence, send to Maintenance
        newLocation = 'Maintenance Yard';
    }
    
    ladleToMove.location = newLocation;

    // --- 2FA LOGIC & BROADCAST ---
    const isMatch = Math.random() > 0.1;
    const ocrResult = isMatch ? ladleToMove.number : Math.floor(Math.random() * 900) + 100;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    ladleToMove.journey.push({ location: newLocation, timestamp });
    const event = { ladleId: ladleToMove.id, oldLocation, newLocation, isMatch, ocrResult, timestamp, type: isMatch ? 'success' : 'error' };
    
    console.log(`SIMULATION: Ladle ${event.ladleId} moved sequentially to ${event.newLocation}`);
    broadcast({ type: 'update', event, updatedLadle: ladleToMove });
}


setInterval(simulateLadleMovement, 4000);

// --- WEBSOCKET LOGIC ---
wss.on('connection', (ws) => {
    console.log('Dashboard connected.');
    ws.send(JSON.stringify({ type: 'initial_state', payload: { ladles, plantAreas } }));
    ws.on('close', () => { console.log('Dashboard disconnected.'); });
});

function broadcast(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// --- SERVER STARTUP ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`LadleTrack server running on http://localhost:${PORT}`);
    const networkInterfaces = os.networkInterfaces();
    let serverIp = 'YOUR_SERVER_IP';
    for (const name of Object.keys(networkInterfaces)) {
        for (const net of networkInterfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                serverIp = net.address;
                break;
            }
        }
        if (serverIp !== 'YOUR_SERVER_IP') break;
    }
    console.log(`Listening for ESP32 data at http://${serverIp}:${PORT}/api/ladle-data`);
});

