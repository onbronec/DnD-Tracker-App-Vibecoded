const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { io: Client } = require('socket.io-client');
const { createInitialState } = require('../../server/defaults');
const { createSocketHandlers } = require('../../server/socketHandlers');

function player() {
    return {
        id: 'hero',
        name: 'Hero',
        type: 'player',
        maxHp: 20,
        currentHp: 10,
        tempHp: 0,
        ac: 14,
        initBonus: 2,
        initiative: null,
        effects: [],
        revealedToPlayers: true,
        spellcasterLevel: 0,
        spellSlots: {},
        customFeatures: [],
        hitDice: { max: 0, current: 0 },
        inventory: {
            currency: { manaCoins: 0, platinum: 0, gold: 0, silver: 0, copper: 0 },
            spellComponents: [],
            potions: [],
            scrolls: [],
            generalItems: [],
            magicItems: []
        }
    };
}

async function startHarness() {
    const app = express();
    const httpServer = http.createServer(app);
    const io = new Server(httpServer);
    const stateRef = { current: createInitialState() };
    stateRef.current.characters.push(player());
    createSocketHandlers({
        io,
        stateRef,
        dmToken: 'secret',
        saveState: () => {}
    });
    await new Promise(resolve => httpServer.listen(0, resolve));
    const port = httpServer.address().port;
    return { io, httpServer, stateRef, url: `http://127.0.0.1:${port}` };
}

function connect(url, auth) {
    const socket = Client(url, { reconnection: false });
    return new Promise(resolve => {
        socket.on('state:init', () => {
            socket.emit('auth:register', auth);
        });
        socket.on('auth:registered', payload => resolve({ socket, payload }));
    });
}

describe('socket roles and actions', () => {
    it('grants DM role only with token', async () => {
        const harness = await startHarness();
        const dm = await connect(harness.url, { mode: 'dm', token: 'secret' });
        const playerClient = await connect(harness.url, { mode: 'dm', token: 'bad' });
        expect(dm.payload.role).toBe('dm');
        expect(playerClient.payload.role).toBe('player');
        dm.socket.disconnect();
        playerClient.socket.disconnect();
        harness.io.close();
        await new Promise(resolve => harness.httpServer.close(resolve));
    });

    it('rejects player DM-only actions and accepts player HP action', async () => {
        const harness = await startHarness();
        const client = await connect(harness.url, { mode: 'player' });
        const startResult = await new Promise(resolve => client.socket.emit('action:submit', { type: 'combat.start' }, resolve));
        expect(startResult.ok).toBe(false);
        const hpResult = await new Promise(resolve => client.socket.emit('action:submit', { type: 'character.adjustHp', payload: { characterId: 'hero', amount: 5 } }, resolve));
        expect(hpResult.ok).toBe(true);
        expect(harness.stateRef.current.characters[0].currentHp).toBe(15);
        client.socket.disconnect();
        harness.io.close();
        await new Promise(resolve => harness.httpServer.close(resolve));
    });
});
