const { createEmptyInventory, createInitialState, PAGE_SCOPES } = require('./defaults');
const { DEFAULT_CONDITIONS } = require('./conditionPresets');
const { clone, makeId } = require('./utils');

function normalizeEffect(effect) {
    if (!effect) return null;
    if (typeof effect === 'string') return { name: effect, level: null };
    return {
        name: String(effect.name || ''),
        level: effect.level ?? null
    };
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
        inventory: normalizeInventory(char.inventory)
    };
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
    state.itemDatabase = legacyItems;

    state.actionLog = Array.isArray(data.actionLog) ? data.actionLog : [];
    state.redoStacks = normalizeRedoStacks(data.redoStacks);
    state.nextSequence = Number(data.nextSequence) || (state.actionLog.length + 1);

    return state;
}

module.exports = {
    normalizeCharacter,
    normalizeInventory,
    normalizeMonsterDbItem,
    normalizeMagicItem,
    normalizePotion,
    normalizeCondition,
    seedConditions,
    migrateAutosave
};
