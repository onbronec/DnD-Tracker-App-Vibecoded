const {
    normalizeCharacter,
    normalizeCondition,
    normalizeCharacterAbility,
    normalizeCharacterAction,
    normalizeInventory,
    normalizeMagicItem,
    normalizeMonsterDbItem,
    normalizeEncounter,
    normalizeEncounterGroup,
    normalizePotion,
    normalizeSpell,
    normalizeSpellbook,
    seedConditions
} = require('./migrations');
const { importSpellsFromDataFolder } = require('./spellImport');
const { clone, clamp, makeId, toNumber } = require('./utils');

const { pruneHistory } = require('./history');
const { prepareAoe } = require('./aoe');
const { normalizeFeatures, normalizeFeatureActions, normalizeActionSettings, spendActionReaction, normalizeCasting, featureFor, consumeSpark } = require('./casting');
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

const EPIC_SLOTS_TABLE = {
    21: { epic1: 0, epic2: 0, epic3: 0 },
    22: { epic1: 2, epic2: 0, epic3: 0 },
    23: { epic1: 3, epic2: 0, epic3: 0 },
    24: { epic1: 3, epic2: 1, epic3: 0 },
    25: { epic1: 3, epic2: 2, epic3: 0 },
    26: { epic1: 3, epic2: 2, epic3: 1 },
    27: { epic1: 3, epic2: 2, epic3: 1 },
    28: { epic1: 3, epic2: 2, epic3: 1 },
    29: { epic1: 3, epic2: 2, epic3: 1 },
    30: { epic1: 3, epic2: 2, epic3: 1 }
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

function effectiveMaxHp(character) {
    return Math.max(1, (Number(character.maxHp) || 1) + maxHpEffectBonus(character));
}

function maxHpEffectBonus(character) {
    return (character.effects || []).reduce((sum, effect) => {
        const current = typeof effect === 'string' ? { name: effect, level: null, value: null } : effect;
        const value = Number(current.value ?? current.level ?? 0);
        if (!Number.isFinite(value)) return sum;
        if (current.name === 'Max HP Increased') return sum + value;
        if (current.name === 'Max HP Reduced') return sum - value;
        return sum;
    }, 0);
}

function clampCurrentHpToEffectiveMax(character) {
    character.currentHp = clamp(character.currentHp || 0, 0, effectiveMaxHp(character));
}

function syncFeatureStatusEffect(character, feature) {
    if (character.casting?.type === 'divineSpark' && feature?.id === character.casting.sparkFeatureId && feature.statusName?.toLowerCase() === character.casting.sparkCondition.toLowerCase()) return;
    if (!feature?.statusEffect || !feature.statusName) return;
    const statusName = String(feature.statusName || '').trim();
    if (!statusName) return;
    if (!Array.isArray(character.effects)) character.effects = [];
    const hasStatus = character.effects.some(effect => (typeof effect === 'string' ? effect : effect.name) === statusName);
    if ((feature.used || 0) > 0) {
        if (!hasStatus) character.effects.push({ name: statusName, level: null });
        return;
    }
    character.effects = character.effects.filter(effect => (typeof effect === 'string' ? effect : effect.name) !== statusName);
    clampCurrentHpToEffectiveMax(character);
}

function pageForAction(type) {
    if (type.startsWith('toolbelt.')) return 'toolbelt';
    if (type === 'character.activateInCombat' || type === 'character.deactivateFromCombat' || type === 'character.deleteSavedPlayer') return 'databases';
    if (type.startsWith('combat.') || type.startsWith('character.') || type.startsWith('effect.')) return 'combat';
    if (type.startsWith('inventory.')) return 'inventory';
    if (type.startsWith('spell.') || type.startsWith('spellbook.')) return 'spells';
    if (type.startsWith('monster.')) return 'monsters';
    if (type.startsWith('database.')) return 'databases';
    if (type.startsWith('encounter.')) return 'encounters';
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
                casting: clone(c.casting),
                spellSlots: clone(c.spellSlots),
                customFeatures: clone(c.customFeatures),
                characterAbilities: clone(c.characterAbilities || []),
                characterActions: clone(c.characterActions || []),
                ac: c.ac,
                initBonus: c.initBonus,
                maxReactions: c.maxReactions,
                currentReactions: c.currentReactions,
                hitDice: clone(c.hitDice),
                effects: clone(c.effects),
                proficiencyBonus: c.proficiencyBonus,
                abilityScores: clone(c.abilityScores),
                savingThrowProficiencies: clone(c.savingThrowProficiencies),
                skillProficiencies: clone(c.skillProficiencies),
                skillExpertise: clone(c.skillExpertise),
                skillAbilityOverrides: clone(c.skillAbilityOverrides || {}),
                sheetBonuses: clone(c.sheetBonuses || []),
                sheetGeneral: clone(c.sheetGeneral || {}),
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
    if (page === 'encounters') {
        return {
            encounters: clone(state.encounters || []),
            encounterGroups: clone(state.encounterGroups || []),
            activeEncounterId: state.activeEncounterId || null,
            characters: clone(state.characters),
            combatState: clone(state.combatState)
        };
    }
    if (page === 'toolbelt') {
        return {
            toolbelt: clone(ensureToolbelt(state))
        };
    }
    throw new Error('Neplatna stranka historie.');
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
    if (page === 'encounters') {
        state.encounters = clone(snapshot.encounters || []);
        state.encounterGroups = clone(snapshot.encounterGroups || []);
        state.activeEncounterId = snapshot.activeEncounterId || null;
        state.characters = clone(snapshot.characters || state.characters);
        state.combatState = clone(snapshot.combatState || state.combatState);
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
            character.customFeatures = normalizeFeatures(saved.customFeatures);
            character.casting = normalizeCasting(saved.casting || character.casting, character);
            character.characterAbilities = clone(saved.characterAbilities || []);
            character.characterActions = clone(saved.characterActions || []);
            character.ac = saved.ac || character.ac || 10;
            character.initBonus = saved.initBonus || 0;
            character.maxReactions = saved.maxReactions ?? 1;
            character.currentReactions = saved.currentReactions ?? character.maxReactions ?? 1;
            character.hitDice = clone(saved.hitDice || { max: 0, current: 0 });
            character.effects = clone(saved.effects || []);
            character.proficiencyBonus = saved.proficiencyBonus || 2;
            character.abilityScores = clone(saved.abilityScores || character.abilityScores || {});
            character.savingThrowProficiencies = clone(saved.savingThrowProficiencies || []);
            character.skillProficiencies = clone(saved.skillProficiencies || []);
            character.skillExpertise = clone(saved.skillExpertise || []);
            character.skillAbilityOverrides = clone(saved.skillAbilityOverrides || {});
            character.sheetBonuses = clone(saved.sheetBonuses || []);
            character.sheetGeneral = clone(saved.sheetGeneral || {});
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
    pruneHistory(state);
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
    character.customFeatures = normalizeFeatures(character.customFeatures);
    character.casting = normalizeCasting(character.casting, character);
    character.characterAbilities = Array.isArray(character.characterAbilities)
        ? character.characterAbilities.map(normalizeCharacterAbility)
        : [];
    character.characterActions = Array.isArray(character.characterActions)
        ? character.characterActions.map(normalizeCharacterAction)
        : [];
    if (!character.hitDice || typeof character.hitDice !== 'object') character.hitDice = { max: 0, current: 0 };
    if (!character.abilityScores || typeof character.abilityScores !== 'object') {
        character.abilityScores = { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };
    }
    if (!Array.isArray(character.savingThrowProficiencies)) character.savingThrowProficiencies = [];
    if (!Array.isArray(character.skillProficiencies)) character.skillProficiencies = [];
    if (!Array.isArray(character.skillExpertise)) character.skillExpertise = [];
    if (!character.skillAbilityOverrides || typeof character.skillAbilityOverrides !== 'object') character.skillAbilityOverrides = {};
    if (!Array.isArray(character.sheetBonuses)) character.sheetBonuses = [];
    if (!character.sheetGeneral || typeof character.sheetGeneral !== 'object') character.sheetGeneral = { spellcastingAbility: 'charisma', speeds: { walk: 30, fly: 0, hover: 0, swim: 0, climb: 0, burrow: 0 } };
    character.maxReactions = Math.max(0, toNumber(character.maxReactions, 1));
    character.currentReactions = clamp(toNumber(character.currentReactions, character.maxReactions), 0, character.maxReactions);
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
        case 'toolbelt.partyCheck.record': {
            const key = String(payload.checkKey || '');
            const [kind, check] = key.split(':');
            if (!((kind === 'save' || kind === 'ability') && ABILITY_KEYS.includes(check)) && !(kind === 'skill' && SKILL_KEYS.includes(check))) throw new Error('Neplatny party check.');
            if (key !== `${kind}:${check}`) throw new Error('Neplatny party check.');
            const results = Array.isArray(payload.results) ? payload.results : [];
            const validated = results.map(result => {
                const character = findCharacter(state, result.characterId);
                if (!character || character.type !== 'player' || character.activeInCombat === false || !Number.isFinite(result.total)) throw new Error('Neplatny vysledek.');
                return [character.id, {
                    total: result.total,
                    natural: Number.isInteger(result.natural) && result.natural >= 1 && result.natural <= 20 ? result.natural : null,
                    detail: String(result.detail || '').slice(0, 500)
                }];
            });
            const toolbelt = ensureToolbelt(state);
            if (!toolbelt.partyChecks) toolbelt.partyChecks = {};
            toolbelt.partyChecks[key] = { ...(toolbelt.partyChecks[key] || {}), ...Object.fromEntries(validated) };
            return `Party Checks: ${key}`;
        }
        case 'toolbelt.partyCheck.clear': {
            const toolbelt = ensureToolbelt(state);
            if (toolbelt.partyChecks) delete toolbelt.partyChecks[String(payload.checkKey)];
            return 'Party Checks: clear results';
        }
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
            // If monster has multiple turns, automatically create a secondary turn entry
            if (character.type === 'monster' && character.hasMultipleTurns) {
                const secondaryId = `${character.id}_turn2`;
                const secondaryInit = character.initiative !== null && character.initiative !== undefined
                    ? character.initiative - 10
                    : null;
                const secondary = normalizeCharacter({
                    ...clone(character),
                    id: secondaryId,
                    name: `${character.name} (Turn 2)`,
                    initiative: secondaryInit,
                    hasMultipleTurns: false // prevent recursive creation
                });
                state.characters.push(secondary);
            }
            return `${character.name} pridana do trackeru`;
        }
        case 'character.setMonsterNumber': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'monster' || character.isNonMonster) throw new Error('Monstrum neexistuje.');
            const value = Number(payload.value);
            if (!Number.isSafeInteger(value) || value < 0) throw new Error('Neplatne cislo monstra.');
            const primaryId = character.id.replace(/_turn2$/, '');
            const primary = findCharacter(state, primaryId);
            const source = primary || character;
            const oldName = source.id.endsWith('_turn2') ? source.name.replace(/ \(Turn 2\)$/, '') : source.name;
            const baseName = oldName === source.monsterData?.name ? oldName : oldName.replace(/\s+\d+$/, '');
            const name = value ? `${baseName} ${value}` : baseName;
            if (primary) primary.name = name;
            const secondary = findCharacter(state, `${primaryId}_turn2`);
            if (secondary) secondary.name = `${name} (Turn 2)`;
            return `${oldName}: oznaceni ${name}`;
        }
        case 'character.remove': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            if (character.type === 'player') {
                character.activeInCombat = false;
                character.initiative = null;
                return `${character.name} odstranena z boje`;
            }
            // Remove the primary entry and any associated multi-turn entries
            const primaryId = payload.characterId.replace(/_turn2$/, '');
            state.characters = state.characters.filter(item =>
                item.id !== payload.characterId &&
                item.id !== `${primaryId}_turn2` &&
                (payload.characterId.endsWith('_turn2') ? item.id !== primaryId : true)
            );
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
            if (character.isNonMonster && !character.hasHpAc) throw new Error('Tento non-monster objekt nema HP.');
            const amount = toNumber(payload.amount, 0);
            if (amount < 0) {
                let damage = Math.abs(amount);
                const tempDamage = Math.min(character.tempHp || 0, damage);
                character.tempHp = (character.tempHp || 0) - tempDamage;
                damage -= tempDamage;
                character.currentHp = clamp((character.currentHp || 0) - damage, 0, effectiveMaxHp(character));
            } else {
                character.currentHp = clamp((character.currentHp || 0) + amount, 0, effectiveMaxHp(character));
            }
            return `${character.name}: ${amount >= 0 ? '+' : ''}${amount} HP`;
        }
        case 'character.setTempHp': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            if (character.isNonMonster && !character.hasHpAc) throw new Error('Tento non-monster objekt nema HP.');
            character.tempHp = Math.max(0, toNumber(payload.value, 0));
            return `${character.name}: temp HP ${character.tempHp}`;
        }
        case 'character.setInitiative': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            if (character.isNonMonster) {
                character.initiative = Number(character.fixedInitiative ?? 20);
                return `${character.name}: fixed initiative ${character.initiative}`;
            }
            character.initiative = payload.value === '' || payload.value === null ? null : toNumber(payload.value, 0);
            // If this is the primary of a multi-turn monster, update secondary initiative too
            if (character.hasMultipleTurns && !character.id.endsWith('_turn2')) {
                const secondary = findCharacter(state, `${character.id}_turn2`);
                if (secondary && character.initiative !== null) {
                    secondary.initiative = character.initiative - 10;
                }
            }
            sortInitiativePreservingTurn(state, payload.characterId);
            return `${character.name}: iniciativa ${character.initiative ?? '-'}`;
        }
        case 'character.updatePower': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            character.currentPower = Math.max(0, payload.delta !== undefined ? (character.currentPower || 0) + toNumber(payload.delta) : toNumber(payload.value, character.currentPower || 0));
            if (character.monsterAbilities?.power) character.monsterAbilities.power.current = character.currentPower;
            return `${character.name}: ${character.powerName || 'Power'} ${character.currentPower}`;
        }
        case 'character.reaction.set': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            character.maxReactions = Math.max(0, toNumber(character.maxReactions, 1));
            character.currentReactions = clamp(toNumber(payload.value, character.currentReactions ?? character.maxReactions), 0, character.maxReactions);
            return `${character.name}: reactions ${character.currentReactions}/${character.maxReactions}`;
        }
        case 'effect.add': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            const name = String(payload.name || '').trim();
            if (!name) throw new Error('Efekt nema nazev.');
            if (!Array.isArray(character.effects)) character.effects = [];
            const effect = { name, level: payload.level ?? null };
            if (payload.remainingRounds !== undefined && payload.remainingRounds !== null && payload.remainingRounds !== '') {
                if (!Number.isInteger(Number(payload.remainingRounds)) || Number(payload.remainingRounds) < 1) throw new Error('Neplatne trvani condition.');
                effect.remainingRounds = Number(payload.remainingRounds);
            }
            if (payload.ability) effect.ability = payload.ability;
            if (payload.value !== undefined && payload.value !== null) effect.value = toNumber(payload.value, 0);
            if (payload.diceCount !== undefined && payload.diceCount !== null) effect.diceCount = Math.max(0, toNumber(payload.diceCount, 0));
            if (payload.diceSides !== undefined && payload.diceSides !== null) effect.diceSides = Math.max(0, toNumber(payload.diceSides, 0));
            if (payload.damageType !== undefined && payload.damageType !== null) effect.damageType = String(payload.damageType || '');
            character.effects.push(effect);
            clampCurrentHpToEffectiveMax(character);
            return `${character.name}: efekt ${name}`;
        }
        case 'effect.duration.set': {
            const character = findCharacter(state, payload.characterId);
            const effect = character?.effects?.[Number(payload.index)];
            if (!effect) throw new Error('Efekt neexistuje.');
            const current = typeof effect === 'string' ? { name: effect, level: null } : { ...effect };
            if (payload.remainingRounds === null || payload.remainingRounds === '' || Number(payload.remainingRounds) === 0) delete current.remainingRounds;
            else {
                if (!Number.isInteger(Number(payload.remainingRounds)) || Number(payload.remainingRounds) < 1) throw new Error('Neplatne trvani condition.');
                current.remainingRounds = Number(payload.remainingRounds);
            }
            character.effects[Number(payload.index)] = current;
            return `${character.name}: condition duration`;
        }
        case 'effect.remove': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            const index = Number(payload.index);
            const removed = character.effects?.[index];
            if (!removed) throw new Error('Efekt neexistuje.');
            character.effects.splice(index, 1);
            clampCurrentHpToEffectiveMax(character);
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
            clampCurrentHpToEffectiveMax(character);
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
        case 'combat.aoe.apply': {
            const targets = prepareAoe(state, payload);
            for (const { character, damage, effects } of targets) {
                const absorbed = Math.min(character.tempHp || 0, damage);
                character.tempHp = Math.max(0, (character.tempHp || 0) - absorbed);
                character.currentHp = clamp((character.currentHp || 0) - (damage - absorbed), 0, effectiveMaxHp(character));
                character.effects = effects;
                clampCurrentHpToEffectiveMax(character);
                syncMultiTurnCharacters(state, character.id);
            }
            return `AOE applied (${targets.length} targets)`;
        }
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
            if (Number.isFinite(payload.combatState?.durationRound)) state.combatState.durationRound = Math.max(0, Math.floor(payload.combatState.durationRound));
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
        case 'spell.casting.update': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'player') throw new Error('Hrac neexistuje.');
            ensureSpellShape(character);
            if (!['standard', 'warlock', 'divineSpark'].includes(payload.casting?.type)) throw new Error('Neplatny casting type.');
            const casting = normalizeCasting(payload.casting, character);
            for (const id of (casting.type === 'warlock' ? Object.values(casting.featureByLevel) : casting.type === 'divineSpark' ? [casting.sparkFeatureId] : []).filter(Boolean)) {
                if (!character.customFeatures.some(feature => feature.id === id)) throw new Error('Casting resource neexistuje.');
            }
            if (casting.type === 'warlock' && new Set(['1', '2', '3', '4', '5'].map(level => casting.featureByLevel[level])).size !== 1) throw new Error('Levely 1-5 musi sdilet jeden resource.');
            if (casting.type === 'warlock' && !casting.featureByLevel['1']) throw new Error('Vyber sdileny Warlock resource.');
            const maxima = Object.entries(payload.slotMaxByLevel || {}).map(([level, max]) => {
                if (!/^[6-9]$/.test(level) || !Number.isInteger(max) || max < 0 || max > 100) throw new Error('Neplatny pocet spellslotu.');
                return [level, max];
            });
            character.casting = casting;
            if (casting.type === 'warlock') maxima.forEach(([level, max]) => { character.spellSlots[level] = { max, used: Math.min(max, character.spellSlots[level]?.used || 0) }; });
            return `${character.name}: casting settings`;
        }
        case 'spell.spark.spend': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'player') throw new Error('Hrac neexistuje.');
            ensureSpellShape(character);
            consumeSpark(character);
            clampCurrentHpToEffectiveMax(character);
            return `${character.name}: Divine Spark`;
        }
        case 'spell.cast': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'player') throw new Error('Hrac neexistuje.');
            ensureSpellShape(character);
            const spell = state.spellDatabase.find(item => item.id === payload.spellId);
            if (!spell || !character.spellbook.knownSpellIds.includes(spell.id)) throw new Error('Spell neni ve spellbooku.');
            if (character.spellbook.preparesSpells && spell.levelKey !== 'cantrip' && !character.spellbook.preparedSpellIds.includes(spell.id)) throw new Error('Spell neni prepared.');
            const level = String(payload.level || spell.levelKey);
            if (spell.levelKey === 'cantrip') return `${character.name}: ${spell.name}`;
            if (/^[1-9]$/.test(spell.levelKey) ? !/^[1-9]$/.test(level) || Number(level) < Number(spell.levelKey) : level !== spell.levelKey) throw new Error('Neplatny spell level.');
            if (character.casting.type === 'divineSpark' && /^epic[1-3]$/.test(level)) {
                consumeSpark(character);
                clampCurrentHpToEffectiveMax(character);
            } else {
                const featureId = character.casting.type === 'warlock' ? character.casting.featureByLevel[level] : null;
                if (featureId) {
                    const feature = character.customFeatures.find(item => item.id === featureId);
                    if (!feature || (feature.used || 0) >= feature.maxUses) throw new Error('Casting resource neni dostupny.');
                    feature.used = (feature.used || 0) + 1;
                    syncFeatureStatusEffect(character, feature);
                } else {
                    const slots = character.spellSlots[level];
                    if (!slots || slots.used >= slots.max) throw new Error('Spellslot neni dostupny.');
                    slots.used += 1;
                }
            }
            return `${character.name}: cast ${spell.name} (${level})`;
        }
        case 'spell.slot.spend': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            ensureSpellShape(character);
            const slots = character.spellSlots[String(payload.level)];
            if (!slots || slots.used >= slots.max) throw new Error('Spellslot neni dostupny.');
            slots.used += 1;
            return `${character.name}: spell slot L${payload.level}`;
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
        case 'spell.feature.use':
        case 'spell.feature.action.use': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            ensureSpellShape(character);
            const feature = featureFor(character, payload);
            const usedAction = action.type === 'spell.feature.use' ? feature : feature?.actions.find(item => item.id === payload.actionId);
            if (!usedAction) throw new Error('Feature action neexistuje.');
            if ((feature.used || 0) >= feature.maxUses) throw new Error('Feature nema dostupna pouziti.');
            spendActionReaction(character, usedAction);
            feature.used = (feature.used || 0) + 1;
            syncFeatureStatusEffect(character, feature);
            return `${character.name}: ${feature.name}${usedAction === feature ? '' : ` — ${usedAction.name}`}`;
        }
        case 'spell.feature.uses': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            ensureSpellShape(character);
            const feature = featureFor(character, payload);
            if (!feature) throw new Error('Feature neexistuje.');
            feature.used = clamp(payload.delta !== undefined ? (feature.used || 0) + toNumber(payload.delta) : toNumber(payload.used, feature.used || 0), 0, feature.maxUses || 0);
            syncFeatureStatusEffect(character, feature);
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
            character.customFeatures = Array.isArray(payload.customFeatures) ? normalizeFeatures(payload.customFeatures) : character.customFeatures;
            return `${character.name}: kouzla/abilities`;
        }
        case 'spell.sheet.update': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'player') throw new Error('Hrac neexistuje.');
            ensureSpellShape(character);
            character.maxHp = Math.max(1, toNumber(payload.maxHp, character.maxHp || 1));
            character.currentHp = clamp(toNumber(character.currentHp, effectiveMaxHp(character)), 0, effectiveMaxHp(character));
            character.proficiencyBonus = clamp(toNumber(payload.proficiencyBonus, character.proficiencyBonus || 2), 0, 10);
            character.ac = Math.max(0, toNumber(payload.ac, character.ac || 10));
            character.initBonus = toNumber(payload.initBonus, character.initBonus || 0);
            character.maxReactions = Math.max(0, toNumber(payload.maxReactions, character.maxReactions ?? 1));
            character.currentReactions = clamp(toNumber(character.currentReactions, character.maxReactions), 0, character.maxReactions);
            character.abilityScores = normalizeSheetAbilityScores(payload.abilityScores || character.abilityScores);
            character.savingThrowProficiencies = normalizeAllowedList(payload.savingThrowProficiencies, ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']);
            character.skillProficiencies = normalizeAllowedList(payload.skillProficiencies, SKILL_KEYS);
            character.skillExpertise = normalizeAllowedList(payload.skillExpertise, SKILL_KEYS);
            character.skillAbilityOverrides = normalizeSkillAbilityOverrides(payload.skillAbilityOverrides);
            character.sheetBonuses = normalizeSheetBonuses(payload.sheetBonuses);
            character.sheetGeneral = normalizeSheetGeneral(payload.sheetGeneral);
            return `${character.name}: character sheet`;
        }
        case 'spell.action.upsert': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'player') throw new Error('Hrac neexistuje.');
            ensureSpellShape(character);
            const action = normalizeCharacterAction(payload.action || payload);
            const index = character.characterActions.findIndex(item => item.id === action.id);
            if (index === -1) character.characterActions.push(action);
            else character.characterActions[index] = action;
            return `${character.name}: action ${action.name}`;
        }
        case 'spell.action.use': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'player') throw new Error('Hrac neexistuje.');
            ensureSpellShape(character);
            const action = character.characterActions.find(item => item.id === payload.id);
            if (!action) throw new Error('Action neexistuje.');
            spendActionReaction(character, action);
            return `${character.name}: ${action.name}`;
        }
        case 'spell.action.remove': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'player') throw new Error('Hrac neexistuje.');
            ensureSpellShape(character);
            const id = String(payload.id || '');
            const removed = character.characterActions.find(item => item.id === id);
            character.characterActions = character.characterActions.filter(item => item.id !== id);
            return `${character.name}: removed action ${removed?.name || id}`;
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
            const current = featureFor(character, payload);
            const index = character.customFeatures.indexOf(current);
            if (!current) throw new Error('Feature neexistuje.');
            character.customFeatures[index] = normalizeFeaturePayload(payload, current);
            return `${character.name}: upravena feature ${character.customFeatures[index].name}`;
        }
        case 'spell.feature.remove': {
            const character = findCharacter(state, payload.characterId);
            if (!character) throw new Error('Postava neexistuje.');
            ensureSpellShape(character);
            const removed = featureFor(character, payload);
            const index = character.customFeatures.indexOf(removed);
            if (!removed) throw new Error('Feature neexistuje.');
            character.customFeatures.splice(index, 1);
            return `${character.name}: odebrana feature ${removed.name}`;
        }
        case 'spell.ability.upsert': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'player') throw new Error('Hrac neexistuje.');
            ensureSpellShape(character);
            const ability = normalizeCharacterAbility(payload.ability || payload);
            const index = character.characterAbilities.findIndex(item => item.id === ability.id);
            if (index === -1) character.characterAbilities.push(ability);
            else character.characterAbilities[index] = ability;
            return `${character.name}: ability ${ability.name}`;
        }
        case 'spell.ability.remove': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'player') throw new Error('Hrac neexistuje.');
            ensureSpellShape(character);
            const id = String(payload.id || '');
            const removed = character.characterAbilities.find(item => item.id === id);
            character.characterAbilities = character.characterAbilities.filter(item => item.id !== id);
            return `${character.name}: removed ability ${removed?.name || id}`;
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
        case 'monster.feature.uses': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'monster') throw new Error('Monstrum neexistuje.');
            const feature = character.monsterAbilities?.customFeatures?.[Number(payload.index)];
            if (!feature) throw new Error('Feature neexistuje.');
            feature.used = clamp(payload.delta !== undefined ? (feature.used || 0) + toNumber(payload.delta) : toNumber(payload.used, feature.used || 0), 0, feature.maxUses || 0);
            // Track recharge attempts - only one per turn
            if (payload.rechargeAttempted !== undefined) {
                feature.rechargeAttempted = Boolean(payload.rechargeAttempted);
            }
            return `${character.name}: ${feature.name}`;
        }
        case 'monster.spellSlot.toggle': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'monster') throw new Error('Monstrum neexistuje.');
            const slots = character.monsterAbilities?.spellcasting?.spellSlots?.[String(payload.level)] || character.monsterAbilities?.spellSlots?.[String(payload.level)];
            if (!slots || slots.atWill) throw new Error('Spell slot level neexistuje.');
            const index = Number(payload.index);
            slots.used = payload.delta !== undefined ? slots.used + toNumber(payload.delta) : payload.used !== undefined ? toNumber(payload.used) : index < slots.used ? index : index + 1;
            slots.used = clamp(slots.used, 0, slots.max || 0);
            if (character.monsterAbilities?.spellSlots?.[String(payload.level)]) character.monsterAbilities.spellSlots[String(payload.level)].used = slots.used;
            return `${character.name}: monster spell slot L${payload.level}`;
        }
        case 'monster.perDaySpell.uses': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'monster') throw new Error('Monstrum neexistuje.');
            const spell = character.monsterAbilities?.spellcasting?.perDaySpells?.[Number(payload.index)] || character.monsterAbilities?.perDaySpells?.[Number(payload.index)];
            if (!spell) throw new Error('Spell neexistuje.');
            spell.used = clamp(payload.delta !== undefined ? (spell.used || 0) + toNumber(payload.delta) : toNumber(payload.used, spell.used || 0), 0, spell.maxUses || 0);
            if (character.monsterAbilities?.perDaySpells?.[Number(payload.index)]) character.monsterAbilities.perDaySpells[Number(payload.index)].used = spell.used;
            return `${character.name}: ${spell.name}`;
        }
        case 'monster.legendary.uses': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'monster') throw new Error('Monstrum neexistuje.');
            const legendary = character.monsterAbilities?.legendaryActions;
            if (!legendary?.enabled) throw new Error('Legendary actions nejsou aktivni.');
            legendary.used = clamp(payload.delta !== undefined ? (legendary.used || 0) + toNumber(payload.delta) : toNumber(payload.used, legendary.used || 0), 0, legendary.max || 0);
            return `${character.name}: legendary ${legendary.used}/${legendary.max}`;
        }
        case 'monster.epic.uses': {
            const character = findCharacter(state, payload.characterId);
            if (!character || character.type !== 'monster') throw new Error('Monstrum neexistuje.');
            const epic = character.monsterAbilities?.epicActions?.actions?.[Number(payload.index)];
            if (!epic) throw new Error('Epic action neexistuje.');
            epic.used = clamp(payload.delta !== undefined ? (epic.used || 0) + toNumber(payload.delta) : toNumber(payload.used, epic.used || 0), 0, epic.maxUses || 0);
            return `${character.name}: epic ${epic.name}`;
        }
        case 'encounter.upsert': {
            const encounter = normalizeEncounter(payload.encounter || {});
            const index = (state.encounters || []).findIndex(item => item.id === encounter.id);
            if (index >= 0) state.encounters[index] = encounter;
            else state.encounters = [...(state.encounters || []), encounter];
            return `Encounter ulozen: ${encounter.name}`;
        }
        case 'encounter.remove': {
            state.encounters = (state.encounters || []).filter(item => item.id !== payload.id);
            if (state.activeEncounterId === payload.id) state.activeEncounterId = null;
            return 'Encounter odstraněn';
        }
        case 'encounter.group.upsert': {
            const group = normalizeEncounterGroup(payload.group || {});
            const index = (state.encounterGroups || []).findIndex(item => item.id === group.id);
            if (index >= 0) state.encounterGroups[index] = group;
            else state.encounterGroups = [...(state.encounterGroups || []), group];
            return `Story arc uložen: ${group.name}`;
        }
        case 'encounter.group.remove': {
            state.encounterGroups = (state.encounterGroups || []).filter(item => item.id !== payload.id);
            state.encounters = (state.encounters || []).map(item => item.groupId === payload.id ? { ...item, groupId: null } : item);
            return 'Story arc odstraněn';
        }
        case 'encounter.importToCombat': {
            const encounter = (state.encounters || []).find(item => item.id === payload.encounterId);
            if (!encounter) throw new Error('Encounter neexistuje.');
            const added = addEncounterEntriesToCombat(state, encounter.monsters);
            if (!added) throw new Error('Encounter neobsahuje žádná dostupná monstra.');
            state.activeEncounterId = encounter.id;
            return `Do boje přidán encounter ${encounter.name} (${added} monster)`;
        }
        case 'encounter.reserve.addToCombat': {
            const encounter = (state.encounters || []).find(item => item.id === payload.encounterId);
            if (!encounter) throw new Error('Encounter neexistuje.');
            const entry = (encounter.reserve || []).find(item => item.id === payload.entryId);
            if (!entry) throw new Error('Rezervní monstrum neexistuje.');
            const added = addEncounterEntriesToCombat(state, [{ ...entry, quantity: Math.max(1, Number(payload.quantity) || 1) }]);
            if (!added) throw new Error('Monstrum už není v databázi.');
            state.activeEncounterId = encounter.id;
            return 'Rezerva přidána do boje';
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
    // First pass: roll initiative for primary entries
    state.characters.forEach(character => {
        if (!isCombatant(character)) {
            character.initiative = null;
            return;
        }
        // Secondary turn entries get their initiative from the primary
        if (character.id.endsWith('_turn2')) return;
        if (character.isNonMonster) {
            character.initiative = Number(character.fixedInitiative ?? 20);
            return;
        }
        if (character.initiative === null || character.initiative === undefined) {
            const initiative = rollInitiative(character);
            character.initiative = initiative;
            if (character.groupId && !processedGroups.has(character.groupId)) {
                processedGroups.add(character.groupId);
                state.characters.forEach(other => {
                    if (other.groupId === character.groupId && !other.id.endsWith('_turn2')) other.initiative = initiative;
                });
            }
        }
    });
    // Second pass: set secondary turn initiatives to 10 below their primary
    state.characters.forEach(character => {
        if (!character.id.endsWith('_turn2')) return;
        const primaryId = character.id.replace(/_turn2$/, '');
        const primary = state.characters.find(c => c.id === primaryId);
        if (primary && primary.initiative !== null) {
            character.initiative = primary.initiative - 10;
        } else if (character.initiative === null || character.initiative === undefined) {
            character.initiative = rollInitiative(character);
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
    if (current) resetTurnResources(current);
    if (current?.type === 'monster') {
        current.revealedToPlayers = true;
        resetMonsterTurnResources(current);
    }
}

function resetTurnResources(character) {
    character.maxReactions = Math.max(0, toNumber(character.maxReactions, 1));
    character.currentReactions = character.maxReactions;
}

function resetMonsterTurnResources(monster) {
    const abilities = monster.monsterAbilities || {};
    if (abilities.legendaryActions?.enabled) abilities.legendaryActions.used = 0;
    if (abilities.epicActions?.enabled && Array.isArray(abilities.epicActions.actions)) {
        abilities.epicActions.actions.forEach(action => {
            action.used = 0;
        });
    }
    if (Array.isArray(abilities.customFeatures)) {
        abilities.customFeatures.forEach(feature => {
            if (feature.trackerType === 'round') feature.used = 0;
            // Reset recharge attempt flag so DM can roll again on next turn
            if (feature.trackerType === 'recharge') feature.rechargeAttempted = false;
        });
    }
    if (Array.isArray(monster.customFeatures)) {
        monster.customFeatures.forEach(feature => {
            if (feature.trackerType === 'round') feature.used = 0;
            if (feature.trackerType === 'recharge') feature.rechargeAttempted = false;
        });
    }
}

function nextTurn(state) {
    if (!state.combatState.active || state.characters.length === 0) return;
    const indexes = combatantIndexes(state);
    if (indexes.length === 0) return;
    const currentPosition = Math.max(0, indexes.indexOf(state.combatState.currentTurn));
    if (currentPosition < indexes.length - 1) {
        state.combatState.playedThisRound.push(state.combatState.currentTurn);
        state.combatState.currentTurn = indexes[currentPosition + 1];
    } else {
        const completedRound = state.combatState.round;
        if (completedRound > (state.combatState.durationRound ?? completedRound - 1)) {
            for (const index of indexes) {
                const character = state.characters[index];
                character.effects = (character.effects || []).flatMap(effect => {
                    if (typeof effect === 'string' || !effect.remainingRounds) return [effect];
                    return effect.remainingRounds > 1 ? [{ ...effect, remainingRounds: effect.remainingRounds - 1 }] : [];
                });
                clampCurrentHpToEffectiveMax(character);
            }
            state.combatState.durationRound = completedRound;
        }
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
    if (itemType === 'component' || itemType === 'spellComponent') {
        inv.spellComponents.push(normalizeInventoryItemForCollection('spellComponents', item));
    } else if (itemType === 'potion') {
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
    if (collection === 'spellComponents') {
        const trackingType = String(base.trackingType || (base.goldValue !== undefined ? 'value' : 'count')).toLowerCase() === 'value' ? 'value' : 'count';
        return {
            ...base,
            id: String(base.id || makeId('component')),
            name: String(base.name || 'Spell Component'),
            trackingType,
            count: trackingType === 'count' ? Math.max(0, toNumber(base.count ?? base.quantity, 1)) : undefined,
            goldValue: trackingType === 'value' ? Math.max(0, toNumber(base.goldValue ?? base.value, 0)) : undefined,
            description: String(base.description || base.notes || '')
        };
    }
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
    if (payload.actions !== undefined && (!Array.isArray(payload.actions) || payload.actions.some(action => !action || !String(action.name || '').trim()))) throw new Error('Kazda feature action musi mit nazev.');
    const actions = normalizeFeatureActions(payload.actions ?? fallback.actions);
    if (new Set(actions.map(action => action.id)).size !== actions.length) throw new Error('Feature actions musi mit unikatni ID.');
    return {
        ...fallback,
        id: fallback.id || makeId('feature'),
        description: String(payload.description ?? fallback.description ?? ''),
        isAction: Boolean(payload.isAction ?? fallback.isAction),
        ...normalizeActionSettings({ ...fallback, ...payload }),
        actions,
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

function normalizeSkillAbilityOverrides(overrides) {
    const source = overrides && typeof overrides === 'object' ? overrides : {};
    const result = {};
    Object.entries(source).forEach(([skill, ability]) => {
        const normalized = String(ability || '');
        if (SKILL_KEYS.includes(skill) && ABILITY_KEYS.includes(normalized)) result[skill] = normalized;
    });
    return result;
}

function normalizeSheetBonuses(bonuses) {
    if (!Array.isArray(bonuses)) return [];
    const targetTypes = ['save', 'skill', 'abilityCheck', 'allSaves', 'allSkills', 'allAbilityChecks', 'ac', 'initiative', 'spellAttack', 'spellDc'];
    return bonuses.map(bonus => {
        const valueMode = bonus?.valueMode === 'halfProficiency' ? 'halfProficiency' : 'fixed';
        return {
            id: String(bonus?.id || makeId('sheet_bonus')),
            targetType: targetTypes.includes(bonus?.targetType) ? bonus.targetType : 'skill',
            targetKey: bonus?.targetKey ? String(bonus.targetKey) : '',
            value: valueMode === 'halfProficiency' ? 0 : toNumber(bonus?.value, 0),
            valueMode,
            source: String(bonus?.source || ''),
            note: String(bonus?.note || ''),
            condition: bonus?.condition === 'ifNotProficientOrExpert' ? 'ifNotProficientOrExpert' : 'always'
        };
    });
}

function normalizeSheetGeneral(general) {
    const source = general && typeof general === 'object' ? general : {};
    const speeds = source.speeds && typeof source.speeds === 'object' ? source.speeds : {};
    return {
        spellcastingAbility: ABILITY_KEYS.includes(source.spellcastingAbility) ? source.spellcastingAbility : 'charisma',
        speeds: {
            walk: Math.max(0, toNumber(speeds.walk, 30)),
            fly: Math.max(0, toNumber(speeds.fly, 0)),
            hover: Math.max(0, toNumber(speeds.hover, 0)),
            swim: Math.max(0, toNumber(speeds.swim, 0)),
            climb: Math.max(0, toNumber(speeds.climb, 0)),
            burrow: Math.max(0, toNumber(speeds.burrow ?? speeds.dig, 0))
        }
    };
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
    character.customFeatures.forEach(feature => {
        regainFeatureUses(feature, restType);
        syncFeatureStatusEffect(character, feature);
    });
    if (character.casting?.type === 'warlock') {
        const linked = new Set(Object.values(character.casting.featureByLevel));
        character.customFeatures.filter(feature => linked.has(feature.id)).forEach(feature => { feature.used = 0; syncFeatureStatusEffect(character, feature); });
        Object.entries(character.spellSlots).forEach(([level, slots]) => { if (/^[1-9]$/.test(level)) slots.used = 0; });
    }
    if (restType !== 'long') return;

    character.currentHp = effectiveMaxHp(character);
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

function addEncounterEntriesToCombat(state, entries) {
    let added = 0;
    (entries || []).forEach(entry => {
        const monster = (state.monsterDatabase || []).find(item => item.id === entry.monsterId);
        if (!monster) return;
        const copies = Math.max(1, Math.min(99, Number(entry.quantity) || 1));
        for (let index = 0; index < copies; index += 1) {
            const power = monster.monsterAbilities?.power;
            const maxPower = Number(power?.max ?? monster.maxPower ?? 0) || 0;
            const name = copies > 1 ? `${monster.name} ${index + 1}` : monster.name;
            const character = normalizeCharacter({
                id: makeId('monster'),
                name,
                type: 'monster',
                activeInCombat: true,
                maxHp: Number(monster.hp || monster.maxHp || 1),
                currentHp: Number(monster.hp || monster.maxHp || 1),
                ac: Number(monster.ac || 10),
                maxReactions: Number(monster.maxReactions || 1),
                currentReactions: Number(monster.maxReactions || 1),
                initBonus: Number(monster.initBonus || 0),
                maxPower,
                currentPower: Number(power?.current ?? maxPower) || 0,
                powerName: String(power?.name || monster.powerName || 'Power'),
                hasMultipleTurns: Boolean(monster.hasMultipleTurns),
                isNonMonster: monster.entityKind === 'nonMonster',
                hasHpAc: monster.entityKind !== 'nonMonster' || Boolean(monster.hasHpAc),
                fixedInitiative: monster.fixedInitiative,
                monsterData: monster,
                monsterAbilities: monster.monsterAbilities
            });
            state.characters.push(character);
            if (character.hasMultipleTurns) {
                state.characters.push(normalizeCharacter({
                    ...clone(character),
                    id: `${character.id}_turn2`,
                    name: `${character.name} (Turn 2)`,
                    initiative: character.initiative === null ? null : character.initiative - 10,
                    hasMultipleTurns: false
                }));
            }
            if (monster.hasLairActions) state.characters.push(createAssociatedActionObject(monster, name, 'lair'));
            if (monster.hasMythicActions) state.characters.push(createAssociatedActionObject(monster, name, 'mythic'));
            added += 1;
        }
    });
    return added;
}

function createAssociatedActionObject(monster, parentName, kind) {
    const actionEntries = kind === 'lair' ? monster.lairActions : monster.mythicActions;
    const fixedInitiative = Number(kind === 'lair' ? monster.lairActionInitiative : monster.mythicActionInitiative) || 20;
    const cleanName = value => String(value || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
    const names = new Set((actionEntries || []).map(entry => cleanName(entry.name)));
    const tracked = (monster.monsterAbilities?.customFeatures || []).filter(feature => names.has(cleanName(feature.name)));
    const label = kind === 'lair' ? 'Lair' : 'Mythic';
    return normalizeCharacter({
        id: makeId('monster'), name: `${parentName} ${label} Actions`, type: 'monster', activeInCombat: true,
        maxHp: 0, currentHp: 0, ac: 0, maxReactions: 0, currentReactions: 0,
        initiative: fixedInitiative, fixedInitiative, initBonus: 0, isNonMonster: true, hasHpAc: false, associatedObjectKind: kind,
        monsterData: {
            name: `${parentName} ${label} Actions`, entityKind: 'nonMonster', hasHpAc: false, fixedInitiative, initBonus: 0,
            description: (actionEntries || []).map(item => `${item.name || ''}\n${item.description || ''}`).join('\n\n'), actions: actionEntries || []
        },
        monsterAbilities: { enabled: tracked.length > 0, customFeatures: tracked }
    });
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

    const uniqueIds = [...new Set(Array.isArray(ids) ? ids.map(String) : [])];
    const counterspellIds = [];
    const normalSpellIds = [];

    uniqueIds.forEach(id => {
        const spell = spellsById.get(id);
        if (!known.has(id) || !spell || spell.levelKey === 'cantrip') return;
        if (spell.isCounterspell) {
            counterspellIds.push(id);
        } else {
            normalSpellIds.push(id);
        }
    });

    let hasPreparedCounterspell = false;

    // Process counterspells first
    counterspellIds.forEach(id => {
        const spell = spellsById.get(id);
        if (hasPreparedCounterspell) {
            result.push(id);
            return;
        }

        if (isNormalSpellLevel(spell.levelKey)) {
            if (normalCount < character.spellbook.preparedNonEpicMax) {
                normalCount += 1;
                hasPreparedCounterspell = true;
                result.push(id);
            }
            return;
        }
        if (isEpicSpellLevel(spell.levelKey)) {
            if (epicCount < character.spellbook.preparedEpicMax) {
                epicCount += 1;
                hasPreparedCounterspell = true;
                result.push(id);
            }
            return;
        }
        hasPreparedCounterspell = true;
        result.push(id);
    });

    // Process normal spells next
    normalSpellIds.forEach(id => {
        const spell = spellsById.get(id);
        if (isNormalSpellLevel(spell.levelKey)) {
            if (normalCount < character.spellbook.preparedNonEpicMax) {
                normalCount += 1;
                result.push(id);
            }
            return;
        }
        if (isEpicSpellLevel(spell.levelKey)) {
            if (epicCount < character.spellbook.preparedEpicMax) {
                epicCount += 1;
                result.push(id);
            }
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
    if (character.casting?.type === 'warlock') {
        const retained = Object.fromEntries(Object.entries(character.spellSlots || {}).filter(([level]) => /^[6-9]$/.test(level)));
        Object.entries(epicSlotsForLevel(character.spellcasterLevel || 0)).forEach(([level, max]) => {
            if (max > 0) retained[level] = { max, used: clamp(character.spellSlots?.[level]?.used || 0, 0, max) };
        });
        character.spellSlots = retained;
        return;
    }
    const slotsArray = SPELL_SLOTS_TABLE[Math.min(20, character.spellcasterLevel || 0)] || [];
    const nextSlots = {};
    slotsArray.forEach((max, index) => {
        if (max > 0) {
            const level = String(index + 1);
            const used = character.spellSlots?.[level]?.used || 0;
            nextSlots[level] = { max, used: clamp(used, 0, max) };
        }
    });
    Object.entries(epicSlotsForLevel(character.spellcasterLevel || 0)).forEach(([level, max]) => {
        if (max <= 0) return;
        const used = character.spellSlots?.[level]?.used || 0;
        nextSlots[level] = { max, used: clamp(used, 0, max) };
    });
    character.spellSlots = nextSlots;
}

function epicSlotsForLevel(level) {
    const normalized = clamp(toNumber(level, 0), 0, 30);
    const key = Object.keys(EPIC_SLOTS_TABLE)
        .map(Number)
        .filter(item => item <= normalized)
        .sort((a, b) => b - a)[0];
    return key ? EPIC_SLOTS_TABLE[key] : {};
}

/**
 * After any action, sync shared fields (HP, effects, conditions, spell slots, custom features)
 * between a monster's primary and secondary turn entries so they stay consistent.
 */
function syncMultiTurnCharacters(state, changedId) {
    if (!changedId) return;
    const isPrimary = !changedId.endsWith('_turn2');
    const primaryId = isPrimary ? changedId : changedId.replace(/_turn2$/, '');
    const secondaryId = `${primaryId}_turn2`;
    const primary = state.characters.find(c => c.id === primaryId);
    const secondary = state.characters.find(c => c.id === secondaryId);
    if (!primary || !secondary) return;

    // Sync shared combat resources (not per-turn resources like reactions or recharge)
    const source = isPrimary ? primary : secondary;
    const target = isPrimary ? secondary : primary;

    target.currentHp = source.currentHp;
    target.maxHp = source.maxHp;
    target.tempHp = source.tempHp;
    target.ac = source.ac;
    target.effects = clone(source.effects);
    target.currentPower = source.currentPower;
    target.maxPower = source.maxPower;

    // Sync spell slots
    if (source.monsterAbilities?.spellcasting?.spellSlots) {
        if (!target.monsterAbilities) target.monsterAbilities = {};
        if (!target.monsterAbilities.spellcasting) target.monsterAbilities.spellcasting = {};
        target.monsterAbilities.spellcasting.spellSlots = clone(source.monsterAbilities.spellcasting.spellSlots);
    }
    if (source.monsterAbilities?.perDaySpells && target.monsterAbilities) {
        target.monsterAbilities.perDaySpells = clone(source.monsterAbilities.perDaySpells);
        if (target.monsterAbilities.spellcasting) {
            target.monsterAbilities.spellcasting.perDaySpells = clone(source.monsterAbilities.perDaySpells);
        }
    }

    // Sync custom features except per-turn ones (rechargeAttempted stays per-entry)
    if (source.monsterAbilities?.customFeatures && target.monsterAbilities?.customFeatures) {
        source.monsterAbilities.customFeatures.forEach((sf, idx) => {
            const tf = target.monsterAbilities.customFeatures[idx];
            if (!tf || sf.name !== tf.name) return;
            if (sf.trackerType === 'round') return; // per-turn, don't sync
            tf.used = sf.used;
        });
    }
}

function applyGameAction(state, action, client) {
    if (action.type === 'history.clear') {
        state.actionLog = [];
        state.redoStacks = {};
        return { state, entry: null };
    }
    const page = action.type === 'combat.aoe.apply' ? 'combat' : action.page || pageForAction(action.type);
    const before = snapshotPage(state, page);
    const label = applyActionMutation(state, action, client);
    // Sync multi-turn monster entries after any character or monster action
    const payload = action.payload || {};
    const changedId = payload.characterId || null;
    if (changedId && (action.type.startsWith('character.') || action.type.startsWith('monster.') || action.type.startsWith('effect.'))) {
        syncMultiTurnCharacters(state, changedId);
    }
    const after = snapshotPage(state, page);
    const visibility = action.type.startsWith('monster.') || action.type.startsWith('database.monster') || action.type === 'database.importAll' || action.type === 'character.deleteSavedPlayer' || (action.type.startsWith('toolbelt.') && action.type !== 'toolbelt.dice.add')
        ? 'dm'
        : 'all';
    const entry = addLogEntry(state, action, client, page, label, before, after, true, visibility);
    return { entry, state };
}

function undoPage(state, page, client) {
    pruneHistory(state);
    const entry = [...state.actionLog].reverse().find(item => item.page === page && item.reversible && !item.undone);
    if (!entry) throw new Error('Na teto strance neni co vratit.');
    if (entry.type === 'combat.aoe.apply' && client.role !== 'dm') throw new Error('AOE muze vratit pouze DM.');
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
        undefined,
        undefined,
        false,
        entry.visibility
    );
    return { target: entry, entry: undoEntry };
}

function redoPage(state, page, client) {
    pruneHistory(state);
    const stack = state.redoStacks[page] || [];
    const entryId = stack[stack.length - 1];
    const entry = state.actionLog.find(item => item.id === entryId);
    if (!entry || !entry.undone) throw new Error('Na teto strance neni co znovu provest.');
    if (entry.type === 'combat.aoe.apply' && client.role !== 'dm') throw new Error('AOE muze zopakovat pouze DM.');
    stack.pop();
    restorePage(state, page, entry.after);
    entry.undone = false;
    const redoEntry = addLogEntry(
        state,
        { type: 'history.redo' },
        client,
        page,
        `Redo: ${entry.label}`,
        undefined,
        undefined,
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
