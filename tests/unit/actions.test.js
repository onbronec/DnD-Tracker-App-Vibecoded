const { createInitialState } = require('../../server/defaults');
const { applyGameAction, undoPage, redoPage } = require('../../server/actions');
const { authorizeAction } = require('../../server/permissions');
const { filterStateForClient } = require('../../server/visibility');
const { migrateAutosave } = require('../../server/migrations');
const { importSpellsFromDataFolder, parseSpellCsv } = require('../../server/spellImport');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

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
        spellbook: { knownSpellIds: [], preparedSpellIds: [], preparesSpells: false, preparedNonEpicMax: 0, preparedEpicMax: 0 },
        hitDice: { max: 0, current: 0 },
        proficiencyBonus: 2,
        abilityScores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
        savingThrowProficiencies: [],
        skillProficiencies: [],
        skillExpertise: [],
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

    it('allows player dice changes on player character effects', () => {
        const state = createInitialState();
        state.characters.push(player());
        const result = authorizeAction(state, { type: 'effect.dice.set', payload: { characterId: 'nif', index: 0, diceCount: 2, diceSides: 4, damageType: 'fire' } }, { role: 'player' });
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
        expect(authorizeAction(state, { type: 'database.spell.upsert', payload: { spell: { name: 'Secret Spell' } } }, { role: 'player' }).ok).toBe(false);
        expect(authorizeAction(state, { type: 'database.monster.upsert', payload: { monster: { name: 'Secret Boss' } } }, { role: 'player' }).ok).toBe(false);
        expect(authorizeAction(state, { type: 'character.deleteSavedPlayer', payload: { characterId: 'nif' } }, { role: 'player' }).ok).toBe(false);
    });

    it('allows player spellbook edits on player characters', () => {
        const state = createInitialState();
        state.characters.push(player());
        const result = authorizeAction(state, { type: 'spellbook.known.add', payload: { characterId: 'nif', spellId: 'spell-1' } }, { role: 'player' });
        expect(result.ok).toBe(true);
    });

    it('allows player dice rolls but blocks DM-only toolbelt actions', () => {
        const state = createInitialState();
        expect(authorizeAction(state, { type: 'toolbelt.dice.add', payload: { expression: '1d20' } }, { role: 'player' }).ok).toBe(true);
        expect(authorizeAction(state, { type: 'toolbelt.note.upsert', payload: { title: 'Secret' } }, { role: 'player' }).ok).toBe(false);
        expect(authorizeAction(state, { type: 'toolbelt.calendar.setDate', payload: {} }, { role: 'player' }).ok).toBe(false);
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

    it('updates character sheet fields and restores them with spells undo', () => {
        const state = createInitialState();
        state.characters.push(player());
        applyGameAction(state, {
            type: 'spell.sheet.update',
            payload: {
                characterId: 'nif',
                proficiencyBonus: 5,
                abilityScores: { strength: 18, dexterity: 14, constitution: 16, intelligence: 10, wisdom: 12, charisma: 8 },
                savingThrowProficiencies: ['strength', 'constitution'],
                skillProficiencies: ['athletics'],
                skillExpertise: ['perception']
            }
        }, { id: 'player', role: 'player' });

        expect(state.characters[0].proficiencyBonus).toBe(5);
        expect(state.characters[0].abilityScores.strength).toBe(18);
        expect(state.characters[0].savingThrowProficiencies).toEqual(['strength', 'constitution']);
        expect(state.characters[0].skillExpertise).toEqual(['perception']);

        undoPage(state, 'spells', { id: 'dm', role: 'dm' });
        expect(state.characters[0].proficiencyBonus).toBe(2);
        expect(state.characters[0].abilityScores.strength).toBe(10);
    });

    it('updates spell database and spellbooks with page-scoped undo', () => {
        const state = createInitialState();
        state.characters.push(player());
        applyGameAction(state, { type: 'database.spell.upsert', payload: { spell: { id: 'shield', name: 'Shield', levelLabel: '1st', school: 'Abjuration' } } }, { id: 'dm', role: 'dm' });
        expect(state.spellDatabase[0]).toEqual(expect.objectContaining({ name: 'Shield', levelKey: '1' }));
        applyGameAction(state, { type: 'spellbook.known.add', payload: { characterId: 'nif', spellId: 'shield' } }, { id: 'player', role: 'player' });
        expect(state.characters[0].spellbook.knownSpellIds).toEqual(['shield']);
        undoPage(state, 'spells', { id: 'dm', role: 'dm' });
        expect(state.characters[0].spellbook.knownSpellIds).toEqual([]);
        undoPage(state, 'databases', { id: 'dm', role: 'dm' });
        expect(state.spellDatabase).toEqual([]);
    });

    it('validates prepared spell limits while ignoring cantrips and allowing special toggles', () => {
        const state = createInitialState();
        const hero = player();
        state.characters.push(hero);
        state.spellDatabase = [
            { id: 'cantrip', name: 'Light', levelKey: 'cantrip', levelLabel: 'Cantrip' },
            { id: 'shield', name: 'Shield', levelKey: '1', levelLabel: 'Level 1' },
            { id: 'fireball', name: 'Fireball', levelKey: '3', levelLabel: 'Level 3' },
            { id: 'epic', name: 'Starfall', levelKey: 'epic1', levelLabel: 'Epic 1' },
            { id: 'song', name: 'Holding Song', levelKey: 'special-voidsong', levelLabel: 'Voidsong' }
        ];
        applyGameAction(state, { type: 'spellbook.settings.update', payload: { characterId: 'nif', preparesSpells: true, preparedNonEpicMax: 1, preparedEpicMax: 1 } }, { id: 'player', role: 'player' });
        ['cantrip', 'shield', 'fireball', 'epic', 'song'].forEach(spellId => {
            applyGameAction(state, { type: 'spellbook.known.add', payload: { characterId: 'nif', spellId } }, { id: 'player', role: 'player' });
        });
        applyGameAction(state, { type: 'spellbook.prepared.set', payload: { characterId: 'nif', preparedSpellIds: ['cantrip', 'shield', 'fireball', 'epic', 'song'] } }, { id: 'player', role: 'player' });
        expect(state.characters[0].spellbook.preparedSpellIds).toEqual(['shield', 'epic', 'song']);
    });

    it('stores toolbelt dice and improv history with page-scoped undo', () => {
        const state = createInitialState();
        applyGameAction(state, { type: 'toolbelt.dice.add', payload: { expression: '1d20+5', total: 18, detail: '1d20: 13 | +5', mode: 'normal' } }, { id: 'player-a', role: 'player' });
        applyGameAction(state, { type: 'toolbelt.improv.add', payload: { name: 'Mira Thorn' } }, { id: 'dm', role: 'dm' });

        expect(state.toolbelt.diceRolls['player-a']).toHaveLength(1);
        expect(state.toolbelt.improvNames[0].name).toBe('Mira Thorn');
        undoPage(state, 'toolbelt', { id: 'dm', role: 'dm' });
        expect(state.toolbelt.improvNames).toHaveLength(0);
        expect(state.toolbelt.diceRolls['player-a']).toHaveLength(1);
    });

    it('stores calendar records and notepad notes in toolbelt state', () => {
        const state = createInitialState();
        applyGameAction(state, { type: 'toolbelt.calendar.advanceDays', payload: { days: 1 } }, { id: 'dm', role: 'dm' });
        expect(state.toolbelt.calendar.weekday).toBe('Wednesday');
        expect(state.toolbelt.calendar.day).toBe(24);

        applyGameAction(state, { type: 'toolbelt.calendar.record.upsert', payload: { text: '**Festival**', dateKey: '502-December-24' } }, { id: 'dm', role: 'dm' });
        const recordId = state.toolbelt.calendar.records[0].id;
        applyGameAction(state, { type: 'toolbelt.calendar.record.upsert', payload: { id: recordId, text: '**Festival edited**', dateKey: '502-December-24' } }, { id: 'dm', role: 'dm' });
        applyGameAction(state, { type: 'toolbelt.note.upsert', payload: { date: '2026-06-03', title: 'Session', text: 'Prep' } }, { id: 'dm', role: 'dm' });
        expect(state.toolbelt.calendar.records[0].text).toBe('**Festival edited**');
        expect(state.toolbelt.notes[0]).toEqual(expect.objectContaining({ title: 'Session', text: 'Prep' }));
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

    it('stores and updates dice condition effects with undo', () => {
        const state = createInitialState();
        state.characters.push(player());
        applyGameAction(state, { type: 'effect.add', payload: { characterId: 'nif', name: 'Burning', diceCount: 2, diceSides: 4, damageType: 'fire' } }, { id: 'player', role: 'player' });
        applyGameAction(state, { type: 'effect.dice.set', payload: { characterId: 'nif', index: 0, diceCount: 3, diceSides: 6, damageType: 'acid' } }, { id: 'player', role: 'player' });
        expect(state.characters[0].effects[0]).toEqual({ name: 'Burning', level: null, diceCount: 3, diceSides: 6, damageType: 'acid' });
        undoPage(state, 'combat', { id: 'dm', role: 'dm' });
        expect(state.characters[0].effects[0]).toEqual({ name: 'Burning', level: null, diceCount: 2, diceSides: 4, damageType: 'fire' });
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
        expect(state.conditionDatabase.some(condition => condition.name === 'Burning' && condition.hasDice)).toBe(true);
        expect(state.schemaVersion).toBe(4);
        expect(state.characters[0].spellbook).toEqual({ knownSpellIds: [], preparedSpellIds: [], preparesSpells: false, preparedNonEpicMax: 0, preparedEpicMax: 0 });
    });

    it('normalizes spell database levels from autosave', () => {
        const state = migrateAutosave({
            spellDatabase: [
                { name: 'Starfall', levelLabel: 'Tier 1 Epic' },
                { name: 'Holding Song', levelLabel: 'Voidsong' }
            ]
        });
        expect(state.spellDatabase).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'Starfall', levelKey: 'epic1', levelLabel: 'Epic 1' }),
            expect.objectContaining({ name: 'Holding Song', levelKey: 'special-voidsong', levelLabel: 'Voidsong' })
        ]));
    });

    it('normalizes condition dice metadata from imports', () => {
        const state = migrateAutosave({
            conditionDatabase: [{ name: 'Acidbound', hasDice: true, defaultDiceCount: 3, defaultDiceSides: 8, defaultDamageType: 'acid' }]
        });

        expect(state.conditionDatabase).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'Acidbound', hasDice: true, defaultDiceCount: 3, defaultDiceSides: 8, defaultDamageType: 'acid' })
        ]));
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
        expect(Array.isArray(filtered.spellDatabase)).toBe(true);
    });
});

describe('spell import', () => {
    it('parses spell CSV with quoted commas, multiline text, epic tiers and special sections', () => {
        const spells = parseSpellCsv('Name,As a Ritual,At Higher Levels,Casting Time,Classes,Components,Duration,Level,Optional/Variant Classes,Page,Range,School,Source,Text\n"Comma, Spell",Yes,"Higher, text",Action,"Wizard, Bard","V, S",1 minute,Tier 1 Epic,,12,Self,Evocation,Home,"Line one\nLine two"\nHolding Song,,,Action,Wizard,V,Instantaneous,Voidsong,,13,60 feet,Enchantment,Song,Song Power: 6');
        expect(spells).toEqual([
            expect.objectContaining({ name: 'Comma, Spell', levelKey: 'epic1', classes: ['Wizard', 'Bard'], description: 'Line one\nLine two' }),
            expect.objectContaining({ name: 'Holding Song', levelKey: 'special-voidsong', levelLabel: 'Voidsong' })
        ]);
    });

    it('imports spells from nested ZIP exports in data/Spells', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dnd-spells-'));
        fs.mkdirSync(path.join(root, 'data', 'Spells'), { recursive: true });
        const csv = 'Name,As a Ritual,At Higher Levels,Casting Time,Classes,Components,Duration,Level,Optional/Variant Classes,Page,Range,School,Source,Text\nNested Spell,,,Action,Wizard,V,Instantaneous,2nd,,1,Self,Abjuration,Test,Works';
        const inner = makeZip([{ name: 'Spells_all.csv', data: Buffer.from(csv) }]);
        const outer = makeZip([{ name: 'ExportBlock-Part-1.zip', data: inner }]);
        fs.writeFileSync(path.join(root, 'data', 'Spells', 'export.zip'), outer);
        const spells = importSpellsFromDataFolder(root);
        expect(spells).toEqual([expect.objectContaining({ name: 'Nested Spell', levelKey: '2' })]);
    });
});

function makeZip(entries) {
    const locals = [];
    const centrals = [];
    let offset = 0;
    entries.forEach(entry => {
        const name = Buffer.from(entry.name);
        const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
        const compressed = zlib.deflateRawSync(data);
        const local = Buffer.alloc(30 + name.length);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(8, 8);
        local.writeUInt32LE(0, 14);
        local.writeUInt32LE(compressed.length, 18);
        local.writeUInt32LE(data.length, 22);
        local.writeUInt16LE(name.length, 26);
        name.copy(local, 30);
        locals.push(local, compressed);

        const central = Buffer.alloc(46 + name.length);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(20, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt16LE(8, 10);
        central.writeUInt32LE(0, 16);
        central.writeUInt32LE(compressed.length, 20);
        central.writeUInt32LE(data.length, 24);
        central.writeUInt16LE(name.length, 28);
        central.writeUInt32LE(offset, 42);
        name.copy(central, 46);
        centrals.push(central);
        offset += local.length + compressed.length;
    });
    const centralSize = centrals.reduce((sum, item) => sum + item.length, 0);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(entries.length, 8);
    eocd.writeUInt16LE(entries.length, 10);
    eocd.writeUInt32LE(centralSize, 12);
    eocd.writeUInt32LE(offset, 16);
    return Buffer.concat([...locals, ...centrals, eocd]);
}
