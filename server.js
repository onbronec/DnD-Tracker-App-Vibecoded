const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { networkInterfaces } = require('os');
const socketIO = require('socket.io');
const { loadDmToken } = require('./server/config');
const { createDebouncedStateSaver, loadStateFromDisk, AUTOSAVE_FILE } = require('./server/store');
const { createSocketHandlers } = require('./server/socketHandlers');
const { filterStateForClient } = require('./server/visibility');

const PORT = Number(process.env.PORT || 3000);
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: true,
        credentials: false
    }
});

const dmToken = loadDmToken();
const stateRef = { current: loadStateFromDisk() };
const autosaveScheduler = createDebouncedStateSaver(() => stateRef.current);

app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
});

app.get('/api/autosave', (req, res) => {
    if (req.query.token !== dmToken) {
        res.status(403).json({ success: false, error: 'DM token required' });
        return;
    }
    res.json({ success: true, data: stateRef.current });
});

app.post('/api/autosave', (req, res) => {
    if (req.query.token !== dmToken) {
        res.status(403).json({ success: false, error: 'DM token required' });
        return;
    }
    try {
        stateRef.current = req.body && req.body.schemaVersion ? req.body : stateRef.current;
        const result = autosaveScheduler.flush();
        if (!result.ok) throw result.error;
        res.json({ success: true, message: 'Autosave created' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

createSocketHandlers({
    io,
    stateRef,
    dmToken,
    saveState: autosaveScheduler.schedule
});

const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    app.use(express.static(__dirname));
    app.get('/', (_req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });
    app.get('/state-preview', (req, res) => {
        const role = req.query.token === dmToken ? 'dm' : 'player';
        res.json(filterStateForClient(stateRef.current, role));
    });
}

function getLocalIp() {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
            if (net.family === 'IPv4' && !net.internal) return net.address;
        }
    }
    return 'localhost';
}

if (require.main === module) {
    const localIP = getLocalIp();
    server.listen(PORT, () => {
        console.log('\n========================================');
        console.log('D&D Tracker Server Running');
        console.log('========================================');
        console.log(`DM Access:     http://localhost:${PORT}?mode=dm&token=${dmToken}`);
        console.log(`Player Access: http://${localIP}:${PORT}?mode=player`);
        console.log(`Autosave:      ${AUTOSAVE_FILE}`);
        if (!fs.existsSync(distPath)) {
            console.log('React build not found. Use `npm.cmd run dev` for Vite dev mode or `npm.cmd run build` before `npm.cmd start`.');
        }
        console.log('========================================\n');
    });
}

module.exports = {
    app,
    server,
    io,
    stateRef,
    dmToken
};
