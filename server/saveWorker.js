const { parentPort } = require('worker_threads');
const fs = require('fs');
const path = require('path');

parentPort.once('message', ({ state, filePath }) => {
    const temporaryPath = `${filePath}.tmp`;
    try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(temporaryPath, JSON.stringify({ ...state, timestamp: new Date().toISOString() }), 'utf8');
        fs.renameSync(temporaryPath, filePath);
        parentPort.postMessage({ ok: true });
    } catch (error) {
        parentPort.postMessage({ ok: false, error: error.message });
    } finally {
        parentPort.close();
    }
});
