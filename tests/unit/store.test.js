const fs = require('fs');
const os = require('os');
const path = require('path');
const { createDebouncedStateSaver, loadStateFromDisk, saveStateToDisk } = require('../../server/store');
const { createInitialState } = require('../../server/defaults');

describe('store performance behavior', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('debounces action autosaves instead of writing synchronously on every action', async () => {
        vi.useFakeTimers();
        const writes = [];
        const state = createInitialState();
        const saver = createDebouncedStateSaver(() => state, {
            delayMs: 100,
            saveNow: value => writes.push(value.nextSequence)
        });

        saver.schedule();
        saver.schedule();
        expect(writes).toEqual([]);
        vi.advanceTimersByTime(99);
        expect(writes).toEqual([]);
        await vi.advanceTimersByTimeAsync(1);
        expect(writes).toEqual([1]);
    });

    it('writes compact JSON that still loads through migration', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dnd-store-'));
        const file = path.join(dir, 'autosave.json');
        const state = createInitialState();
        state.characters.push({ id: 'hero', name: 'Hero', type: 'player', maxHp: 10, currentHp: 10, tempHp: 0, ac: 10, initBonus: 0, initiative: null, effects: [], revealedToPlayers: true });

        saveStateToDisk(state, file);
        const raw = fs.readFileSync(file, 'utf8');
        expect(raw).not.toContain('\n  "');
        const loaded = loadStateFromDisk(file);
        expect(loaded.characters[0]).toEqual(expect.objectContaining({ id: 'hero', name: 'Hero' }));
    });

    it('saves in a worker and flush waits for a complete readable file', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dnd-worker-'));
        const file = path.join(dir, 'autosave.json');
        const state = createInitialState();
        const saver = createDebouncedStateSaver(() => state, { filePath: file });
        expect((await saver.flush()).ok).toBe(true);
        expect(JSON.parse(fs.readFileSync(file, 'utf8')).nextSequence).toBe(1);
        expect(fs.existsSync(`${file}.tmp`)).toBe(false);
        state.nextSequence = 2;
        expect((await saver.flush()).ok).toBe(true);
        expect(loadStateFromDisk(file).nextSequence).toBe(2);
    });

    it('serializes overlapping saves so an older write cannot replace a newer one', async () => {
        const state = createInitialState();
        const writes = [];
        let release;
        const saver = createDebouncedStateSaver(() => state, { saveNow: async value => {
            const sequence = value.nextSequence;
            if (sequence === 1) await new Promise(resolve => { release = resolve; });
            writes.push(sequence);
        } });
        const first = saver.flush();
        await Promise.resolve();
        state.nextSequence = 2;
        const second = saver.flush();
        expect(writes).toEqual([]);
        release();
        await Promise.all([first, second]);
        expect(writes).toEqual([1, 2]);
    });
});
