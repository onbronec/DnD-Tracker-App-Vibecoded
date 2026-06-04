const { createEmptyInventory, createInitialState, PAGE_SCOPES } = require('./defaults');
const { DEFAULT_CONDITIONS } = require('./conditionPresets');
const { clone, makeId } = require('./utils');

function normalizeEffect(effect) {
    if (!effect) return null;
    if (typeof effect === 'string') return { name: effect, level: null };
    const normalized = {
        name: String(effect.name || ''),
        level: effect.level ?? null
    };
    const ability = normalizeAbilityKey(effect.ability);
    if (ability) normalized.ability = ability;
    if (effect.value !== undefined && effect.value !== null) normalized.value = Number(effect.value) || 0;
    if (effect.diceCount !== undefined && effect.diceCount !== null) normalized.diceCount = Math.max(0, Number(effect.diceCount) || 0);
    if (effect.diceSides !== undefined && effect.diceSides !== null) normalized.diceSides = Math.max(0, Number(effect.diceSides) || 0);
    if (effect.damageType !== undefined && effect.damageType !== null) normalized.damageType = String(effect.damageType);
    return normalized;
}

const ABILITY_KEYS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const SKILL_KEYS = [
    'acrobatics', 'animalHandling', 'arcana', 'athletics', 'deception', 'history',
    'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception',
    'performance', 'persuasion', 'religion', 'sleightOfHand', 'stealth', 'survival'
];

function normalizeAbilityKey(value) {
    const raw = String(value || '').trim();
    return ABILITY_KEYS.includes(raw) ? raw : null;
}

function normalizeAbilityScores(scores) {
    const source = scores || {};
    return ABILITY_KEYS.reduce((result, key) => {
        result[key] = Math.max(1, Math.min(30, Math.round(Number(source[key]) || 10)));
        return result;
    }, {});
}

function normalizeKeyList(values, allowed) {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.map(value => String(value)).filter(value => allowed.includes(value)))];
}

function normalizeInventory(inventory) {
    const fallback = createEmptyInventory();
    const source = inventory || {};
    return {
        currency: { ...fallback.currency, ...(source.currency || {}) },
        spellComponents: Array.isArray(source.spellComponents) ? source.spellComponents : [],
        potions: Array.isArray(source.potions) ? source.potions : [],
        scrolls: Array.isArray(source.scrolls) ? source.scrolls : [],
        generalItems: Array.isArray(source.generalItems) ? source.generalItems : [],
        magicItems: Array.isArray(source.magicItems) ? source.magicItems : []
    };
}

function normalizeSpellbook(spellbook) {
    const source = spellbook || {};
    return {
        knownSpellIds: normalizeStringList(Array.isArray(source.knownSpellIds) ? source.knownSpellIds : source.knownSpells),
        preparedSpellIds: normalizeStringList(Array.isArray(source.preparedSpellIds) ? source.preparedSpellIds : source.preparedSpells),
        preparesSpells: Boolean(source.preparesSpells),
        preparedNonEpicMax: Math.max(0, Number(source.preparedNonEpicMax) || 0),
        preparedEpicMax: Math.max(0, Number(source.preparedEpicMax) || 0)
    };
}

function normalizeStringList(values) {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.map(value => String(value)).filter(Boolean))];
}

function normalizeTags(tags) {
    if (Array.isArray(tags)) return tags.map(tag => String(tag)).filter(Boolean);
    if (typeof tags === 'string') return tags.split(',').map(tag => tag.trim()).filter(Boolean);
    return [];
}

function normalizeCharacter(char) {
    const type = char.type === 'monster' ? 'monster' : 'player';
    return {
        id: String(char.id || makeId(type)),
        name: char.name || (type === 'monster' ? 'Monstrum' : 'Postava'),
        type,
        maxHp: Number(char.maxHp) || 1,
        currentHp: Number.isFinite(Number(char.currentHp)) ? Number(char.currentHp) : (Number(char.maxHp) || 1),
        tempHp: Number(char.tempHp) || 0,
        ac: Number(char.ac) || 10,
        initBonus: Number(char.initBonus) || 0,
        initiative: char.initiative === null || char.initiative === undefined || char.initiative === ''
            ? null
            : Number(char.initiative),
        maxPower: Number(char.maxPower) || 0,
        currentPower: Number.isFinite(Number(char.currentPower)) ? Number(char.currentPower) : (Number(char.maxPower) || 0),
        powerName: char.powerName || 'Power',
        effects: Array.isArray(char.effects) ? char.effects.map(normalizeEffect).filter(Boolean) : [],
        activeInCombat: type === 'monster'
            ? true
            : (char.activeInCombat !== undefined ? Boolean(char.activeInCombat) : true),
        revealedToPlayers: char.revealedToPlayers !== undefined ? Boolean(char.revealedToPlayers) : type === 'player',
        groupId: char.groupId || null,
        groupName: char.groupName || null,
        monsterData: char.monsterData ? clone(char.monsterData) : undefined,
        monsterAbilities: char.monsterAbilities ? clone(char.monsterAbilities) : undefined,
        spellcasterLevel: Number(char.spellcasterLevel) || 0,
        spellSlots: char.spellSlots && typeof char.spellSlots === 'object' ? clone(char.spellSlots) : {},
        customFeatures: Array.isArray(char.customFeatures) ? clone(char.customFeatures) : [],
        hitDice: char.hitDice && typeof char.hitDice === 'object'
            ? { max: Number(char.hitDice.max) || 0, current: Number(char.hitDice.current) || 0 }
            : { max: 0, current: 0 },
        proficiencyBonus: Math.max(0, Math.min(10, Math.round(Number(char.proficiencyBonus) || 2))),
        abilityScores: normalizeAbilityScores(char.abilityScores),
        savingThrowProficiencies: normalizeKeyList(char.savingThrowProficiencies, ABILITY_KEYS),
        skillProficiencies: normalizeKeyList(char.skillProficiencies, SKILL_KEYS),
        skillExpertise: normalizeKeyList(char.skillExpertise, SKILL_KEYS),
        inventory: normalizeInventory(char.inventory),
        spellbook: normalizeSpellbook(char.spellbook)
    };
}

function normalizeSpell(spell) {
    const source = spell || {};
    const level = normalizeSpellLevel(source.levelKey || source.levelLabel || source.level || source.Level);
    const name = String(source.name || source.Name || 'Spell').trim() || 'Spell';
    return {
        ...clone(source),
        id: String(source.id || makeId('spell_db')),
        name,
        levelKey: level.key,
        levelLabel: level.label,
        classes: normalizeTags(source.classes || source.Classes),
        school: String(source.school || source.School || ''),
        castingTime: String(source.castingTime || source['Casting Time'] || ''),
        range: String(source.range || source.Range || ''),
        components: String(source.components || source.Components || ''),
        duration: String(source.duration || source.Duration || ''),
        ritual: Boolean(source.ritual || source.asRitual || source['As a Ritual']),
        source: String(source.source || source.Source || ''),
        page: String(source.page || source.Page || ''),
        description: String(source.description || source.text || source.Text || ''),
        atHigherLevels: String(source.atHigherLevels || source['At Higher Levels'] || ''),
        tags: normalizeTags(source.tags),
        importKey: source.importKey ? String(source.importKey) : ''
    };
}

function normalizeSpellLevel(value) {
    const raw = String(value || '').trim();
    const lower = raw.toLowerCase();
    if (!raw) return { key: 'special-unknown', label: 'Special' };
    if (lower === 'cantrip') return { key: 'cantrip', label: 'Cantrip' };
    const ordinal = lower.match(/^(\d+)(st|nd|rd|th)$/);
    if (ordinal) return { key: ordinal[1], label: `Level ${ordinal[1]}` };
    const epic = lower.match(/^tier\s+(\d+)\s+epic$/);
    if (epic) return { key: `epic${epic[1]}`, label: `Epic ${epic[1]}` };
    if (/^\d+$/.test(lower)) return { key: lower, label: `Level ${lower}` };
    return { key: `special-${slugify(raw)}`, label: raw };
}

function slugify(value) {
    return String(value || 'special').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'special';
}

function normalizeMonsterDbItem(monster) {
    const source = monster || {};
    return {
        ...clone(source),
        id: String(source.id || makeId('monster_db')),
        name: String(source.name || 'Monster'),
        hp: Number(source.hp || source.maxHp) || 1,
        ac: Number(source.ac) || 10,
        initBonus: Number(source.initBonus) || 0,
        maxPower: Number(source.maxPower) || 0,
        powerName: source.powerName || 'Power',
        description: source.description || source.statblock || '',
        tags: normalizeTags(source.tags),
        source: source.source || ''
    };
}

function normalizeMagicItem(item) {
    const source = item || {};
    return {
        ...clone(source),
        id: String(source.id || makeId('magic_db')),
        name: String(source.name || source.spellName || 'Magic Item'),
        type: 'magic',
        itemType: source.itemType || source.subtype || 'Wondrous item',
        rarity: source.rarity || '',
        requiresAttunement: Boolean(source.requiresAttunement || source.attunement || source.attuned),
        description: source.description || source.effect || '',
        tags: normalizeTags(source.tags),
        source: source.source || ''
    };
}

function normalizePotion(item) {
    const source = item || {};
    return {
        ...clone(source),
        id: String(source.id || makeId('potion_db')),
        name: String(source.name || 'Potion'),
        type: 'potion',
        rarity: source.rarity || '',
        effect: source.effect || source.description || '',
        description: source.description || source.effect || '',
        tags: normalizeTags(source.tags),
        source: source.source || ''
    };
}

function normalizeCondition(condition) {
    const source = condition || {};
    return {
        ...clone(source),
        id: String(source.id || makeId('condition_db')),
        name: String(source.name || 'Condition'),
        kind: ['buff', 'debuff', 'neutral'].includes(source.kind || source.type) ? (source.kind || source.type) : 'neutral',
        description: source.description || '',
        hasLevels: Boolean(source.hasLevels),
        maxLevel: Number(source.maxLevel) || (source.hasLevels ? 6 : 0),
        hasDice: Boolean(source.hasDice || source.defaultDiceCount || source.defaultDiceSides || source.diceCount || source.diceSides || source.defaultDamageType || source.damageType),
        defaultDiceCount: Number(source.defaultDiceCount || source.diceCount) || 0,
        defaultDiceSides: Number(source.defaultDiceSides || source.diceSides) || 0,
        defaultDamageType: String(source.defaultDamageType || source.damageType || ''),
        tags: normalizeTags(source.tags),
        source: source.source || ''
    };
}

function seedConditions(existing) {
    const byName = new Map();
    DEFAULT_CONDITIONS.forEach((condition, index) => {
        byName.set(condition.name.toLowerCase(), normalizeCondition({
            ...condition,
            id: `condition_${index + 1}`,
            tags: condition.tags || []
        }));
    });
    (existing || []).forEach(condition => {
        const normalized = normalizeCondition(condition);
        byName.set(normalized.name.toLowerCase(), normalized);
    });
    return [...byName.values()];
}

function splitLegacyItems(items) {
    const magic = [];
    const potions = [];
    (items || []).forEach(item => {
        const type = String(item?.type || item?.itemType || '').toLowerCase();
        if (type.includes('potion')) potions.push(normalizePotion(item));
        else if (type.includes('magic') || item?.rarity || item?.requiresAttunement || item?.attunement) magic.push(normalizeMagicItem(item));
    });
    return { magic, potions };
}

function mergeByName(existing, discovered) {
    const byName = new Map();
    const result = [];
    (existing || []).forEach(item => {
        const key = String(item.name || '').trim().toLowerCase();
        if (key) byName.set(key, true);
        result.push(item);
    });
    (discovered || []).forEach(item => {
        const key = String(item.name || '').trim().toLowerCase();
        if (!key || byName.has(key)) return;
        byName.set(key, true);
        result.push(item);
    });
    return result;
}

function inventoryDatabaseEntries(characters) {
    const magic = [];
    const potions = [];
    (characters || []).forEach(character => {
        const inventory = normalizeInventory(character.inventory);
        inventory.magicItems.forEach(item => {
            if (!item) return;
            const source = typeof item === 'string' ? { name: item } : item;
            if (source.name) magic.push(normalizeMagicItem({ ...source, source: source.source || `Inventory: ${character.name}` }));
        });
        inventory.potions.forEach(item => {
            if (!item) return;
            const source = typeof item === 'string' ? { name: item } : item;
            if (source.name) potions.push(normalizePotion({ ...source, source: source.source || `Inventory: ${character.name}` }));
        });
    });
    return { magic, potions };
}

function normalizeRedoStacks(redoStacks) {
    const result = {};
    PAGE_SCOPES.forEach(page => {
        result[page] = Array.isArray(redoStacks?.[page]) ? redoStacks[page] : [];
    });
    return result;
}

function normalizeToolbelt(toolbelt) {
    const source = toolbelt || {};
    const calendar = source.calendar || {};
    const calendarYear = Number(calendar.year) || 502;
    return {
        diceRolls: normalizeDiceRolls(source.diceRolls),
        improvNames: Array.isArray(source.improvNames) ? source.improvNames.slice(0, 5) : [],
        calendar: {
            weekday: String(calendar.weekday || 'Tuesday'),
            day: Number(calendar.day) || 23,
            month: String(calendar.month || 'December'),
            year: calendarYear === 500 ? 502 : calendarYear,
            records: Array.isArray(calendar.records) ? calendar.records : []
        },
        notes: Array.isArray(source.notes) ? source.notes : []
    };
}

function normalizeDiceRolls(diceRolls) {
    if (!diceRolls || typeof diceRolls !== 'object') return {};
    return Object.fromEntries(Object.entries(diceRolls).map(([key, rolls]) => [
        key,
        Array.isArray(rolls) ? rolls.slice(0, 5) : []
    ]));
}

function migrateAutosave(rawData) {
    const state = createInitialState();
    const data = rawData || {};

    state.characters = Array.isArray(data.characters)
        ? data.characters.map(normalizeCharacter)
        : [];

    state.combatState = {
        ...state.combatState,
        ...(data.combatState || {})
    };
    state.combatState.playedThisRound = Array.isArray(state.combatState.playedThisRound)
        ? state.combatState.playedThisRound
        : [];

    state.monsterDatabase = Array.isArray(data.monsterDatabase)
        ? data.monsterDatabase.map(normalizeMonsterDbItem)
        : Array.isArray(data.monsters)
            ? data.monsters.map(normalizeMonsterDbItem)
            : [];

    const legacyItems = Array.isArray(data.itemDatabase) ? data.itemDatabase : [];
    const splitItems = splitLegacyItems(legacyItems);
    state.magicItemDatabase = Array.isArray(data.magicItemDatabase)
        ? data.magicItemDatabase.map(normalizeMagicItem)
        : splitItems.magic;
    state.potionDatabase = Array.isArray(data.potionDatabase)
        ? data.potionDatabase.map(normalizePotion)
        : splitItems.potions;
    const inventoryEntries = inventoryDatabaseEntries(state.characters);
    state.magicItemDatabase = mergeByName(state.magicItemDatabase, inventoryEntries.magic);
    state.potionDatabase = mergeByName(state.potionDatabase, inventoryEntries.potions);
    state.conditionDatabase = seedConditions(data.conditionDatabase);
    state.spellDatabase = Array.isArray(data.spellDatabase)
        ? data.spellDatabase.map(normalizeSpell)
        : [];
    state.itemDatabase = legacyItems;

    state.actionLog = Array.isArray(data.actionLog) ? data.actionLog : [];
    state.redoStacks = normalizeRedoStacks(data.redoStacks);
    state.nextSequence = Number(data.nextSequence) || (state.actionLog.length + 1);
    state.toolbelt = normalizeToolbelt(data.toolbelt);

    return state;
}

module.exports = {
    normalizeCharacter,
    normalizeInventory,
    normalizeMonsterDbItem,
    normalizeMagicItem,
    normalizePotion,
    normalizeCondition,
    normalizeSpell,
    normalizeSpellbook,
    seedConditions,
    migrateAutosave
};
