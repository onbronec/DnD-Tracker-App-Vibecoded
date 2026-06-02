const { createInitialState } = require('../../server/defaults');
const { applyGameAction, undoPage, redoPage } = require('../../server/actions');
const { authorizeAction } = require('../../server/permissions');
const { filterStateForClient } = require('../../server/visibility');
const { migrateAutosave } = require('../../server/migrations');

function player(name = 'Nif') {
    return {
        id: name.toLowerCase(),
        name,
        type: 'player',
        maxHp: 50,
        currentHp: 25,
        tempHp: 0,
        ac: 15,
        initBonus: 2,
        initiative: null,
        effects: [],
        activeInCombat: true,
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

function monster(name = 'Orc') {
    return {
        ...player(name),
        id: name.toLowerCase(),
        type: 'monster',
        revealedToPlayers: false,
        monsterData: { secret: true },
        monsterAbilities: { enabled: true },
        maxPower: 2,
        currentPower: 2
    };
}

describe('permissions', () => {
    it('blocks player combat flow actions', () => {
        const state = createInitialState();
        state.characters.push(player());
        const result = authorizeAction(state, { type: 'combat.start' }, { role: 'player' });
        expect(result.ok).toBe(false);
    });

    it('allows player HP changes on player characters', () => {
        const state = createInitialState();
        state.characters.push(player());
        const result = authorizeAction(state, { type: 'character.adjustHp', payload: { characterId: 'nif', amount: 5 } }, { role: 'player' });
        expect(result.ok).toBe(true);
    });

    it('allows player level changes on player character effects', () => {
        const state = createInitialState();
        state.characters.push(player());
        const result = authorizeAction(state, { type: 'effect.level.set', payload: { characterId: 'nif', index: 0, level: 2 } }, { role: 'player' });
        expect(result.ok).toBe(true);
    });

    it('blocks player changes to monsters', () => {
        const state = createInitialState();
        state.characters.push(monster());
        const result = authorizeAction(state, { type: 'character.adjustHp', payload: { characterId: 'orc', amount: 5 } }, { role: 'player' });
        expect(result.ok).toBe(false);
    });

    it('allows player non-secret database edits but blocks monster database edits', () => {
        const state = createInitialState();
        expect(authorizeAction(state, { type: 'database.magic.upsert', payload: { item: { name: 'Moon Blade' } } }, { role: 'player' }).ok).toBe(true);
        expect(authorizeAction(state, { type: 'database.condition.upsert', payload: { condition: { name: 'Dazed' } } }, { role: 'player' }).ok).toBe(true);
        expect(authorizeAction(state, { type: 'database.monster.upsert', payload: { monster: { name: 'Secret Boss' } } }, { role: 'player' }).ok).toBe(false);
        expect(authorizeAction(state, { type: 'character.deleteSavedPlayer', payload: { characterId: 'nif' } }, { role: 'player' }).ok).toBe(false);
    });
});

describe('actions and history', () => {
    it('applies HP actions and page-scoped undo/redo', () => {
        const state = createInitialState();
        state.characters.push(player());
        applyGameAction(state, { type: 'character.adjustHp', payload: { characterId: 'nif', amount: 10 } }, { id: 'dm', role: 'dm' });
        expect(state.characters[0].currentHp).toBe(35);
        undoPage(state, 'combat', { id: 'dm', role: 'dm' });
        expect(state.characters[0].currentHp).toBe(25);
        redoPage(state, 'combat', { id: 'dm', role: 'dm' });
        expect(state.characters[0].currentHp).toBe(35);
    });

    it('undo on inventory ignores later combat actions', () => {
        const state = createInitialState();
        state.characters.push(player());
        applyGameAction(state, { type: 'inventory.item.add', payload: { characterId: 'nif', itemType: 'general', item: { name: 'Rope' } } }, { id: 'dm', role: 'dm' });
        applyGameAction(state, { type: 'character.adjustHp', payload: { characterId: 'nif', amount: 5 } }, { id: 'dm', role: 'dm' });
        undoPage(state, 'inventory', { id: 'dm', role: 'dm' });
        expect(state.characters[0].inventory.generalItems).toEqual([]);
        expect(state.characters[0].currentHp).toBe(30);
    });

    it('updates inventory item notes as an undoable action', () => {
        const state = createInitialState();
        state.characters.push(player());
        applyGameAction(state, { type: 'inventory.item.add', payload: { characterId: 'nif', itemType: 'general', item: { name: 'Old diary', description: 'First note' } } }, { id: 'player', role: 'player' });
        applyGameAction(state, { type: 'inventory.item.update', payload: { characterId: 'nif', collection: 'generalItems', index: 0, item: { name: 'Wizard diary', description: '**Important** clue', quantity: 1 } } }, { id: 'player', role: 'player' });

        expect(state.characters[0].inventory.generalItems[0]).toEqual(expect.objectContaining({
            name: 'Wizard diary',
            description: '**Important** clue'
        }));

        undoPage(state, 'inventory', { id: 'dm', role: 'dm' });
        expect(state.characters[0].inventory.generalItems[0]).toEqual(expect.objectContaining({ name: 'Old diary' }));
    });

    it('adds and removes custom spell features', () => {
        const state = createInitialState();
        state.characters.push(player());
        applyGameAction(state, { type: 'spell.feature.add', payload: { characterId: 'nif', name: 'Second Wind', maxUses: 1 } }, { id: 'player', role: 'player' });
        expect(state.characters[0].customFeatures).toEqual([
            expect.objectContaining({ name: 'Second Wind', maxUses: 1, used: 0 })
        ]);
        applyGameAction(state, { type: 'spell.feature.update', payload: { characterId: 'nif', index: 0, name: 'Action Surge', maxUses: 2, shortRestRegainType: 'all', longRestRegainType: 'all' } }, { id: 'player', role: 'player' });
        expect(state.characters[0].customFeatures[0]).toEqual(expect.objectContaining({
            name: 'Action Surge',
            maxUses: 2,
            shortRestRegainType: 'all'
        }));
        applyGameAction(state, { type: 'spell.feature.remove', payload: { characterId: 'nif', index: 0 } }, { id: 'player', role: 'player' });
        expect(state.characters[0].customFeatures).toEqual([]);
    });

    it('imports combat data as an undoable combat action', () => {
        const state = createInitialState();
        state.characters.push(player('Nif'));
        applyGameAction(state, {
            type: 'combat.import',
            payload: {
                characters: [player('Ayla'), monster('Orc')],
                combatState: { active: true, currentTurn: 1, round: 2, playedThisRound: [0] }
            }
        }, { id: 'dm', role: 'dm' });
        expect(state.characters.map(character => character.name)).toEqual(['Ayla', 'Orc']);
        expect(state.combatState).toEqual({ active: true, currentTurn: 1, round: 2, playedThisRound: [0] });

        undoPage(state, 'combat', { id: 'dm', role: 'dm' });
        expect(state.characters.map(character => character.name)).toEqual(['Nif']);
    });

    it('updates databases and restores them with page-scoped undo', () => {
        const state = createInitialState();
        state.characters.push(player('Ayla'));
        applyGameAction(state, { type: 'database.magic.upsert', payload: { item: { name: 'Sun Sword', rarity: 'Rare' } } }, { id: 'player', role: 'player' });
        applyGameAction(state, { type: 'database.potion.upsert', payload: { item: { name: 'Potion of Speed', effect: 'Haste' } } }, { id: 'player', role: 'player' });
        applyGameAction(state, { type: 'character.deactivateFromCombat', payload: { characterId: 'ayla' } }, { id: 'player', role: 'player' });
        expect(state.magicItemDatabase[0].name).toBe('Sun Sword');
        expect(state.potionDatabase[0].name).toBe('Potion of Speed');
        expect(state.characters[0].activeInCombat).toBe(false);

        undoPage(state, 'databases', { id: 'dm', role: 'dm' });
        expect(state.characters[0].activeInCombat).toBe(true);
        expect(state.magicItemDatabase).toHaveLength(1);
        expect(state.potionDatabase).toHaveLength(1);
    });

    it('permanently deletes saved players as an undoable database action', () => {
        const state = createInitialState();
        state.characters.push(player('Ayla'), monster('Orc'));
        applyGameAction(state, { type: 'character.deleteSavedPlayer', payload: { characterId: 'ayla' } }, { id: 'dm', role: 'dm' });
        expect(state.characters.map(character => character.name)).toEqual(['Orc']);
        undoPage(state, 'databases', { id: 'dm', role: 'dm' });
        expect(state.characters.map(character => character.name).sort()).toEqual(['Ayla', 'Orc']);
    });

    it('applies short and long rests to spell resources', () => {
        const state = createInitialState();
        const hero = player();
        hero.currentHp = 10;
        hero.tempHp = 4;
        hero.spellSlots = { 1: { max: 2, used: 2 } };
        hero.hitDice = { max: 4, current: 1 };
        hero.customFeatures = [
            { name: 'Short Feature', maxUses: 3, used: 3, shortRestRegainType: 'fixed', shortRestRegainAmount: 2 },
            { name: 'Long Feature', maxUses: 1, used: 1, longRestRegainType: 'all' }
        ];
        state.characters.push(hero);

        applyGameAction(state, { type: 'spell.rest.character', payload: { characterId: 'nif', restType: 'short' } }, { id: 'player', role: 'player' });
        expect(state.characters[0].customFeatures[0].used).toBe(1);
        expect(state.characters[0].currentHp).toBe(10);

        applyGameAction(state, { type: 'spell.rest.character', payload: { characterId: 'nif', restType: 'long' } }, { id: 'player', role: 'player' });
        expect(state.characters[0].currentHp).toBe(50);
        expect(state.characters[0].tempHp).toBe(0);
        expect(state.characters[0].spellSlots[1].used).toBe(0);
        expect(state.characters[0].customFeatures[1].used).toBe(0);
        expect(state.characters[0].hitDice.current).toBe(3);
    });

    it('changes leveled condition effects and supports undo', () => {
        const state = createInitialState();
        state.characters.push(player());
        applyGameAction(state, { type: 'effect.add', payload: { characterId: 'nif', name: 'Exhaustion', level: 1 } }, { id: 'player', role: 'player' });
        applyGameAction(state, { type: 'effect.level.set', payload: { characterId: 'nif', index: 0, level: 3, maxLevel: 6 } }, { id: 'player', role: 'player' });
        expect(state.characters[0].effects[0]).toEqual({ name: 'Exhaustion', level: 3 });
        undoPage(state, 'combat', { id: 'dm', role: 'dm' });
        expect(state.characters[0].effects[0]).toEqual({ name: 'Exhaustion', level: 1 });
    });
});

describe('migrations', () => {
    it('normalizes legacy numeric ids for React selects and socket actions', () => {
        const state = migrateAutosave({
            characters: [{ ...player(), id: 123 }],
            monsterDatabase: [{ id: 456, name: 'Owlbear' }],
            itemDatabase: [{ id: 789, name: 'Potion of Healing', type: 'potion' }]
        });
        expect(state.characters[0].id).toBe('123');
        expect(state.monsterDatabase[0].id).toBe('456');
        expect(state.potionDatabase[0].id).toBe('789');
        expect(state.conditionDatabase.some(condition => condition.name === 'Blinded')).toBe(true);
    });

    it('populates magic and potion databases from existing character inventories', () => {
        const hero = player('Ayla');
        hero.inventory.magicItems = [{ id: 'moon', name: 'Moonblade', rarity: 'Rare', description: 'Silver sword' }];
        hero.inventory.potions = [{ id: 'heal', name: 'Potion of Healing', quantity: 2, description: '2d4+2 healing' }];

        const state = migrateAutosave({ characters: [hero] });

        expect(state.magicItemDatabase).toEqual([
            expect.objectContaining({ name: 'Moonblade', rarity: 'Rare', source: 'Inventory: Ayla' })
        ]);
        expect(state.potionDatabase).toEqual([
            expect.objectContaining({ name: 'Potion of Healing', description: '2d4+2 healing', source: 'Inventory: Ayla' })
        ]);
    });
});

describe('visibility', () => {
    it('filters hidden monsters and DM-only databases for players', () => {
        const state = createInitialState();
        state.characters.push(player(), monster());
        state.monsterDatabase.push({ id: 'm1', name: 'Secret boss' });
        const filtered = filterStateForClient(state, 'player');
        expect(filtered.characters.map(c => c.name)).toEqual(['Nif']);
        expect(filtered.monsterDatabase).toEqual([]);
        expect(filtered.conditionDatabase.length).toBeGreaterThan(0);
        expect(Array.isArray(filtered.magicItemDatabase)).toBe(true);
    });
});
