const fs = require('fs');
const path = require('path');
const { createInitialState } = require('./defaults');
const { migrateAutosave } = require('./migrations');

const AUTOSAVE_FILE = process.env.DND_AUTOSAVE_FILE || path.join(__dirname, '..', 'dnd-tracker-autosave.json');

function loadStateFromDisk(filePath = AUTOSAVE_FILE) {
    try {
        if (!fs.existsSync(filePath)) {
            return createInitialState();
        }
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return migrateAutosave(raw);
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
    saveNow = saveStateToDisk,
    onError = error => console.error('Autosave failed:', error)
} = {}) {
    let timer = null;

    function clearPendingTimer() {
        if (!timer) return;
        clearTimeout(timer);
        timer = null;
    }

    function flush() {
        clearPendingTimer();
        try {
            saveNow(getState(), filePath);
            return { ok: true };
        } catch (error) {
            onError(error);
            return { ok: false, error };
        }
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

module.exports = {
    AUTOSAVE_FILE,
    loadStateFromDisk,
    saveStateToDisk,
    createDebouncedStateSaver
};
