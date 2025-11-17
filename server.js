const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = 3000;

// Serve static files
app.use(express.static(__dirname));

// Serve the main HTML file for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dnd-tracker.html'));
});

// Game state stored in memory
let gameState = {
    characters: [],
    combatState: {
        active: false,
        currentTurn: 0,
        round: 1,
        playedThisRound: []
    },
    monsterDatabase: [],
    historyStack: [],
    redoStack: []
};

const MAX_HISTORY = 20;

// Handle client connections
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Send current game state to newly connected client
    socket.emit('state-sync', gameState);

    // Handle state updates from clients
    socket.on('update-state', (data) => {
        // Update server state
        if (data.characters) gameState.characters = data.characters;
        if (data.combatState) gameState.combatState = data.combatState;
        if (data.monsterDatabase) gameState.monsterDatabase = data.monsterDatabase;
        if (data.historyStack !== undefined) gameState.historyStack = data.historyStack;
        if (data.redoStack !== undefined) gameState.redoStack = data.redoStack;

        // Broadcast to all OTHER clients (not sender)
        socket.broadcast.emit('state-sync', gameState);

        console.log('State updated and broadcasted');
    });

    // Handle individual character updates (for performance)
    socket.on('update-character', (characterData) => {
        const index = gameState.characters.findIndex(c => c.id === characterData.id);
        if (index !== -1) {
            gameState.characters[index] = characterData;
            socket.broadcast.emit('character-updated', characterData);
        }
    });

    // Handle combat state changes
    socket.on('update-combat', (combatData) => {
        gameState.combatState = combatData;
        socket.broadcast.emit('combat-updated', combatData);
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// Get local IP for player access
const { networkInterfaces } = require('os');
const nets = networkInterfaces();
let localIP = 'localhost';

for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
        // Skip over non-IPv4 and internal addresses
        if (net.family === 'IPv4' && !net.internal) {
            localIP = net.address;
            break;
        }
    }
}

server.listen(PORT, () => {
    console.log('\n========================================');
    console.log('🎲 D&D Combat Tracker Server Running');
    console.log('========================================');
    console.log(`\n📍 DM Access (full control):`);
    console.log(`   http://localhost:${PORT}?mode=dm`);
    console.log(`\n👥 Player Access (simplified view):`);
    console.log(`   http://${localIP}:${PORT}?mode=player`);
    console.log(`\n⚠️  Make sure all devices are on the same Wi-Fi network`);
    console.log('========================================\n');
});
