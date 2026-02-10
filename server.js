const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = 3000;

// Middleware for parsing JSON
app.use(express.json({ limit: '50mb' }));

// Serve static files
app.use(express.static(__dirname));

// Serve the main HTML file for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dnd-tracker.html'));
});

// Autosave endpoints
const AUTOSAVE_FILE = path.join(__dirname, 'dnd-tracker-autosave.json');

// Load autosave on server start
function loadAutosaveOnStartup() {
    try {
        if (fs.existsSync(AUTOSAVE_FILE)) {
            const data = fs.readFileSync(AUTOSAVE_FILE, 'utf8');
            const autosaveData = JSON.parse(data);

            if (autosaveData.characters) {
                gameState.characters = autosaveData.characters;
            }
            if (autosaveData.combatState) {
                gameState.combatState = autosaveData.combatState;
            }
            if (autosaveData.monsterDatabase) {
                gameState.monsterDatabase = autosaveData.monsterDatabase;
            }

            console.log('✅ Autosave loaded successfully from:', autosaveData.timestamp);
        } else {
            console.log('ℹ️  No autosave file found, starting with empty state');
        }
    } catch (error) {
        console.error('❌ Error loading autosave on startup:', error);
    }
}

app.post('/api/autosave', (req, res) => {
    try {
        const data = req.body;
        fs.writeFileSync(AUTOSAVE_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log('Autosave created successfully');
        res.json({ success: true, message: 'Autosave created' });
    } catch (error) {
        console.error('Error creating autosave:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/autosave', (req, res) => {
    try {
        if (fs.existsSync(AUTOSAVE_FILE)) {
            const data = fs.readFileSync(AUTOSAVE_FILE, 'utf8');
            res.json({ success: true, data: JSON.parse(data) });
        } else {
            res.json({ success: false, message: 'No autosave found' });
        }
    } catch (error) {
        console.error('Error loading autosave:', error);
        res.status(500).json({ success: false, error: error.message });
    }
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
    // Server-side shared history (per page)
    history: {
        combat: [],
        spells: [],
        monsters: [],
        inventory: []
    },
    redo: {
        combat: [],
        spells: [],
        monsters: [],
        inventory: []
    }
};

const MAX_HISTORY = 20;

// Define which character fields each page owns
const PAGE_CHAR_FIELDS = {
    combat: ['currentHp', 'maxHp', 'tempHp', 'initiative', 'effects', 'deathSaves', 'concentrationActive', 'currentPower', 'maxPower'],
    spells: ['spellSlots', 'abilities', 'hitDice', 'maxHitDice', 'wizardSettings'],
    monsters: ['abilities'],
    inventory: ['inventory']
};

// Extract only page-relevant fields from characters for a scoped snapshot
function extractPageSnapshot(page) {
    const fields = PAGE_CHAR_FIELDS[page];
    if (!fields) return [];

    return gameState.characters.map(c => {
        // For monsters page, only snapshot monster characters' fields
        if (page === 'monsters' && c.type !== 'monster') {
            return { id: c.id, type: c.type };
        }
        const partial = { id: c.id, type: c.type };
        fields.forEach(field => {
            if (c[field] !== undefined) {
                partial[field] = JSON.parse(JSON.stringify(c[field]));
            }
        });
        return partial;
    });
}

// Merge only page-relevant fields from snapshot into current state
function applyPageScopedRestore(page, snapshotChars, snapshotCombatState) {
    const fields = PAGE_CHAR_FIELDS[page];
    if (!fields) return;

    // For combat page, also restore combatState
    if (page === 'combat') {
        gameState.combatState = JSON.parse(JSON.stringify(snapshotCombatState));
    }

    // Merge character fields from snapshot into current characters
    const snapshotMap = new Map();
    snapshotChars.forEach(c => snapshotMap.set(c.id, c));

    gameState.characters.forEach(currentChar => {
        const snapshotChar = snapshotMap.get(currentChar.id);
        if (!snapshotChar) return;

        // For monsters page, only restore monster characters
        if (page === 'monsters' && currentChar.type !== 'monster') return;

        fields.forEach(field => {
            if (snapshotChar[field] !== undefined) {
                currentChar[field] = JSON.parse(JSON.stringify(snapshotChar[field]));
            }
        });
    });

    // Handle characters that existed in snapshot but not in current state (were removed)
    // and characters in current state not in snapshot (were added after snapshot)
    // For combat page: also handle character additions/removals
    if (page === 'combat') {
        // Restore the full character list from snapshot for combat (handles add/remove)
        const currentMap = new Map();
        gameState.characters.forEach(c => currentMap.set(c.id, c));

        // Characters in snapshot but not current → add them back
        snapshotChars.forEach(sc => {
            if (!currentMap.has(sc.id)) {
                gameState.characters.push(JSON.parse(JSON.stringify(sc)));
            }
        });

        // Characters in current but not snapshot → remove them
        gameState.characters = gameState.characters.filter(c => snapshotMap.has(c.id));
    }
}

// Track client modes (DM vs Player)
const clientModes = new Map(); // socketId -> 'dm' or 'player'

// Filter state for player clients (remove unrevealed monsters)
function filterStateForPlayers(state) {
    const filteredState = JSON.parse(JSON.stringify(state)); // Deep copy

    // Filter characters - only show players and revealed monsters
    filteredState.characters = state.characters.filter(char =>
        char.type === 'player' || (char.type === 'monster' && char.revealedToPlayers)
    );

    // Exclude monster abilities history from players (DM-only page)
    if (filteredState.history) {
        filteredState.history.monsters = [];
    }
    if (filteredState.redo) {
        filteredState.redo.monsters = [];
    }

    return filteredState;
}

// Filter characters for player view (used in history-applied)
function filterCharactersForPlayers(characters) {
    return characters.filter(char =>
        char.type === 'player' || (char.type === 'monster' && char.revealedToPlayers)
    );
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
            // historyStack a redoStack jsou nyní lokální pro každého klienta

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

    // Save history entry (called before state-changing operations)
    socket.on('save-history-entry', (data) => {
        const { page, description } = data;
        if (!page || !gameState.history[page]) return;

        // Block players from saving monster abilities history
        const clientMode = clientModes.get(socket.id) || 'player';
        if (page === 'monsters' && clientMode !== 'dm') return;

        // Snapshot only page-relevant fields from CURRENT server state
        // This ensures cross-page changes are never captured in the wrong page's history
        gameState.history[page].push({
            characters: extractPageSnapshot(page),
            combatState: page === 'combat' ? JSON.parse(JSON.stringify(gameState.combatState)) : null,
            description: description || '',
            timestamp: Date.now()
        });

        // Trim to MAX_HISTORY
        if (gameState.history[page].length > MAX_HISTORY) {
            gameState.history[page].shift();
        }

        // New action clears redo stack
        gameState.redo[page] = [];
    });

    // Request undo for a page
    socket.on('request-undo', (data) => {
        const { page } = data;
        if (!page || !gameState.history[page]) return;

        // Block players from undoing monster abilities
        const clientMode = clientModes.get(socket.id) || 'player';
        if (page === 'monsters' && clientMode !== 'dm') return;

        if (gameState.history[page].length === 0) {
            socket.emit('history-error', { message: 'Nelze vrátit zpět - žádná historie změn na této stránce!' });
            return;
        }

        // Save current state to redo stack (page-scoped snapshot before undo)
        gameState.redo[page].push({
            characters: extractPageSnapshot(page),
            combatState: page === 'combat' ? JSON.parse(JSON.stringify(gameState.combatState)) : null,
            description: 'Aktuální stav',
            timestamp: Date.now()
        });
        if (gameState.redo[page].length > MAX_HISTORY) {
            gameState.redo[page].shift();
        }

        // Pop from history and apply page-scoped restore
        const previousState = gameState.history[page].pop();
        applyPageScopedRestore(page, previousState.characters, previousState.combatState);

        // Broadcast restored state to ALL clients (including sender)
        io.sockets.sockets.forEach((clientSocket) => {
            const targetMode = clientModes.get(clientSocket.id) || 'player';
            const chars = targetMode === 'dm'
                ? gameState.characters
                : filterCharactersForPlayers(gameState.characters);

            clientSocket.emit('history-applied', {
                page: page,
                description: previousState.description,
                direction: 'undo',
                characters: chars,
                combatState: gameState.combatState
            });
        });

        console.log(`Undo applied on page '${page}': ${previousState.description}`);
    });

    // Request redo for a page
    socket.on('request-redo', (data) => {
        const { page } = data;
        if (!page || !gameState.redo[page]) return;

        // Block players from redoing monster abilities
        const clientMode = clientModes.get(socket.id) || 'player';
        if (page === 'monsters' && clientMode !== 'dm') return;

        if (gameState.redo[page].length === 0) {
            socket.emit('history-error', { message: 'Nelze posunout dopředu - žádná historie na této stránce!' });
            return;
        }

        // Save current state to history stack (page-scoped snapshot before redo)
        gameState.history[page].push({
            characters: extractPageSnapshot(page),
            combatState: page === 'combat' ? JSON.parse(JSON.stringify(gameState.combatState)) : null,
            description: 'Stav před redo',
            timestamp: Date.now()
        });
        if (gameState.history[page].length > MAX_HISTORY) {
            gameState.history[page].shift();
        }

        // Pop from redo and apply page-scoped restore
        const nextState = gameState.redo[page].pop();
        applyPageScopedRestore(page, nextState.characters, nextState.combatState);

        // Broadcast restored state to ALL clients (including sender)
        io.sockets.sockets.forEach((clientSocket) => {
            const targetMode = clientModes.get(clientSocket.id) || 'player';
            const chars = targetMode === 'dm'
                ? gameState.characters
                : filterCharactersForPlayers(gameState.characters);

            clientSocket.emit('history-applied', {
                page: page,
                description: nextState.description,
                direction: 'redo',
                characters: chars,
                combatState: gameState.combatState
            });
        });

        console.log(`Redo applied on page '${page}': ${nextState.description}`);
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

    // Load autosave after server starts
    loadAutosaveOnStartup();
});
