const {
    normalizeCharacter,
    normalizeCondition,
    normalizeInventory,
    normalizeMagicItem,
    normalizeMonsterDbItem,
    normalizePotion,
    normalizeSpell,
    normalizeSpellbook,
    seedConditions
} = require('./migrations');
const { importSpellsFromDataFolder } = require('./spellImport');
const { clone, clamp, makeId, toNumber } = require('./utils');

const LOG_LIMIT = 500;
const SPELL_SLOTS_TABLE = {
    1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
    3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
    4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
    5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
    6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
    7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
    8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
    9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
    10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
    11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
    12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
    13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
    14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
    15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
    16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
    17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
    18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
    19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
    20: [4, 3, 3, 3, 3, 2, 2, 1, 1]
};

const ABILITY_KEYS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const SKILL_KEYS = [
    'acrobatics', 'animalHandling', 'arcana', 'athletics', 'deception', 'history',
    'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception',
    'performance', 'persuasion', 'religion', 'sleightOfHand', 'stealth', 'survival'
];

function findCharacter(state, id) {
    return state.characters.find(character => character.id === id);
}

function findCharacterIndex(state, id) {
    return state.characters.findIndex(character => character.id === id);
}

function pageForAction(type) {
    if (type.startsWith('toolbelt.')) return 'toolbelt';
    if (type === 'character.activateInCombat' || type === 'character.deactivateFromCombat' || type === 'character.deleteSavedPlayer') return 'databases';
    if (type.startsWith('combat.') || type.startsWith('character.') || type.startsWith('effect.')) return 'combat';
    if (type.startsWith('inventory.')) return 'inventory';
    if (type.startsWith('spell.') || type.startsWith('spellbook.')) return 'spells';
    if (type.startsWith('monster.')) return 'monsters';
    if (type.startsWith('database.')) return 'databases';
    return 'combat';
}

function snapshotPage(state, page) {
    if (page === 'combat') {
        return {
            characters: clone(state.characters),
            combatState: clone(state.combatState)
        };
    }
    if (page === 'inventory') {
        return {
            characters: state.characters.map(c => ({ id: c.id, inventory: clone(c.inventory) }))
        };
    }
    if (page === 'spells') {
        return {
            characters: state.characters.map(c => ({
                id: c.id,
                spellcasterLevel: c.spellcasterLevel,
                spellSlots: clone(c.spellSlots),
                customFeatures: clone(c.customFeatures),
                hitDice: clone(c.hitDice),
                effects: clone(c.effects),
                proficiencyBonus: c.proficiencyBonus,
                abilityScores: clone(c.abilityScores),
                savingThrowProficiencies: clone(c.savingThrowProficiencies),
                skillProficiencies: clone(c.skillProficiencies),
                skillExpertise: clone(c.skillExpertise),
                spellbook: clone(c.spellbook)
            }))
        };
    }
    if (page === 'monsters') {
        return {
            characters: state.characters.map(c => ({
                id: c.id,
                monsterAbilities: clone(c.monsterAbilities),
                currentPower: c.currentPower,
                maxPower: c.maxPower
            }))
        };
    }
    if (page === 'databases') {
        return {
            monsterDatabase: clone(state.monsterDatabase),
            magicItemDatabase: clone(state.magicItemDatabase || []),
            potionDatabase: clone(state.potionDatabase || []),
            conditionDatabase: clone(state.conditionDatabase || []),
            spellDatabase: clone(state.spellDatabase || []),
            itemDatabase: clone(state.itemDatabase || []),
            playerCharacters: clone(state.characters.filter(character => character.type === 'player'))
        };
    }
    if (page === 'toolbelt') {
        return {
            toolbelt: clone(ensureToolbelt(state))
        };
    }
    return clone(state);
}

function restorePage(state, page, snapshot) {
    if (page === 'combat') {
        state.characters = clone(snapshot.characters || []);
        state.combatState = clone(snapshot.combatState);
        return;
    }
    if (page === 'databases') {
        state.monsterDatabase = clone(snapshot.monsterDatabase || []);
        state.magicItemDatabase = clone(snapshot.magicItemDatabase || []);
        state.potionDatabase = clone(snapshot.potionDatabase || []);
        state.conditionDatabase = clone(snapshot.conditionDatabase || []);
        state.spellDatabase = clone(snapshot.spellDatabase || []);
        state.itemDatabase = clone(snapshot.itemDatabase || []);
        const monsters = state.characters.filter(character => character.type === 'monster');
        state.characters = [...monsters, ...clone(snapshot.playerCharacters || [])];
        return;
    }
    if (page === 'toolbelt') {
        state.toolbelt = clone(snapshot.toolbelt || ensureToolbelt(state));
        return;
    }

    const snapshotMap = new Map((snapshot.characters || []).map(character => [character.id, character]));
    state.characters.forEach(character => {
        const saved = snapshotMap.get(character.id);
        if (!saved) return;
        if (page === 'inventory') {
            character.inventory = clone(saved.inventory);
        }
        if (page === 'spells') {
            character.spellcasterLevel = saved.spellcasterLevel || 0;
            character.spellSlots = clone(saved.spellSlots || {});
            character.customFeatures = clone(saved.customFeatures || []);
            character.hitDice = clone(saved.hitDice || { max: 0, current: 0 });
            character.effects = clone(saved.effects || []);
            character.proficiencyBonus = saved.proficiencyBonus || 2;
            character.abilityScores = clone(saved.abilityScores || character.abilityScores || {});
            character.savingThrowProficiencies = clone(saved.savingThrowProficiencies || []);
            character.skillProficiencies = clone(saved.skillProficiencies || []);
            character.skillExpertise = clone(saved.skillExpertise || []);
            character.spellbook = clone(saved.spellbook || normalizeSpellbook({}));
        }
        if (page === 'monsters') {
            character.monsterAbilities = clone(saved.monsterAbilities);
            character.currentPower = saved.currentPower || 0;
            character.maxPower = saved.maxPower || 0;
        }
    });
}

function addLogEntry(state, action, client, page, label, before, after, reversible = true, visibility = 'all') {
    const entry = {
        id: makeId('log'),
        sequence: state.nextSequence++,
        timestamp: new Date().toISOString(),
        actorId: client.id,
        actorName: client.role === 'dm' ? 'DM' : 'Player',
        actorRole: client.role,
        page,
        type: action.type,
        label,
        reversible,
        undone: false,
        visibility,
        before,
        after
    };

    state.actionLog.push(entry);
    if (state.actionLog.length > LOG_LIMIT) {
        const removed = state.actionLog.splice(0, state.actionLog.length - LOG_LIMIT);
        const removedIds = new Set(removed.map(item => item.id));
        Object.keys(state.redoStacks || {}).forEach(pageName => {
            state.redoStacks[pageName] = (state.redoStacks[pageName] || []).filter(id => !removedIds.has(id));
        });
    }
    if (!state.redoStacks[page]) state.redoStacks[page] = [];
    if (reversible) state.redoStacks[page] = [];
    return entry;
}

function ensureInventory(character) {
    character.inventory = normalizeInventory(character.inventory);
    return character.inventory;
}

function ensureSpellShape(character) {
    if (!character.spellSlots || typeof character.spellSlots !== 'object') character.spellSlots = {};
    if (!Array.isArray(character.customFeatures)) character.customFeatures = [];
    if (!character.hitDice || typeof character.hitDice !== 'object') character.hitDice = { max: 0, current: 0 };
    if (!character.abilityScores || typeof character.abilityScores !== 'object') {
        character.abilityScores = { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };
    }
    if (!Array.isArray(character.savingThrowProficiencies)) character.savingThrowProficiencies = [];
    if (!Array.isArray(character.skillProficiencies)) character.skillProficiencies = [];
    if (!Array.isArray(character.skillExpertise)) character.skillExpertise = [];
    character.proficiencyBonus = clamp(toNumber(character.proficiencyBonus, 2), 0, 10);
    character.spellbook = normalizeSpellbook(character.spellbook);
}

function ensureToolbelt(state) {
    if (!state.toolbelt || typeof state.toolbelt !== 'object') state.toolbelt = {};
    if (!state.toolbelt.diceRolls || typeof state.toolbelt.diceRolls !== 'object') state.toolbelt.diceRolls = {};
    if (!Array.isArray(state.toolbelt.improvNames)) state.toolbelt.improvNames = [];
    if (!state.toolbelt.calendar || typeof state.toolbelt.calendar !== 'object') {
        state.toolbelt.calendar = { weekday: 'Tuesday', day: 23, month: 'December', year: 502, records: [] };
    }
    if (!Array.isArray(state.toolbelt.calendar.records)) state.toolbelt.calendar.records = [];
    if (!Array.isArray(state.toolbelt.notes)) state.toolbelt.notes = [];
    return state.toolbelt;
}

function applyActionMutation(state, action, client = { id: 'system', role: 'player' }) {
    const payload = action.payload || {};

    switch (action.type) {
        case 'toolbelt.dice.add': {
            const toolbelt = ensureToolbelt(state);
            const key = String(client.id || payload.actorId || 'player');
            const entry = {
                id: makeId('dice'),
                actorId: key,
                actorName: client.role === 'dm' ? 'DM' : 'Player',
                expression: String(payload.expression || payload.result?.normalized || ''),
                total: toNumber(payload.total ?? payload.result?.total, 0),
                detail: String(payload.detail || ''),
                mode: String(payload.mode || 'normal'),
                rerollOnes: Boolean(payload.rerollOnes),
                timestamp: new Date().toISOString()
            };
            toolbelt.diceRolls[key] = [entry, ...(toolbelt.diceRolls[key] || [])].slice(0, 5);
            return `${entry.actorName}: dice ${entry.expression} = ${entry.total}`;
        }
        case 'toolbelt.improv.add': {
            const toolbelt = ensureToolbelt(state);
            const name = String(payload.name || '').trim();
            if (!name) throw new Error('Jmeno chybi.');
            toolbelt.improvNames = [{ id: makeId('improv'), name, timestamp: new Date().toISOString() }, ...toolbelt.improvNames].slice(0, 5);
            return `Improv character: ${name}`;
        }
        case 'toolbelt.calendar.setDate': {
            const calendar = ensureToolbelt(state).calendar;
            calendar.weekday = String(payload.weekday || calendar.weekday || 'Tuesday');
            calendar.day = Math.max(1, toNumber(payload.day, calendar.day || 23));
            calendar.month = String(payload.month || calendar.month || 'December');
            calendar.year = toNumber(payload.year, calendar.year || 502);
            syncCalendarWeekday(calendar);
            return `Calendar: ${calendar.weekday} ${calendar.day} ${calendar.month} ${calendar.year}`;
        }
        case 'toolbelt.calendar.advanceDays': {
            const calendar = ensureToolbelt(state).calendar;
            advanceCalendar(calendar, Math.max(1, toNumber(payload.days, 1)));
            return `Calendar advanced to ${calendar.weekday} ${calendar.day} ${calendar.month} ${calendar.year}`;
        }
        case 'toolbelt.calendar.record.add':
        case 'toolbelt.calendar.record.upsert': {
            const calendar = ensureToolbelt(state).calendar;
            const text = String(payload.text || '').trim();
            if (!text) throw new Error('Zaznam chybi.');
            const record = {
                id: String(payload.id || makeId('cal')),
                dateKey: String(payload.dateKey || calendarDateKey(calendar)),
                text,
                timestamp: new Date().toISOString()
            };
            const index = calendar.records.findIndex(item => item.id === record.id);
            if (index >= 0) calendar.records[index] = record;
            else calendar.records.unshift(record);
            return 'Calendar record added';
        }
        case 'toolbelt.calendar.record.remove': {
            const calendar = ensureToolbelt(state).calendar;
            calendar.records = calendar.records.filter(record => record.id !== payload.id);
            return 'Calendar record removed';
        }
        case 'toolbelt.note.upsert': {
            const toolbelt = ensureToolbelt(state);
            const note = {
                id: String(payload.id || makeId('note')),
                date: String(payload.date || new Date().toISOString().slice(0, 10)),
                title: String(payload.title || 'Note'),
                text: String(payload.text || ''),
                timestamp: new Date().toISOString()
            };
            const index = toolbelt.notes.findIndex(item => item.id === note.id);
            if (index >= 0) toolbelt.notes[index] = note;
            else toolbelt.notes.unshift(note);
            return `Note: ${note.title}`;
        }
        case 'toolbelt.note.remove': {
            const toolbelt = ensureToolbelt(state);
            toolbelt.notes = toolbelt.notes.filter(note => note.id !== payload.id);
            return 'Note removed';
        }
        case 'character.add': {
            const character = normalizeCharacter({
                id: makeId(payload.type === 'monster' ? 'monster' : 'player'),
                activeInCombat: true,
                ...payload
            });
            state.characters.push(character);
            return `${character.name} pridana do trackeru`;
        }
        case 'character.remove': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            if (character.type === 'player') {
                character.activeInCombat = false;
                character.initiative = null;
                return `${character.name} odstranena z boje`;
            }
            state.characters = state.characters.filter(item => item.id !== payload.characterId);
            return `${character.name} odstranena`;
        }
        case 'character.activateInCombat': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'player') throw new Error('Hrac neexistuje.');
            character.activeInCombat = true;
            return `${character.name} aktivni v boji`;
        }
        case 'character.deactivateFromCombat': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'player') throw new Error('Hrac neexistuje.');
            character.activeInCombat = false;
            character.initiative = null;
            return `${character.name} mimo boj`;
        }
        case 'character.deleteSavedPlayer': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'player') throw new Error('Hrac neexistuje.');
            state.characters = state.characters.filter(item => item.id !== payload.characterId);
            return `${character.name} trvale smazan`;
        }
        case 'character.adjustHp': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            const amount = toNumber(payload.amount, 0);
            if (amount < 0) {
                let damage = Math.abs(amount);
                const tempDamage = Math.min(character.tempHp || 0, damage);
                character.tempHp = (character.tempHp || 0) - tempDamage;
                damage -= tempDamage;
                character.currentHp = clamp((character.currentHp || 0) - damage, 0, character.maxHp || 1);
            } else {
                character.currentHp = clamp((character.currentHp || 0) + amount, 0, character.maxHp || 1);
            }
            return `${character.name}: ${amount >= 0 ? '+' : ''}${amount} HP`;
        }
        case 'character.setTempHp': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            character.tempHp = Math.max(0, toNumber(payload.value, 0));
            return `${character.name}: temp HP ${character.tempHp}`;
        }
        case 'character.setInitiative': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            character.initiative = payload.value === '' || payload.value === null ? null : toNumber(payload.value, 0);
            sortInitiativePreservingTurn(state, payload.characterId);
            return `${character.name}: iniciativa ${character.initiative ?? '-'}`;
        }
        case 'character.updatePower': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            character.currentPower = clamp(toNumber(payload.value, character.currentPower || 0), 0, character.maxPower || 0);
            return `${character.name}: ${character.powerName || 'Power'} ${character.currentPower}`;
        }
        case 'effect.add': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            const name = String(payload.name || '').trim();
            if (!name) throw new Error('Efekt nema nazev.');
            if (!Array.isArray(character.effects)) character.effects = [];
            const effect = { name, level: payload.level ?? null };
            if (payload.ability) effect.ability = payload.ability;
            if (payload.value !== undefined && payload.value !== null) effect.value = toNumber(payload.value, 0);
            if (payload.diceCount !== undefined && payload.diceCount !== null) effect.diceCount = Math.max(0, toNumber(payload.diceCount, 0));
            if (payload.diceSides !== undefined && payload.diceSides !== null) effect.diceSides = Math.max(0, toNumber(payload.diceSides, 0));
            if (payload.damageType !== undefined && payload.damageType !== null) effect.damageType = String(payload.damageType || '');
            character.effects.push(effect);
            return `${character.name}: efekt ${name}`;
        }
        case 'effect.remove': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            const index = Number(payload.index);
            const removed = character.effects?.[index];
            if (!removed) throw new Error('Efekt neexistuje.');
            character.effects.splice(index, 1);
            return `${character.name}: odebran efekt ${removed.name || removed}`;
        }
        case 'effect.level.set': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            const index = Number(payload.index);
            const effect = character.effects?.[index];
            if (!effect) throw new Error('Efekt neexistuje.');
            const current = typeof effect === 'string' ? { name: effect, level: null } : effect;
            const level = clamp(toNumber(payload.level, current.level || 1), 1, toNumber(payload.maxLevel, 20));
            character.effects[index] = { ...current, level };
            return `${character.name}: ${current.name} level ${level}`;
        }
        case 'effect.dice.set': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            const index = Number(payload.index);
            const effect = character.effects?.[index];
            if (!effect) throw new Error('Efekt neexistuje.');
            const current = typeof effect === 'string' ? { name: effect, level: null } : effect;
            const diceCount = Math.max(0, toNumber(payload.diceCount, current.diceCount || 0));
            const diceSides = Math.max(0, toNumber(payload.diceSides, current.diceSides || 0));
            const damageType = String(payload.damageType ?? current.damageType ?? '');
            character.effects[index] = { ...current, diceCount, diceSides, damageType };
            return `${character.name}: ${current.name} ${diceCount}d${diceSides}${damageType ? ` ${damageType}` : ''}`;
        }
        case 'combat.start':
            startCombat(state);
            return 'Zahajen boj';
        case 'combat.nextTurn':
            nextTurn(state);
            return 'Dalsi tah';
        case 'combat.previousTurn':
            previousTurn(state);
            return 'Predchozi tah';
        case 'combat.end':
            endCombat(state, false);
            return 'Ukoncen boj';
        case 'combat.close':
            endCombat(state, true);
            return 'Uzavren boj';
        case 'combat.import': {
            const characters = Array.isArray(payload.characters)
                ? payload.characters.map(normalizeCharacter)
                : [];
            if (characters.length === 0) throw new Error('Import neobsahuje zadne postavy.');
            state.characters = characters;
            state.combatState = {
                active: Boolean(payload.combatState?.active),
                currentTurn: Math.max(0, toNumber(payload.combatState?.currentTurn, 0)),
                round: Math.max(1, toNumber(payload.combatState?.round, 1)),
                playedThisRound: Array.isArray(payload.combatState?.playedThisRound) ? payload.combatState.playedThisRound : []
            };
            if (state.combatState.currentTurn >= state.characters.length) state.combatState.currentTurn = 0;
            return `Nacten combat stav (${characters.length} postav)`;
        }
        case 'inventory.currency.set': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            const inv = ensureInventory(character);
            const currency = String(payload.currency || '');
            if (!(currency in inv.currency)) throw new Error('Neznama mena.');
            inv.currency[currency] = Math.max(0, toNumber(payload.value, 0));
            return `${character.name}: ${currency} ${inv.currency[currency]}`;
        }
        case 'inventory.item.add': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            const inv = ensureInventory(character);
            const itemType = payload.itemType || 'general';
            addInventoryItem(inv, itemType, payload.item || {});
            return `${character.name}: pridan item ${payload.item?.name || payload.item?.spellName || payload.item || itemType}`;
        }
        case 'inventory.item.update': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            const collection = getInventoryCollection(character, payload.collection);
            const index = Number(payload.index);
            const current = collection[index];
            if (!current) throw new Error('Item neexistuje.');
            collection[index] = normalizeInventoryItemForCollection(payload.collection, payload.item || {}, current);
            const next = collection[index];
            return `${character.name}: upraven item ${next.name || next.spellName || payload.collection}`;
        }
        case 'inventory.item.quantity': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            const item = getInventoryItem(character, payload.collection, payload.index);
            item.quantity = Math.max(0, toNumber(payload.quantity, item.quantity || 0));
            return `${character.name}: mnozstvi ${item.name || item.spellName || payload.collection}`;
        }
        case 'inventory.item.remove': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            const collection = getInventoryCollection(character, payload.collection);
            collection.splice(Number(payload.index), 1);
            return `${character.name}: odebran item`;
        }
        case 'inventory.item.transfer': {
            transferInventoryItem(state, payload);
            return 'Transfer itemu';
        }
        case 'inventory.magic.attune': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            const item = getInventoryItem(character, 'magicItems', payload.index);
            const inv = ensureInventory(character);
            if (payload.attuned && inv.magicItems.filter(i => i.attuned).length >= 3 && !item.attuned) {
                throw new Error('Maximalne 3 attuned itemy.');
            }
            item.attuned = Boolean(payload.attuned);
            return `${character.name}: attunement ${item.name}`;
        }
        case 'spell.slot.toggle': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            ensureSpellShape(character);
            const level = String(payload.level);
            const slots = character.spellSlots[level];
            if (!slots) throw new Error('Spell slot level neexistuje.');
            const index = Number(payload.index);
            slots.used = index < slots.used ? index : index + 1;
            slots.used = clamp(slots.used, 0, slots.max || 0);
            return `${character.name}: spell slot L${level}`;
        }
        case 'spell.hitDie.toggle': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            ensureSpellShape(character);
            const dieIndex = Number(payload.index);
            const usedCount = character.hitDice.max - character.hitDice.current;
            character.hitDice.current = dieIndex < usedCount
                ? character.hitDice.max - dieIndex
                : character.hitDice.max - dieIndex - 1;
            character.hitDice.current = clamp(character.hitDice.current, 0, character.hitDice.max || 0);
            return `${character.name}: hit die`;
        }
        case 'spell.feature.uses': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            ensureSpellShape(character);
            const feature = character.customFeatures[Number(payload.index)];
            if (!feature) throw new Error('Feature neexistuje.');
            feature.used = clamp(toNumber(payload.used, feature.used || 0), 0, feature.maxUses || 0);
            return `${character.name}: ${feature.name}`;
        }
        case 'spell.character.update': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            character.spellcasterLevel = Math.max(0, toNumber(payload.spellcasterLevel, 0));
            character.hitDice = {
                max: Math.max(0, toNumber(payload.hitDiceMax, character.hitDice?.max || 0)),
                current: clamp(toNumber(payload.hitDiceCurrent, character.hitDice?.current || 0), 0, Math.max(0, toNumber(payload.hitDiceMax, character.hitDice?.max || 0)))
            };
            updateSpellSlotsForLevel(character);
            character.customFeatures = Array.isArray(payload.customFeatures) ? clone(payload.customFeatures) : character.customFeatures;
            return `${character.name}: kouzla/abilities`;
        }
        case 'spell.sheet.update': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'player') throw new Error('Hrac neexistuje.');
            ensureSpellShape(character);
            character.proficiencyBonus = clamp(toNumber(payload.proficiencyBonus, character.proficiencyBonus || 2), 0, 10);
            character.abilityScores = normalizeSheetAbilityScores(payload.abilityScores || character.abilityScores);
            character.savingThrowProficiencies = normalizeAllowedList(payload.savingThrowProficiencies, ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']);
            character.skillProficiencies = normalizeAllowedList(payload.skillProficiencies, SKILL_KEYS);
            character.skillExpertise = normalizeAllowedList(payload.skillExpertise, SKILL_KEYS);
            return `${character.name}: character sheet`;
        }
        case 'spell.feature.add': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            ensureSpellShape(character);
            const name = String(payload.name || '').trim();
            if (!name) throw new Error('Feature nema nazev.');
            character.customFeatures.push(normalizeFeaturePayload(payload, { used: 0 }));
            return `${character.name}: pridana feature ${name}`;
        }
        case 'spell.feature.update': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            ensureSpellShape(character);
            const index = Number(payload.index);
            const current = character.customFeatures[index];
            if (!current) throw new Error('Feature neexistuje.');
            character.customFeatures[index] = normalizeFeaturePayload(payload, { used: current.used || 0 });
            return `${character.name}: upravena feature ${character.customFeatures[index].name}`;
        }
        case 'spell.feature.remove': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            ensureSpellShape(character);
            const index = Number(payload.index);
            const removed = character.customFeatures[index];
            if (!removed) throw new Error('Feature neexistuje.');
            character.customFeatures.splice(index, 1);
            return `${character.name}: odebrana feature ${removed.name}`;
        }
        case 'spell.rest.character': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'player') throw new Error('Hrac neexistuje.');
            applyRest(character, payload.restType || 'short');
            return `${character.name}: ${payload.restType === 'long' ? 'long' : 'short'} rest`;
        }
        case 'spell.rest.all': {
            const restType = payload.restType === 'long' ? 'long' : 'short';
            state.characters.filter(character => character.type === 'player').forEach(character => applyRest(character, restType));
            return `${restType === 'long' ? 'Long' : 'Short'} Rest All`;
        }
        case 'spellbook.known.add': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'player') throw new Error('Hrac neexistuje.');
            ensureSpellShape(character);
            const spellId = String(payload.spellId || '');
            if (!spellExists(state, spellId)) throw new Error('Kouzlo neexistuje.');
            if (!character.spellbook.knownSpellIds.includes(spellId)) character.spellbook.knownSpellIds.push(spellId);
            return `${character.name}: learned spell ${spellName(state, spellId)}`;
        }
        case 'spellbook.known.remove': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'player') throw new Error('Hrac neexistuje.');
            ensureSpellShape(character);
            const spellId = String(payload.spellId || '');
            character.spellbook = {
                ...character.spellbook,
                knownSpellIds: character.spellbook.knownSpellIds.filter(id => id !== spellId),
                preparedSpellIds: character.spellbook.preparedSpellIds.filter(id => id !== spellId)
            };
            return `${character.name}: removed spell ${spellName(state, spellId)}`;
        }
        case 'spellbook.settings.update': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'player') throw new Error('Hrac neexistuje.');
            ensureSpellShape(character);
            character.spellbook.preparesSpells = Boolean(payload.preparesSpells);
            character.spellbook.preparedNonEpicMax = Math.max(0, toNumber(payload.preparedNonEpicMax, character.spellbook.preparedNonEpicMax));
            character.spellbook.preparedEpicMax = Math.max(0, toNumber(payload.preparedEpicMax, character.spellbook.preparedEpicMax));
            character.spellbook = {
                ...character.spellbook,
                preparedSpellIds: validatePreparedSpellIds(state, character, character.spellbook.preparedSpellIds)
            };
            return `${character.name}: spellbook settings`;
        }
        case 'spellbook.prepared.set': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'player') throw new Error('Hrac neexistuje.');
            ensureSpellShape(character);
            character.spellbook = {
                ...character.spellbook,
                preparedSpellIds: validatePreparedSpellIds(state, character, payload.preparedSpellIds)
            };
            return `${character.name}: prepared spells`;
        }
        case 'monster.abilities.update': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'monster') throw new Error('Monstrum neexistuje.');
            character.monsterAbilities = clone(payload.monsterAbilities || {});
            return `${character.name}: monster abilities`;
        }
        case 'database.monster.upsert': {
            upsertDatabaseItem(state.monsterDatabase, normalizeMonsterDbItem(payload.monster || {}), 'monster_db');
            return `Databaze monster: ${payload.monster?.name || 'monstrum'}`;
        }
        case 'database.monster.remove': {
            state.monsterDatabase = state.monsterDatabase.filter(item => item.id !== payload.id);
            return 'Databaze monster: odstraneno';
        }
        case 'database.monster.import': {
            state.monsterDatabase = normalizeImport(payload.items || payload.monsters).map(normalizeMonsterDbItem);
            return `Databaze monster: import ${state.monsterDatabase.length}`;
        }
        case 'database.magic.upsert': {
            const item = normalizeMagicItem(payload.item || {});
            upsertDatabaseItem(state.magicItemDatabase, item, 'magic_db');
            return `Databaze magic itemu: ${item.name}`;
        }
        case 'database.magic.remove': {
            state.magicItemDatabase = state.magicItemDatabase.filter(item => item.id !== payload.id);
            return 'Databaze magic itemu: odstraneno';
        }
        case 'database.magic.import': {
            state.magicItemDatabase = normalizeImport(payload.items).map(normalizeMagicItem);
            return `Databaze magic itemu: import ${state.magicItemDatabase.length}`;
        }
        case 'database.potion.upsert': {
            const item = normalizePotion(payload.item || {});
            upsertDatabaseItem(state.potionDatabase, item, 'potion_db');
            return `Databaze potionu: ${item.name}`;
        }
        case 'database.potion.remove': {
            state.potionDatabase = state.potionDatabase.filter(item => item.id !== payload.id);
            return 'Databaze potionu: odstraneno';
        }
        case 'database.potion.import': {
            state.potionDatabase = normalizeImport(payload.items).map(normalizePotion);
            return `Databaze potionu: import ${state.potionDatabase.length}`;
        }
        case 'database.condition.upsert': {
            const item = normalizeCondition(payload.condition || {});
            upsertDatabaseItem(state.conditionDatabase, item, 'condition_db');
            return `Databaze conditions: ${item.name}`;
        }
        case 'database.condition.remove': {
            state.conditionDatabase = state.conditionDatabase.filter(item => item.id !== payload.id);
            return 'Databaze conditions: odstraneno';
        }
        case 'database.condition.import': {
            state.conditionDatabase = seedConditions(normalizeImport(payload.items || payload.conditions));
            return `Databaze conditions: import ${state.conditionDatabase.length}`;
        }
        case 'database.spell.upsert': {
            const item = normalizeSpell(payload.spell || payload.item || {});
            upsertSpellDatabaseItem(state, item);
            return `Databaze spellu: ${item.name}`;
        }
        case 'database.spell.remove': {
            const id = String(payload.id || '');
            state.spellDatabase = (state.spellDatabase || []).filter(item => item.id !== id);
            state.characters.forEach(character => {
                if (character.type !== 'player') return;
                ensureSpellShape(character);
                character.spellbook = {
                    ...character.spellbook,
                    knownSpellIds: character.spellbook.knownSpellIds.filter(spellId => spellId !== id),
                    preparedSpellIds: character.spellbook.preparedSpellIds.filter(spellId => spellId !== id)
                };
            });
            return 'Databaze spellu: odstraneno';
        }
        case 'database.spell.import': {
            normalizeImport(payload.items || payload.spells).map(normalizeSpell).forEach(spell => upsertSpellDatabaseItem(state, spell));
            return `Databaze spellu: import ${state.spellDatabase.length}`;
        }
        case 'database.spell.importFromDataFolder': {
            const spells = importSpellsFromDataFolder(process.cwd());
            spells.forEach(spell => upsertSpellDatabaseItem(state, spell));
            return `Databaze spellu: import z data/Spells ${spells.length}`;
        }
        case 'database.importAll': {
            const data = payload.data || payload;
            if (Array.isArray(data.monsterDatabase)) state.monsterDatabase = data.monsterDatabase.map(normalizeMonsterDbItem);
            if (Array.isArray(data.magicItemDatabase)) state.magicItemDatabase = data.magicItemDatabase.map(normalizeMagicItem);
            if (Array.isArray(data.potionDatabase)) state.potionDatabase = data.potionDatabase.map(normalizePotion);
            if (Array.isArray(data.conditionDatabase)) state.conditionDatabase = seedConditions(data.conditionDatabase);
            if (Array.isArray(data.spellDatabase)) state.spellDatabase = data.spellDatabase.map(normalizeSpell);
            if (Array.isArray(data.playerCharacters)) {
                const monsters = state.characters.filter(character => character.type === 'monster');
                state.characters = [...monsters, ...data.playerCharacters.map(normalizeCharacter).filter(character => character.type === 'player')];
            }
            return 'Databaze: import vsech databazi';
        }
        default:
            throw new Error(`Neznama akce: ${action.type}`);
    }
}

function sortInitiativePreservingTurn(state, updatedCharacterId) {
    if (!state.combatState.active) return;
    const current = state.characters[state.combatState.currentTurn];
    const currentId = current?.id || updatedCharacterId;
    state.characters.sort((a, b) => (b.initiative ?? -999) - (a.initiative ?? -999));
    state.combatState.currentTurn = Math.max(0, state.characters.findIndex(c => c.id === currentId));
    state.combatState.playedThisRound = state.characters
        .map((character, index) => ({ character, index }))
        .filter(item => state.combatState.playedThisRound.includes(item.index))
        .map(item => item.index);
}

function rollInitiative(character) {
    return Math.floor(Math.random() * 20) + 1 + (character.initBonus || 0);
}

function startCombat(state) {
    const processedGroups = new Set();
    state.characters.forEach(character => {
        if (!isCombatant(character)) {
            character.initiative = null;
            return;
        }
        if (character.initiative === null || character.initiative === undefined) {
            const initiative = rollInitiative(character);
            character.initiative = initiative;
            if (character.groupId && !processedGroups.has(character.groupId)) {
                processedGroups.add(character.groupId);
                state.characters.forEach(other => {
                    if (other.groupId === character.groupId) other.initiative = initiative;
                });
            }
        }
    });
    state.characters.sort((a, b) => {
        if (isCombatant(a) !== isCombatant(b)) return isCombatant(a) ? -1 : 1;
        return (b.initiative ?? -999) - (a.initiative ?? -999);
    });
    state.combatState = { active: true, currentTurn: firstCombatantIndex(state), round: 1, playedThisRound: [] };
    revealCurrentMonster(state);
}

function isCombatant(character) {
    return character.type === 'monster' || character.activeInCombat !== false;
}

function combatantIndexes(state) {
    return state.characters
        .map((character, index) => ({ character, index }))
        .filter(item => isCombatant(item.character))
        .map(item => item.index);
}

function firstCombatantIndex(state) {
    return combatantIndexes(state)[0] || 0;
}

function revealCurrentMonster(state) {
    const current = state.characters[state.combatState.currentTurn];
    if (current?.type === 'monster') current.revealedToPlayers = true;
}

function nextTurn(state) {
    if (!state.combatState.active || state.characters.length === 0) return;
    revealCurrentMonster(state);
    const indexes = combatantIndexes(state);
    if (indexes.length === 0) return;
    const currentPosition = Math.max(0, indexes.indexOf(state.combatState.currentTurn));
    if (currentPosition < indexes.length - 1) {
        state.combatState.playedThisRound.push(state.combatState.currentTurn);
        state.combatState.currentTurn = indexes[currentPosition + 1];
    } else {
        state.combatState.round += 1;
        state.combatState.currentTurn = indexes[0];
        state.combatState.playedThisRound = [];
    }
    revealCurrentMonster(state);
}

function previousTurn(state) {
    if (!state.combatState.active || state.characters.length === 0) return;
    const indexes = combatantIndexes(state);
    if (indexes.length === 0) return;
    const currentPosition = Math.max(0, indexes.indexOf(state.combatState.currentTurn));
    if (currentPosition > 0) {
        state.combatState.currentTurn = indexes[currentPosition - 1];
        state.combatState.playedThisRound = state.combatState.playedThisRound.filter(index => index !== state.combatState.currentTurn);
    } else if (state.combatState.round > 1) {
        state.combatState.round -= 1;
        state.combatState.currentTurn = indexes[indexes.length - 1];
        state.combatState.playedThisRound = indexes.slice(0, -1);
    }
}

function endCombat(state, close) {
    state.combatState = { active: false, currentTurn: 0, round: 1, playedThisRound: [] };
    if (close) {
        state.characters = state.characters.filter(character => character.type === 'player');
    }
    state.characters.forEach(character => {
        character.initiative = null;
        if (character.type === 'monster') {
            character.currentPower = character.maxPower || 0;
            character.revealedToPlayers = false;
        }
    });
}

function getInventoryCollection(character, collection) {
    const inv = ensureInventory(character);
    if (!Array.isArray(inv[collection])) throw new Error('Neznama kolekce inventare.');
    return inv[collection];
}

function getInventoryItem(character, collection, index) {
    const items = getInventoryCollection(character, collection);
    const item = items[Number(index)];
    if (!item) throw new Error('Item neexistuje.');
    return item;
}

function addInventoryItem(inv, itemType, item) {
    if (itemType === 'potion') {
        inv.potions.push(normalizeInventoryItemForCollection('potions', item));
    } else if (itemType === 'scroll') {
        inv.scrolls.push(normalizeInventoryItemForCollection('scrolls', item));
    } else if (itemType === 'magic') {
        inv.magicItems.push(normalizeInventoryItemForCollection('magicItems', item));
    } else {
        inv.generalItems.push(normalizeInventoryItemForCollection('generalItems', item));
    }
}

function normalizeInventoryItemForCollection(collection, item, current = {}) {
    const source = typeof item === 'string' ? { name: item } : item;
    const previous = typeof current === 'string' ? { name: current } : current;
    const base = { ...clone(previous), ...clone(source) };
    if (collection === 'potions') {
        return {
            ...base,
            id: String(base.id || makeId('potion')),
            name: String(base.name || 'Potion'),
            quantity: Math.max(0, toNumber(base.quantity, 1)),
            description: String(base.description || base.effect || '')
        };
    }
    if (collection === 'scrolls') {
        return {
            ...base,
            id: String(base.id || makeId('scroll')),
            spellName: String(base.spellName || base.name || 'Scroll'),
            quantity: Math.max(0, toNumber(base.quantity, 1)),
            description: String(base.description || '')
        };
    }
    if (collection === 'magicItems') {
        return {
            ...base,
            id: String(base.id || makeId('magic')),
            name: String(base.name || 'Magic Item'),
            itemType: base.itemType || 'Wondrous item',
            rarity: base.rarity || '',
            description: String(base.description || ''),
            attuned: Boolean(base.attuned)
        };
    }
    return {
        ...base,
        id: String(base.id || makeId('general')),
        name: String(base.name || base.spellName || 'Item'),
        quantity: Math.max(0, toNumber(base.quantity, 1)),
        description: String(base.description || base.notes || '')
    };
}

function normalizeFeaturePayload(payload, fallback) {
    const maxUses = Math.max(1, toNumber(payload.maxUses, 1));
    const name = String(payload.name || '').trim();
    if (!name) throw new Error('Feature nema nazev.');
    return {
        name,
        maxUses,
        used: clamp(toNumber(fallback.used, 0), 0, maxUses),
        shortRestRegainType: payload.shortRestRegainType || 'none',
        shortRestRegainAmount: toNumber(payload.shortRestRegainAmount, 0),
        longRestRegainType: payload.longRestRegainType || 'all',
        longRestRegainAmount: toNumber(payload.longRestRegainAmount, 0),
        statusName: payload.statusName || '',
        statusEffect: Boolean(payload.statusName)
    };
}

function normalizeAllowedList(values, allowed) {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.map(value => String(value)).filter(value => allowed.includes(value)))];
}

function normalizeSheetAbilityScores(scores) {
    const source = scores || {};
    return ABILITY_KEYS.reduce((result, key) => {
        result[key] = clamp(toNumber(source[key], 10), 1, 30);
        return result;
    }, {});
}

function regainFeatureUses(feature, restType) {
    const regainType = restType === 'short'
        ? (feature.shortRestRegainType || (feature.restType === 'short' ? feature.regainType : 'none'))
        : (feature.longRestRegainType || (feature.restType === 'long' ? feature.regainType : 'none'));
    if (!regainType || regainType === 'none') return;
    if (regainType === 'all') {
        feature.used = 0;
        return;
    }
    if (regainType === 'fixed' || regainType === 'input') {
        const amount = restType === 'short'
            ? (feature.shortRestRegainAmount || feature.regainAmount || (regainType === 'input' ? 1 : 0))
            : (feature.longRestRegainAmount || feature.regainAmount || (regainType === 'input' ? 1 : 0));
        feature.used = Math.max(0, toNumber(feature.used, 0) - toNumber(amount, 0));
    }
}

function applyRest(character, restType) {
    ensureSpellShape(character);
    character.customFeatures.forEach(feature => regainFeatureUses(feature, restType));
    if (restType !== 'long') return;

    character.currentHp = character.maxHp || 1;
    character.tempHp = 0;
    Object.keys(character.spellSlots || {}).forEach(level => {
        character.spellSlots[level].used = 0;
    });
    if (character.hitDice) {
        const regainAmount = Math.max(1, Math.floor((character.hitDice.max || 0) / 2));
        character.hitDice.current = Math.min(character.hitDice.max || 0, (character.hitDice.current || 0) + regainAmount);
    }
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const GREGORIAN_YEAR_OFFSET = 1523;

function advanceCalendar(calendar, days) {
    const date = toGregorianDate(calendar);
    date.setDate(date.getDate() + days);
    fromGregorianDate(calendar, date);
}

function syncCalendarWeekday(calendar) {
    fromGregorianDate(calendar, toGregorianDate(calendar));
}

function toGregorianDate(calendar) {
    const monthIndex = Math.max(0, MONTHS.indexOf(calendar.month));
    return new Date(toNumber(calendar.year, 502) + GREGORIAN_YEAR_OFFSET, monthIndex, Math.max(1, toNumber(calendar.day, 1)));
}

function fromGregorianDate(calendar, date) {
    calendar.weekday = WEEKDAYS[(date.getDay() + 6) % 7];
    calendar.day = date.getDate();
    calendar.month = MONTHS[date.getMonth()];
    calendar.year = date.getFullYear() - GREGORIAN_YEAR_OFFSET;
}

function calendarDateKey(calendar) {
    return `${calendar.year}-${calendar.month}-${calendar.day}`;
}

function transferInventoryItem(state, payload) {
    const source = findCharacter(state, payload.sourceCharacterId);
    const target = findCharacter(state, payload.targetCharacterId);
    if (!source || !target) throw new Error('Postava neexistuje.');
    const sourceCollection = getInventoryCollection(source, payload.collection);
    const index = Number(payload.index);
    const [item] = sourceCollection.splice(index, 1);
    if (!item) throw new Error('Item neexistuje.');
    const targetInventory = ensureInventory(target);
    if (!Array.isArray(targetInventory[payload.collection])) throw new Error('Neznama kolekce inventare.');
    targetInventory[payload.collection].push(clone(item));
}

function upsertDatabaseItem(collection, item, prefix) {
    const id = item.id || makeId(prefix);
    const next = { ...clone(item), id };
    const index = collection.findIndex(entry => entry.id === id);
    if (index === -1) collection.push(next);
    else collection[index] = next;
}

function upsertSpellDatabaseItem(state, item) {
    if (!Array.isArray(state.spellDatabase)) state.spellDatabase = [];
    const next = normalizeSpell(item);
    const index = state.spellDatabase.findIndex(entry => {
        if (next.importKey && entry.importKey) return entry.importKey === next.importKey;
        return entry.id === next.id;
    });
    if (index === -1) state.spellDatabase.push(next);
    else state.spellDatabase[index] = { ...next, id: state.spellDatabase[index].id };
}

function spellExists(state, spellId) {
    return (state.spellDatabase || []).some(spell => spell.id === spellId);
}

function spellName(state, spellId) {
    return (state.spellDatabase || []).find(spell => spell.id === spellId)?.name || spellId || 'spell';
}

function validatePreparedSpellIds(state, character, ids) {
    ensureSpellShape(character);
    const known = new Set(character.spellbook.knownSpellIds);
    const spellsById = new Map((state.spellDatabase || []).map(spell => [spell.id, spell]));
    const result = [];
    let normalCount = 0;
    let epicCount = 0;
    [...new Set(Array.isArray(ids) ? ids.map(String) : [])].forEach(id => {
        const spell = spellsById.get(id);
        if (!known.has(id) || !spell || spell.levelKey === 'cantrip') return;
        if (isNormalSpellLevel(spell.levelKey)) {
            if (normalCount >= character.spellbook.preparedNonEpicMax) return;
            normalCount += 1;
            result.push(id);
            return;
        }
        if (isEpicSpellLevel(spell.levelKey)) {
            if (epicCount >= character.spellbook.preparedEpicMax) return;
            epicCount += 1;
            result.push(id);
            return;
        }
        result.push(id);
    });
    return result;
}

function isNormalSpellLevel(levelKey) {
    const level = Number(levelKey);
    return Number.isInteger(level) && level >= 1 && level <= 9;
}

function isEpicSpellLevel(levelKey) {
    return /^epic[1-3]$/.test(String(levelKey || ''));
}

function normalizeImport(items) {
    if (Array.isArray(items)) return items;
    if (items && Array.isArray(items.data)) return items.data;
    return [];
}

function updateSpellSlotsForLevel(character) {
    const slotsArray = SPELL_SLOTS_TABLE[Math.min(20, character.spellcasterLevel || 0)] || [];
    const nextSlots = {};
    slotsArray.forEach((max, index) => {
        if (max > 0) {
            const level = String(index + 1);
            const used = character.spellSlots?.[level]?.used || 0;
            nextSlots[level] = { max, used: clamp(used, 0, max) };
        }
    });
    character.spellSlots = nextSlots;
}

function applyGameAction(state, action, client) {
    const page = action.page || pageForAction(action.type);
    const before = snapshotPage(state, page);
    const label = applyActionMutation(state, action, client);
    const after = snapshotPage(state, page);
    const visibility = action.type.startsWith('monster.') || action.type.startsWith('database.monster') || action.type === 'database.importAll' || action.type === 'character.deleteSavedPlayer' || (action.type.startsWith('toolbelt.') && action.type !== 'toolbelt.dice.add')
        ? 'dm'
        : 'all';
    const entry = addLogEntry(state, action, client, page, label, before, after, true, visibility);
    return { entry, state };
}

function undoPage(state, page, client) {
    const entry = [...state.actionLog].reverse().find(item => item.page === page && item.reversible && !item.undone);
    if (!entry) throw new Error('Na teto strance neni co vratit.');
    restorePage(state, page, entry.before);
    entry.undone = true;
    if (!state.redoStacks[page]) state.redoStacks[page] = [];
    state.redoStacks[page].push(entry.id);
    const undoEntry = addLogEntry(
        state,
        { type: 'history.undo' },
        client,
        page,
        `Undo: ${entry.label}`,
        snapshotPage(state, page),
        snapshotPage(state, page),
        false,
        entry.visibility
    );
    return { target: entry, entry: undoEntry };
}

function redoPage(state, page, client) {
    const stack = state.redoStacks[page] || [];
    const entryId = stack.pop();
    const entry = state.actionLog.find(item => item.id === entryId);
    if (!entry || !entry.undone) throw new Error('Na teto strance neni co znovu provest.');
    restorePage(state, page, entry.after);
    entry.undone = false;
    const redoEntry = addLogEntry(
        state,
        { type: 'history.redo' },
        client,
        page,
        `Redo: ${entry.label}`,
        snapshotPage(state, page),
        snapshotPage(state, page),
        false,
        entry.visibility
    );
    return { target: entry, entry: redoEntry };
}

module.exports = {
    applyGameAction,
    undoPage,
    redoPage,
    snapshotPage,
    restorePage,
    pageForAction
};
