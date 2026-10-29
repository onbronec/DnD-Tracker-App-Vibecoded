const { createInitialState } = require('../../server/defaults');
const { applyGameAction, undoPage, redoPage } = require('../../server/actions');
const { pruneHistory, SNAPSHOT_BUDGET } = require('../../server/history');
const { authorizeAction } = require('../../server/permissions');
const { migrateAutosave } = require('../../server/migrations');
const { filterStateForClient } = require('../../server/visibility');
const dm = { id: 'dm', role: 'dm' };

describe('history retention and party results', () => {
    it('expires old entries and redo IDs without resetting the lifetime counter', () => {
        const state = createInitialState();
        const now = Date.now();
        state.nextSequence = 2516;
        state.actionLog = [31, 29].map((days, i) => ({ id: String(i), timestamp: new Date(now - days * 86400000).toISOString(), reversible: true, before: {}, after: {} }));
        state.redoStacks.combat = ['0', '1'];
        pruneHistory(state, now);
        expect(state.actionLog.map(entry => entry.id)).toEqual(['1']);
        expect(state.redoStacks.combat).toEqual(['1']);
        expect(state.nextSequence).toBe(2516);
    });

    it('bounds undo snapshot size and keeps older log descriptions', () => {
        const state = createInitialState();
        state.actionLog = [
            { id: 'large', timestamp: new Date().toISOString(), reversible: true, before: { text: 'x'.repeat(SNAPSHOT_BUDGET) }, after: {} },
            { id: 'recent', timestamp: new Date().toISOString(), reversible: true, before: {}, after: {} }
        ];
        pruneHistory(state);
        expect(state.actionLog).toHaveLength(2);
        expect(state.actionLog[0].before).toBeUndefined();
        expect(state.actionLog[0].reversible).toBe(false);
        expect(state.actionLog[1].reversible).toBe(true);
    });

    it('clears history and redo without changing campaign data; only DM may request it', () => {
        const state = createInitialState();
        applyGameAction(state, { type: 'character.add', payload: { type: 'player', name: 'Hero', maxHp: 20 } }, dm);
        const before = JSON.stringify(state.characters);
        const sequence = state.nextSequence;
        expect(authorizeAction(state, { type: 'history.clear' }, { role: 'player' }).ok).toBe(false);
        applyGameAction(state, { type: 'history.clear' }, dm);
        expect(state.actionLog).toEqual([]);
        expect(state.redoStacks).toEqual({});
        expect(JSON.stringify(state.characters)).toBe(before);
        expect(state.nextSequence).toBe(sequence);
    });

    it('accumulates rapid custom feature adjustments and preserves undo/redo', () => {
        const state = createInitialState();
        applyGameAction(state, { type: 'character.add', payload: { id: 'hero', type: 'player', name: 'Hero', maxHp: 20, customFeatures: [{ name: 'Vitae', maxUses: 100, used: 11 }] } }, dm);
        const action = { type: 'spell.feature.uses', payload: { characterId: 'hero', index: 0, delta: 1 } };
        for (let i = 0; i < 8; i++) applyGameAction(state, action, dm);
        expect(state.characters[0].customFeatures[0].used).toBe(19);
        undoPage(state, 'spells', dm);
        expect(state.characters[0].customFeatures[0].used).toBe(18);
        redoPage(state, 'spells', dm);
        expect(state.characters[0].customFeatures[0].used).toBe(19);
    });

    it('persists DM party results, supports undo and omits them from player state', () => {
        const state = createInitialState();
        applyGameAction(state, { type: 'character.add', payload: { id: 'hero', type: 'player', name: 'Hero', maxHp: 20 } }, dm);
        const action = { type: 'toolbelt.partyCheck.record', payload: { checkKey: 'skill:stealth', results: [{ characterId: 'hero', total: 14, natural: 9, detail: 'd20: 9; base +5' }] } };
        expect(authorizeAction(state, action, { role: 'player' }).ok).toBe(false);
        applyGameAction(state, action, dm);
        expect(migrateAutosave(JSON.parse(JSON.stringify(state))).toolbelt.partyChecks['skill:stealth'].hero.total).toBe(14);
        expect(filterStateForClient(state, 'player').toolbelt.partyChecks).toBeUndefined();
        expect(filterStateForClient(state, 'player').actionLog.some(entry => entry.type === action.type)).toBe(false);
        undoPage(state, 'toolbelt', dm);
        expect(state.toolbelt.partyChecks['skill:stealth']).toBeUndefined();
        redoPage(state, 'toolbelt', dm);
        expect(state.toolbelt.partyChecks['skill:stealth'].hero.natural).toBe(9);
    });

    it('sets monster slot usage to an exact number and accumulates rapid adjustments', () => {
        const state = createInitialState();
        applyGameAction(state, { type: 'character.add', payload: { id: 'caster', type: 'monster', name: 'Caster', maxHp: 20, monsterAbilities: { spellcasting: { enabled: true, spellSlots: { '1': { max: 20, used: 11 } } } } } }, dm);
        applyGameAction(state, { type: 'monster.spellSlot.toggle', payload: { characterId: 'caster', level: '1', used: 7 } }, dm);
        expect(state.characters[0].monsterAbilities.spellcasting.spellSlots['1'].used).toBe(7);
        for (let i = 0; i < 4; i++) applyGameAction(state, { type: 'monster.spellSlot.toggle', payload: { characterId: 'caster', level: '1', used: 8, delta: 1 } }, dm);
        expect(state.characters[0].monsterAbilities.spellcasting.spellSlots['1'].used).toBe(11);
    });
});
