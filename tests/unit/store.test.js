const fs = require('fs');
const os = require('os');
const path = require('path');
const { createDebouncedStateSaver, loadStateFromDisk, saveStateToDisk } = require('../../server/store');
const { createInitialState } = require('../../server/defaults');

describe('store performance behavior', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('debounces action autosaves instead of writing synchronously on every action', () => {
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
        vi.advanceTimersByTime(1);
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
});
