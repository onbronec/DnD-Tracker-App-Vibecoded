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
    res.json({ success: true, data: filterStateForClient(stateRef.current, 'dm') });
});

app.post('/api/autosave', async (req, res) => {
    if (req.query.token !== dmToken) {
        res.status(403).json({ success: false, error: 'DM token required' });
        return;
    }
    try {
        stateRef.current = req.body && req.body.schemaVersion ? req.body : stateRef.current;
        const result = await autosaveScheduler.flush();
        if (!result.ok) throw result.error;
        res.json({ success: true, message: 'Autosave created' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/monster-images', (_req, res) => {
    try {
        const monstersDir = path.join(__dirname, 'public', 'images', 'monsters');
        if (!fs.existsSync(monstersDir)) {
            return res.json({ success: true, images: [] });
        }
        const files = fs.readdirSync(monstersDir);
        const allowedExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];
        const images = files.filter(f => allowedExts.includes(path.extname(f).toLowerCase())).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        res.json({ success: true, images });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/upload-monster-image', (req, res) => {
    try {
        const { filename, dataUrl } = req.body || {};
        if (!dataUrl || typeof dataUrl !== 'string') {
            return res.status(400).json({ success: false, error: 'Data URL is required' });
        }
        const monstersDir = path.join(__dirname, 'public', 'images', 'monsters');
        if (!fs.existsSync(monstersDir)) {
            fs.mkdirSync(monstersDir, { recursive: true });
        }
        const allowedExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];
        const rawExt = path.extname(filename || '').toLowerCase();
        const ext = allowedExts.includes(rawExt) ? rawExt : '.png';
        const rawBase = path.basename(filename || 'monster', rawExt)
            .replace(/[^a-zA-Z0-9_\- ]+/g, '')
            .trim() || 'monster';
        let safeName = `${rawBase}${ext}`;
        let counter = 1;
        while (fs.existsSync(path.join(monstersDir, safeName))) {
            safeName = `${rawBase}_${counter}${ext}`;
            counter++;
        }

        const match = dataUrl.match(/^data:[a-zA-Z0-9-+\/.]+;base64,(.+)$/);
        const base64Data = match ? match[1] : dataUrl;
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(path.join(monstersDir, safeName), buffer);

        const distMonstersDir = path.join(__dirname, 'dist', 'images', 'monsters');
        if (fs.existsSync(distMonstersDir)) {
            try { fs.writeFileSync(path.join(distMonstersDir, safeName), buffer); } catch (_) {}
        }

        res.json({
            success: true,
            filename: safeName,
            url: `/images/monsters/${encodeURIComponent(safeName)}`
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

createSocketHandlers({
    io,
    stateRef,
    dmToken,
    saveState: autosaveScheduler.schedule
});

app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

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

function openInBrowser(url) {
    if (process.env.OPEN_BROWSER === 'false' || process.env.NODE_ENV === 'test' || process.env.CI) {
        return;
    }
    try {
        const { spawn } = require('child_process');
        if (process.platform === 'win32') {
            spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], {
                detached: true,
                stdio: 'ignore'
            }).unref();
        } else if (process.platform === 'darwin') {
            spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
        } else {
            spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
        }
    } catch {
        // Silently ignore if browser launcher is unavailable
    }
}

if (require.main === module) {
    let shuttingDown = false;
    async function shutdown() {
        if (shuttingDown) return;
        shuttingDown = true;
        io.close();
        server.close();
        const result = await autosaveScheduler.flush();
        process.exit(result.ok ? 0 : 1);
    }
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
    const localIP = getLocalIp();
    server.listen(PORT, '0.0.0.0', () => {
        const dmUrl = `http://localhost:${PORT}?mode=dm&token=${dmToken}`;
        console.log('\n========================================');
        console.log('D&D Tracker Server Running');
        console.log('========================================');
        console.log(`DM Access:     ${dmUrl}`);
        console.log(`Player Access: http://${localIP}:${PORT}?mode=player`);
        console.log(`Autosave:      ${AUTOSAVE_FILE}`);
        if (!fs.existsSync(distPath)) {
            console.log('React build not found. Use `npm.cmd run dev` for Vite dev mode or `npm.cmd run build` before `npm.cmd start`.');
        }
        console.log('========================================\n');
        openInBrowser(dmUrl);
    });
}

module.exports = {
    app,
    server,
    io,
    stateRef,
    dmToken
};
