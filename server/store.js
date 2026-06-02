const fs = require('fs');
const path = require('path');
const { createInitialState } = require('./defaults');
const { migrateAutosave } = require('./migrations');
const { clone } = require('./utils');

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
        ...clone(state),
        timestamp: new Date().toISOString()
    };
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

module.exports = {
    AUTOSAVE_FILE,
    loadStateFromDisk,
    saveStateToDisk
};
