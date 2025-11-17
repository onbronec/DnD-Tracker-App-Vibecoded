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

// Track client modes (DM vs Player)
const clientModes = new Map(); // socketId -> 'dm' or 'player'

// Filter state for player clients (remove unrevealed monsters)
function filterStateForPlayers(state) {
    const filteredState = JSON.parse(JSON.stringify(state)); // Deep copy

    // Filter characters - only show players and revealed monsters
    filteredState.characters = state.characters.filter(char =>
        char.type === 'player' || (char.type === 'monster' && char.revealedToPlayers)
    );

    // Filter history stack - remove hidden monsters from past states
    if (filteredState.historyStack) {
        filteredState.historyStack = filteredState.historyStack.map(historyEntry => ({
            ...historyEntry,
            characters: historyEntry.characters ? historyEntry.characters.filter(char =>
                char.type === 'player' || (char.type === 'monster' && char.revealedToPlayers)
            ) : []
        }));
    }

    // Filter redo stack - remove hidden monsters from future states
    if (filteredState.redoStack) {
        filteredState.redoStack = filteredState.redoStack.map(redoEntry => ({
            ...redoEntry,
            characters: redoEntry.characters ? redoEntry.characters.filter(char =>
                char.type === 'player' || (char.type === 'monster' && char.revealedToPlayers)
            ) : []
        }));
    }

    return filteredState;
}

// Broadcast state to all clients with appropriate filtering
function broadcastState(excludeSocketId = null) {
    io.sockets.sockets.forEach((clientSocket) => {
        if (clientSocket.id === excludeSocketId) return; // Skip sender

        const clientMode = clientModes.get(clientSocket.id) || 'player';
        const stateToSend = clientMode === 'dm' ? gameState : filterStateForPlayers(gameState);

        clientSocket.emit('state-sync', stateToSend);
    });
}

// Handle client connections
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Register client mode
    socket.on('register-mode', (mode) => {
        clientModes.set(socket.id, mode);
        console.log(`Client ${socket.id} registered as ${mode}`);

        // Send appropriate initial state
        const stateToSend = mode === 'dm' ? gameState : filterStateForPlayers(gameState);
        socket.emit('state-sync', stateToSend);
    });

    // Send current game state to newly connected client (default as player until registered)
    socket.emit('state-sync', filterStateForPlayers(gameState));

    // Handle state updates from clients
    socket.on('update-state', (data) => {
        const clientMode = clientModes.get(socket.id) || 'player';

        // Only DM can send full state updates
        if (clientMode === 'dm') {
            // Update server state from DM
            if (data.characters) gameState.characters = data.characters;
            if (data.combatState) gameState.combatState = data.combatState;
            if (data.monsterDatabase) gameState.monsterDatabase = data.monsterDatabase;
            if (data.historyStack !== undefined) gameState.historyStack = data.historyStack;
            if (data.redoStack !== undefined) gameState.redoStack = data.redoStack;

            // Broadcast to all OTHER clients with appropriate filtering
            broadcastState(socket.id);

            console.log('State updated by DM and broadcasted');
        } else {
            // Players can only update visible characters (players and revealed monsters)
            if (data.characters) {
                data.characters.forEach(updatedChar => {
                    // Only allow updates to players or revealed monsters
                    if (updatedChar.type === 'player' ||
                        (updatedChar.type === 'monster' && updatedChar.revealedToPlayers)) {
                        const index = gameState.characters.findIndex(c => c.id === updatedChar.id);
                        if (index !== -1) {
                            gameState.characters[index] = updatedChar;
                        }
                    }
                });
            }

            // Update combat state if provided
            if (data.combatState) gameState.combatState = data.combatState;

            // Broadcast to all OTHER clients with appropriate filtering
            broadcastState(socket.id);

            console.log('State updated by player and broadcasted');
        }
    });

    // Handle individual character updates (for performance)
    socket.on('update-character', (characterData) => {
        const clientMode = clientModes.get(socket.id) || 'player';

        // Check if player is allowed to update this character
        if (clientMode === 'player' &&
            characterData.type === 'monster' &&
            !characterData.revealedToPlayers) {
            console.log('Player attempted to update hidden monster - blocked');
            return;
        }

        const index = gameState.characters.findIndex(c => c.id === characterData.id);
        if (index !== -1) {
            gameState.characters[index] = characterData;

            // Broadcast to appropriate clients
            io.sockets.sockets.forEach((clientSocket) => {
                if (clientSocket.id === socket.id) return;

                const targetMode = clientModes.get(clientSocket.id) || 'player';
                // Only send if DM or if character is visible to players
                if (targetMode === 'dm' ||
                    characterData.type === 'player' ||
                    (characterData.type === 'monster' && characterData.revealedToPlayers)) {
                    clientSocket.emit('character-updated', characterData);
                }
            });
        }
    });

    // Handle combat state changes
    socket.on('update-combat', (combatData) => {
        gameState.combatState = combatData;
        socket.broadcast.emit('combat-updated', combatData);
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        clientModes.delete(socket.id);
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
