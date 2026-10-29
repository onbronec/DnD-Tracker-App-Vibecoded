const fs = require('fs');
const path = require('path');
const { Worker } = require('worker_threads');
const { pruneHistory } = require('./history');
const { createInitialState } = require('./defaults');
const { migrateAutosave } = require('./migrations');

const AUTOSAVE_FILE = process.env.DND_AUTOSAVE_FILE || path.join(__dirname, '..', 'dnd-tracker-autosave.json');

function loadStateFromDisk(filePath = AUTOSAVE_FILE) {
    try {
        if (!fs.existsSync(filePath)) {
            return createInitialState();
        }
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const state = migrateAutosave(raw);
        pruneHistory(state);
        return state;
    } catch (error) {
        console.error('Failed to load autosave:', error);
        return createInitialState();
    }
}

function saveStateToDisk(state, filePath = AUTOSAVE_FILE) {
    const payload = {
        ...state,
        timestamp: new Date().toISOString()
    };
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(payload), 'utf8');
}

function createDebouncedStateSaver(getState, {
    delayMs = 750,
    filePath = AUTOSAVE_FILE,
    saveNow = saveStateInWorker,
    onError = error => console.error('Autosave failed:', error)
} = {}) {
    let timer = null;
    let inFlight = Promise.resolve();

    function clearPendingTimer() {
        if (!timer) return;
        clearTimeout(timer);
        timer = null;
    }

    function flush() {
        clearPendingTimer();
        const operation = inFlight.then(() => saveNow(getState(), filePath));
        inFlight = operation.catch(() => {});
        return operation.then(() => ({ ok: true }), error => {
            onError(error);
            return { ok: false, error };
        });
    }

    function schedule() {
        clearPendingTimer();
        timer = setTimeout(() => {
            timer = null;
            flush();
        }, delayMs);
        return { ok: true, scheduled: true };
    }

    return {
        schedule,
        flush,
        hasPending: () => Boolean(timer)
    };
}

function saveStateInWorker(state, filePath) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, 'saveWorker.js'));
        worker.once('error', reject);
        worker.once('exit', code => {
            if (code !== 0) reject(new Error(`Autosave worker exited with code ${code}`));
        });
        worker.once('message', result => result.ok ? resolve() : reject(new Error(result.error)));
        worker.postMessage({ state, filePath });
    });
}

module.exports = {
    AUTOSAVE_FILE,
    loadStateFromDisk,
    saveStateToDisk,
    saveStateInWorker,
    createDebouncedStateSaver
};
