const HISTORY_DAYS = 30;
const LOG_LIMIT = 500;
const SNAPSHOT_BUDGET = 16 * 1024 * 1024;
const sizes = new WeakMap();

function pruneHistory(state, now = Date.now()) {
    const cutoff = now - HISTORY_DAYS * 86400000;
    state.actionLog = (state.actionLog || [])
        .filter(entry => Date.parse(entry.timestamp) >= cutoff)
        .slice(-LOG_LIMIT);

    // Keep recent undo snapshots within a fixed budget, even after large database imports.
    let bytes = 0;
    for (let index = state.actionLog.length - 1; index >= 0; index -= 1) {
        const entry = state.actionLog[index];
        if (entry.reversible && entry.before && entry.after) {
            if (!sizes.has(entry)) sizes.set(entry, Buffer.byteLength(JSON.stringify([entry.before, entry.after])));
            bytes += sizes.get(entry);
            if (bytes <= SNAPSHOT_BUDGET) continue;
        }
        delete entry.before;
        delete entry.after;
        entry.reversible = false;
    }
    const reversibleIds = new Set(state.actionLog.filter(entry => entry.reversible).map(entry => entry.id));
    for (const page of Object.keys(state.redoStacks || {})) {
        state.redoStacks[page] = state.redoStacks[page].filter(id => reversibleIds.has(id));
    }
}

module.exports = { pruneHistory, HISTORY_DAYS, LOG_LIMIT, SNAPSHOT_BUDGET };
