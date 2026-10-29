const { createInitialState } = require('../../server/defaults');
const { normalizeCharacter, migrateAutosave } = require('../../server/migrations');
const { applyGameAction, undoPage, redoPage } = require('../../server/actions');
const { authorizeAction } = require('../../server/permissions');
const dm = { id: 'dm', role: 'dm' };
const player = { id: 'player', role: 'player' };

function stateWith(character, spells = []) {
    const state = createInitialState();
    state.characters = [normalizeCharacter(character)];
    state.spellDatabase = spells;
    return state;
}
function cast(state, spellId, level) {
    return applyGameAction(state, { type: 'spell.cast', payload: { characterId: state.characters[0].id, spellId, level } }, player);
}

describe('optional round duration', () => {
    it('expires only timed conditions at round end, with one tick per physical monster turn pair', () => {
        const state = stateWith({ id: 'hero', name: 'Hero', effects: [{ name: 'Hasted', remainingRounds: 1 }, { name: 'Poisoned', remainingRounds: 2 }, { name: 'Blessed' }] });
        state.characters.push(normalizeCharacter({ id: 'orc', type: 'monster', effects: [{ name: 'Stunned', remainingRounds: 2 }] }));
        state.characters.push(normalizeCharacter({ id: 'orc_turn2', type: 'monster', effects: [{ name: 'Stunned', remainingRounds: 2 }] }));
        state.combatState = { active: true, currentTurn: 0, round: 1, playedThisRound: [] };
        applyGameAction(state, { type: 'combat.nextTurn' }, dm);
        expect(state.characters[0].effects[0].remainingRounds).toBe(1);
        applyGameAction(state, { type: 'combat.nextTurn' }, dm);
        applyGameAction(state, { type: 'combat.nextTurn' }, dm);
        expect(state.characters[0].effects).toEqual([{ name: 'Poisoned', level: null, remainingRounds: 1 }, { name: 'Blessed', level: null }]);
        expect(state.characters[1].effects[0].remainingRounds).toBe(1);
        expect(state.characters[2].effects[0].remainingRounds).toBe(1);
        for (let i = 0; i < 3; i++) applyGameAction(state, { type: 'combat.nextTurn' }, dm);
        expect(state.characters[0].effects.map(effect => effect.name)).toEqual(['Blessed']);
        expect(state.characters[1].effects).toEqual([]);
    });

    it('restores expiry through undo/redo and does not tick twice after previous/next navigation', () => {
        const state = stateWith({ id: 'hero', name: 'Hero', effects: [{ name: 'Stunned', remainingRounds: 2 }] });
        state.combatState = { active: true, currentTurn: 0, round: 1, playedThisRound: [] };
        applyGameAction(state, { type: 'combat.nextTurn' }, dm);
        expect(state.characters[0].effects[0].remainingRounds).toBe(1);
        undoPage(state, 'combat', dm);
        expect(state.characters[0].effects[0].remainingRounds).toBe(2);
        redoPage(state, 'combat', dm);
        applyGameAction(state, { type: 'combat.previousTurn' }, dm);
        applyGameAction(state, { type: 'combat.nextTurn' }, dm);
        expect(state.characters[0].effects[0].remainingRounds).toBe(1);
        applyGameAction(state, { type: 'combat.nextTurn' }, dm);
        expect(state.characters[0].effects).toEqual([]);
    });

    it('persists duration and lets players change only player condition timers', () => {
        const state = stateWith({ id: 'hero', name: 'Hero', effects: ['Stunned'] });
        const action = { type: 'effect.duration.set', payload: { characterId: 'hero', index: 0, remainingRounds: 3 } };
        expect(authorizeAction(state, action, player).ok).toBe(true);
        applyGameAction(state, action, player);
        const loaded = migrateAutosave(JSON.parse(JSON.stringify(state)));
        expect(loaded.characters[0].effects[0].remainingRounds).toBe(3);
        applyGameAction(state, { ...action, payload: { ...action.payload, remainingRounds: 0 } }, player);
        expect(state.characters[0].effects[0].remainingRounds).toBeUndefined();
        state.characters[0].type = 'monster';
        expect(authorizeAction(state, action, player).ok).toBe(false);
    });
});

describe('casting resources and tracked actions', () => {
    it('spends reactions and shared feature uses atomically for mixed action types', () => {
        const state = stateWith({ id: 'hero', name: 'Hero', maxReactions: 2, currentReactions: 2, customFeatures: [{ id: 'pool', name: 'Shared power', maxUses: 5, used: 0, isAction: true, actions: [
            { id: 'normal', name: 'Strike', actionType: 'action' },
            { id: 'bonus', name: 'Quick Strike', actionType: 'bonus' },
            { id: 'reaction', name: 'Parry', actionType: 'reaction' },
            { id: 'free', name: 'Free Parry', actionType: 'reaction', consumesReaction: false }
        ] }] });
        const use = actionId => ({ type: 'spell.feature.action.use', payload: { characterId: 'hero', featureId: 'pool', actionId } });
        applyGameAction(state, use('normal'), player);
        applyGameAction(state, use('bonus'), player);
        expect(state.characters[0].currentReactions).toBe(2);
        applyGameAction(state, use('reaction'), player);
        expect(state.characters[0]).toMatchObject({ currentReactions: 1, customFeatures: [{ used: 3 }] });
        undoPage(state, 'spells', dm);
        expect(state.characters[0]).toMatchObject({ currentReactions: 2, customFeatures: [{ used: 2 }] });
        redoPage(state, 'spells', dm);
        applyGameAction(state, use('reaction'), player);
        expect(state.characters[0].currentReactions).toBe(0);
        expect(() => applyGameAction(state, use('reaction'), player)).toThrow();
        expect(state.characters[0].customFeatures[0].used).toBe(4);
        applyGameAction(state, use('free'), player);
        expect(state.characters[0]).toMatchObject({ currentReactions: 0, customFeatures: [{ used: 5 }] });
        state.characters[0].currentReactions = 1;
        expect(() => applyGameAction(state, use('reaction'), player)).toThrow();
        expect(state.characters[0].currentReactions).toBe(1);
        const loaded = migrateAutosave(JSON.parse(JSON.stringify(state)));
        expect(loaded.characters[0].customFeatures[0].actions).toEqual(state.characters[0].customFeatures[0].actions);
    });

    it('supports standalone bonus/reaction notes and single tracked reactions through save and undo', () => {
        const state = stateWith({ id: 'hero', name: 'Hero', currentReactions: 1, customFeatures: [{ id: 'parry', name: 'Parry', maxUses: 3, used: 0, isAction: true, actionType: 'reaction' }], characterActions: [{ id: 'dash', name: 'Quick Dash', actionType: 'bonus', description: '**Dash** as a bonus action.' }, { id: 'opportunity', name: 'Opportunity Attack', actionType: 'reaction', description: 'Attack a departing enemy.' }] });
        const useFeature = { type: 'spell.feature.use', payload: { characterId: 'hero', featureId: 'parry' } };
        const useNote = { type: 'spell.action.use', payload: { characterId: 'hero', id: 'opportunity' } };
        expect(authorizeAction(state, useFeature, player).ok).toBe(true);
        expect(authorizeAction(state, useNote, player).ok).toBe(true);
        applyGameAction(state, useNote, player);
        expect(state.characters[0].currentReactions).toBe(0);
        expect(state.characters[0].customFeatures[0].used).toBe(0);
        expect(() => applyGameAction(state, useFeature, player)).toThrow();
        undoPage(state, 'spells', dm);
        applyGameAction(state, useFeature, player);
        expect(state.characters[0]).toMatchObject({ currentReactions: 0, customFeatures: [{ used: 1 }] });
        applyGameAction(state, { type: 'spell.action.upsert', payload: { characterId: 'hero', action: { id: 'opportunity', name: 'Opportunity Attack', actionType: 'reaction', consumesReaction: false, description: '**Updated** rule.' } } }, player);
        applyGameAction(state, useNote, player);
        expect(state.characters[0].currentReactions).toBe(0);
        const loaded = migrateAutosave(JSON.parse(JSON.stringify(state)));
        expect(loaded.characters[0].characterActions).toEqual(state.characters[0].characterActions);
        expect(loaded.characters[0].characterActions[0].actionType).toBe('bonus');
        state.characters[0].type = 'monster';
        expect(authorizeAction(state, useFeature, player).ok).toBe(false);
        expect(authorizeAction(state, useNote, player).ok).toBe(false);
    });

    it('shares a feature pool across named actions, logs the selected action and persists edits', () => {
        const state = stateWith({ id: 'hero', name: 'Hero', customFeatures: [{ id: 'channel', name: 'Channel Divinity', maxUses: 1, used: 0, isAction: true, shortRestRegainType: 'all', description: 'Shared rules.', actions: [{ id: 'turn', name: 'Turn Undead', description: '**Turn** nearby undead.' }, { id: 'radiance', name: 'Radiance of the Dawn', description: 'Deal radiant damage.' }] }] });
        const use = actionId => ({ type: 'spell.feature.action.use', payload: { characterId: 'hero', featureId: 'channel', actionId } });
        expect(authorizeAction(state, use('turn'), player).ok).toBe(true);
        applyGameAction(state, use('turn'), player);
        expect(state.characters[0].customFeatures[0].used).toBe(1);
        expect(state.actionLog.at(-1).label).toContain('Turn Undead');
        expect(() => applyGameAction(state, use('radiance'), player)).toThrow();
        undoPage(state, 'spells', dm);
        expect(state.characters[0].customFeatures[0].used).toBe(0);
        redoPage(state, 'spells', dm);
        applyGameAction(state, { type: 'spell.rest.character', payload: { characterId: 'hero', restType: 'short' } }, player);
        applyGameAction(state, use('radiance'), player);
        expect(state.characters[0].customFeatures[0].used).toBe(1);
        const updatedActions = state.characters[0].customFeatures[0].actions.map(action => ({ ...action, description: `${action.description} Updated.` }));
        applyGameAction(state, { type: 'spell.feature.update', payload: { characterId: 'hero', featureId: 'channel', name: 'Channel Divinity', maxUses: 1, isAction: true, actions: updatedActions } }, player);
        const loaded = migrateAutosave(JSON.parse(JSON.stringify(state)));
        expect(loaded.characters[0].customFeatures[0]).toMatchObject({ used: 1, actions: updatedActions });
        expect(() => applyGameAction(state, use('missing'), player)).toThrow();
        expect(() => applyGameAction(state, { type: 'spell.feature.update', payload: { characterId: 'hero', featureId: 'channel', name: 'Channel Divinity', actions: [{ name: '' }] } }, player)).toThrow();
        state.characters[0].type = 'monster';
        expect(authorizeAction(state, use('turn'), player).ok).toBe(false);
    });

    it('validates casting setup, preserves usage and restores settings through undo/redo', () => {
        const state = stateWith({ id: 'hero', name: 'Hero', customFeatures: [{ id: 'pact', name: 'Pact', maxUses: 4, used: 2 }], spellSlots: { '6': { max: 2, used: 1 } } });
        const action = { type: 'spell.casting.update', payload: { characterId: 'hero', casting: { type: 'warlock', featureByLevel: Object.fromEntries(['1', '2', '3', '4', '5'].map(level => [level, 'pact'])) }, slotMaxByLevel: { '6': 3 } } };
        expect(authorizeAction(state, action, player).ok).toBe(true);
        applyGameAction(state, action, player);
        expect(state.characters[0].spellSlots['6']).toEqual({ max: 3, used: 1 });
        expect(state.characters[0].customFeatures[0].used).toBe(2);
        undoPage(state, 'spells', dm);
        expect(state.characters[0].casting.type).toBe('standard');
        expect(state.characters[0].spellSlots['6']).toEqual({ max: 2, used: 1 });
        redoPage(state, 'spells', dm);
        expect(state.characters[0].casting.featureByLevel['5']).toBe('pact');
        const before = JSON.stringify(state.characters[0]);
        expect(() => applyGameAction(state, { ...action, payload: { ...action.payload, casting: { type: 'warlock', featureByLevel: { '1': 'pact' } } } }, player)).toThrow();
        expect(() => applyGameAction(state, { ...action, payload: { ...action.payload, slotMaxByLevel: { '6': -1 } } }, player)).toThrow();
        expect(JSON.stringify(state.characters[0])).toBe(before);
        const loaded = migrateAutosave(JSON.parse(JSON.stringify(state)));
        expect(loaded.characters[0].casting).toEqual(state.characters[0].casting);
        state.characters[0].type = 'monster';
        expect(authorizeAction(state, action, player).ok).toBe(false);
    });

    it('migrates Nif to shared existing feature resources and recovers them all on short rest', () => {
        const state = stateWith({ id: 'nif', name: 'Nif', maxHp: 50, currentHp: 10, customFeatures: ['Warlock Spells', 'Asuryan Blessing', 'Force Cage', 'Storm of Light-Lings', 'Foresight'].map((name, index) => ({ name, maxUses: index ? 1 : 4, used: 0 })), spellbook: { knownSpellIds: ['low', 'high', 'epic'] }, spellSlots: { epic1: { max: 1, used: 1 } } }, [{ id: 'low', name: 'Low spell', levelKey: '1' }, { id: 'high', name: 'High spell', levelKey: '9' }, { id: 'epic', name: 'Epic spell', levelKey: 'epic1' }]);
        expect(state.characters[0].casting.type).toBe('warlock');
        expect(new Set(['1', '2', '3', '4', '5'].map(level => state.characters[0].casting.featureByLevel[level])).size).toBe(1);
        cast(state, 'low', '1');
        cast(state, 'low', '5');
        cast(state, 'high', '9');
        expect(state.characters[0].customFeatures[0].used).toBe(2);
        expect(state.characters[0].customFeatures[4].used).toBe(1);
        expect(() => cast(state, 'high', '9')).toThrow();
        applyGameAction(state, { type: 'spell.rest.character', payload: { characterId: 'nif', restType: 'short' } }, player);
        expect(state.characters[0].customFeatures.every(feature => feature.used === 0)).toBe(true);
        expect(state.characters[0].spellSlots.epic1.used).toBe(1);
        expect(state.characters[0].currentHp).toBe(10);
    });

    it('recovers native warlock slots at levels 6–9 on short rest and leaves standard slots spent', () => {
        const state = stateWith({ id: 'hero', name: 'Hero', customFeatures: [{ id: 'pact', name: 'Pact', maxUses: 2, used: 2 }], casting: { type: 'warlock', featureByLevel: Object.fromEntries(['1', '2', '3', '4', '5'].map(level => [level, 'pact'])) }, spellSlots: Object.fromEntries(['6', '7', '8', '9'].map(level => [level, { max: 1, used: 1 }])) });
        applyGameAction(state, { type: 'spell.rest.character', payload: { characterId: 'hero', restType: 'short' } }, player);
        expect(Object.values(state.characters[0].spellSlots).every(slots => slots.used === 0)).toBe(true);
        state.characters[0].casting.type = 'standard';
        state.characters[0].spellSlots['6'].used = 1;
        applyGameAction(state, { type: 'spell.rest.character', payload: { characterId: 'hero', restType: 'short' } }, player);
        expect(state.characters[0].spellSlots['6'].used).toBe(1);
    });

    it('consumes Divine Spark condition first, then feature uses, without recreating it on rest', () => {
        const state = stateWith({ id: 'anir', name: 'Anir', customFeatures: [{ name: 'Divine Spark', maxUses: 2, used: 0, statusEffect: true, statusName: 'Divine Spark', shortRestRegainType: 'none' }], effects: ['Divine Spark'], spellbook: { knownSpellIds: ['epic'] }, spellSlots: { epic1: { max: 1, used: 0 } } }, [{ id: 'epic', name: 'Epic spell', levelKey: 'epic1' }]);
        cast(state, 'epic');
        expect(state.characters[0].effects).toEqual([]);
        expect(state.characters[0].customFeatures[0].used).toBe(0);
        expect(state.characters[0].spellSlots.epic1.used).toBe(0);
        undoPage(state, 'spells', dm);
        expect(state.characters[0].effects[0].name).toBe('Divine Spark');
        redoPage(state, 'spells', dm);
        cast(state, 'epic');
        applyGameAction(state, { type: 'spell.rest.character', payload: { characterId: 'anir', restType: 'short' } }, player);
        expect(state.characters[0].effects).toEqual([]);
        expect(state.characters[0].customFeatures[0].used).toBe(1);
        cast(state, 'epic');
        expect(() => cast(state, 'epic')).toThrow();
    });

    it('spends normal spellslots atomically and enforces known/prepared spells', () => {
        const state = stateWith({ id: 'hero', name: 'Hero', spellSlots: { '1': { max: 2, used: 0 } }, spellbook: { knownSpellIds: ['spell'], preparesSpells: true, preparedSpellIds: [] } }, [{ id: 'spell', name: 'Spell', levelKey: '1' }]);
        expect(() => cast(state, 'spell')).toThrow();
        expect(state.characters[0].spellSlots['1'].used).toBe(0);
        state.characters[0].spellbook.preparedSpellIds = ['spell'];
        cast(state, 'spell'); cast(state, 'spell');
        expect(() => cast(state, 'spell')).toThrow();
        expect(state.characters[0].spellSlots['1'].used).toBe(2);
    });

    it('keeps tracked descriptions, stable IDs and action flags through edits, import and undo', () => {
        const state = stateWith({ id: 'hero', name: 'Hero', customFeatures: [{ id: 'breath', name: 'Breath', maxUses: 3, used: 1, description: '**Fire** @Burning', isAction: true }] });
        applyGameAction(state, { type: 'spell.feature.update', payload: { characterId: 'hero', featureId: 'breath', name: 'Fire Breath', maxUses: 3, description: '**Updated**', isAction: true } }, player);
        applyGameAction(state, { type: 'spell.feature.uses', payload: { characterId: 'hero', featureId: 'breath', delta: 1 } }, player);
        expect(state.characters[0].customFeatures[0]).toMatchObject({ id: 'breath', used: 2, description: '**Updated**', isAction: true });
        const loaded = migrateAutosave(JSON.parse(JSON.stringify(state)));
        expect(loaded.characters[0].customFeatures[0].description).toBe('**Updated**');
        undoPage(state, 'spells', dm);
        undoPage(state, 'spells', dm);
        expect(state.characters[0].customFeatures[0]).toMatchObject({ id: 'breath', name: 'Breath', used: 1, description: '**Fire** @Burning', isAction: true });
    });
});
