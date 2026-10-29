const { applyGameAction, redoPage, undoPage } = require('./actions');
const { authorizeAction, canUseHistory } = require('./permissions');
const { filterHistoryForPlayer, filterStateForClient, stripHistorySnapshots } = require('./visibility');
const { isDeepStrictEqual } = require('util');

function createSocketHandlers({ io, stateRef, dmToken, saveState }) {
    const clients = new Map();
    const lastStates = new Map();

    function clientFor(socket) {
        return clients.get(socket.id) || { id: socket.id, role: 'player' };
    }

    function emitStateTo(socket) {
        const client = clientFor(socket);
        const state = filterStateForClient(stateRef.current, client.role);
        lastStates.set(client.role, state);
        socket.emit('state:init', state);
    }

    function broadcastPatch(entry) {
        const patches = new Map();
        io.sockets.sockets.forEach(socket => {
            const client = clientFor(socket);
            if (!patches.has(client.role)) {
                const next = filterStateForClient(stateRef.current, client.role);
                const previous = lastStates.get(client.role) || {};
                const patch = Object.fromEntries(Object.entries(next).filter(([key, value]) => !isDeepStrictEqual(value, previous[key])));
                lastStates.set(client.role, next);
                patches.set(client.role, patch);
            }
            socket.emit('state:patch', {
                state: patches.get(client.role),
                entry: sanitizeEntry(entry, client.role)
            });
        });
    }

    io.on('connection', socket => {
        clients.set(socket.id, { id: socket.id, role: 'player' });
        emitStateTo(socket);

        socket.on('auth:register', payload => {
            const requestedRole = payload?.mode === 'dm' ? 'dm' : 'player';
            const role = requestedRole === 'dm' && payload?.token === dmToken ? 'dm' : 'player';
            clients.set(socket.id, { id: socket.id, role });
            socket.emit('auth:registered', { role, validDmToken: requestedRole !== 'dm' || role === 'dm' });
            emitStateTo(socket);
        });

        socket.on('action:submit', (action, ack) => {
            const client = clientFor(socket);
            try {
                const permission = authorizeAction(stateRef.current, action, client);
                if (!permission.ok) throw new Error(permission.reason);
                const { entry } = applyGameAction(stateRef.current, action, client);
                saveState();
                socket.emit('action:accepted', sanitizeEntry(entry, client.role));
                broadcastPatch(entry);
                if (typeof ack === 'function') ack({ ok: true, entry: sanitizeEntry(entry, client.role) });
            } catch (error) {
                const message = error.message || 'Akce selhala.';
                if (typeof ack === 'function') ack({ ok: false, error: message });
                socket.emit('action:rejected', { error: message, action });
            }
        });

        socket.on('history:list', (_payload, ack) => {
            const client = clientFor(socket);
            const list = client.role === 'dm'
                ? stripHistorySnapshots(stateRef.current.actionLog)
                : filterHistoryForPlayer(stateRef.current.actionLog);
            if (typeof ack === 'function') ack({ ok: true, actionLog: list });
        });

        socket.on('history:undo', (payload, ack) => {
            const client = clientFor(socket);
            const page = payload?.page || 'combat';
            try {
                if (!canUseHistory(page, client)) throw new Error('Pro tuto historii nemas opravneni.');
                const { entry } = undoPage(stateRef.current, page, client);
                saveState();
                if (typeof ack === 'function') ack({ ok: true, entry: sanitizeEntry(entry, client.role) });
                broadcastPatch(entry);
            } catch (error) {
                const message = error.message || 'Undo selhalo.';
                if (typeof ack === 'function') ack({ ok: false, error: message });
                socket.emit('history:error', { error: message });
            }
        });

        socket.on('history:redo', (payload, ack) => {
            const client = clientFor(socket);
            const page = payload?.page || 'combat';
            try {
                if (!canUseHistory(page, client)) throw new Error('Pro tuto historii nemas opravneni.');
                const { entry } = redoPage(stateRef.current, page, client);
                saveState();
                if (typeof ack === 'function') ack({ ok: true, entry: sanitizeEntry(entry, client.role) });
                broadcastPatch(entry);
            } catch (error) {
                const message = error.message || 'Redo selhalo.';
                if (typeof ack === 'function') ack({ ok: false, error: message });
                socket.emit('history:error', { error: message });
            }
        });

        socket.on('disconnect', () => {
            clients.delete(socket.id);
        });
    });
}

function sanitizeEntry(entry, role) {
    if (!entry) return entry;
    if (role !== 'dm' && entry.visibility === 'dm') return null;
    const safe = { ...entry };
    delete safe.before;
    delete safe.after;
    return safe;
}

module.exports = {
    createSocketHandlers
};
