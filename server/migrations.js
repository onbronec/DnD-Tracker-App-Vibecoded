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
        spellComponents: Array.isArray(source.spellComponents) ? source.spellComponents.map(normalizeSpellComponent) : [],
        potions: Array.isArray(source.potions) ? source.potions : [],
        scrolls: Array.isArray(source.scrolls) ? source.scrolls : [],
        generalItems: Array.isArray(source.generalItems) ? source.generalItems : [],
        magicItems: Array.isArray(source.magicItems) ? source.magicItems : []
    };
}

function normalizeSpellComponent(component) {
    const source = typeof component === 'string' ? { name: component } : (component || {});
    const trackingType = String(source.trackingType || (source.goldValue !== undefined ? 'value' : 'count')).toLowerCase() === 'value'
        ? 'value'
        : 'count';
    return {
        ...clone(source),
        id: String(source.id || makeId('component')),
        name: String(source.name || 'Spell Component'),
        trackingType,
        count: trackingType === 'count' ? Math.max(0, Number(source.count ?? source.quantity ?? 1) || 0) : undefined,
        goldValue: trackingType === 'value' ? Math.max(0, Number(source.goldValue ?? source.value ?? 0) || 0) : undefined,
        description: String(source.description || source.notes || '')
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

function normalizeCharacterAbility(ability) {
    const source = ability || {};
    return {
        id: String(source.id || makeId('ability')),
        name: String(source.name || source.title || 'Ability').trim() || 'Ability',
        description: String(source.description || source.text || source.notes || ''),
        source: String(source.source || '')
    };
}

function normalizeSheetBonus(bonus) {
    const source = bonus || {};
    const targetTypes = ['save', 'skill', 'abilityCheck', 'allSaves', 'allSkills', 'allAbilityChecks', 'ac', 'initiative', 'spellAttack', 'spellDc'];
    const valueMode = source.valueMode === 'halfProficiency' ? 'halfProficiency' : 'fixed';
    return {
        id: String(source.id || makeId('sheet_bonus')),
        targetType: targetTypes.includes(source.targetType) ? source.targetType : 'skill',
        targetKey: source.targetKey ? String(source.targetKey) : '',
        value: valueMode === 'halfProficiency' ? 0 : Number(source.value) || 0,
        valueMode,
        source: String(source.source || ''),
        note: String(source.note || ''),
        condition: source.condition === 'ifNotProficientOrExpert' ? 'ifNotProficientOrExpert' : 'always'
    };
}

function normalizeSheetGeneral(general) {
    const source = general || {};
    const speeds = source.speeds && typeof source.speeds === 'object' ? source.speeds : {};
    return {
        spellcastingAbility: normalizeAbilityKey(source.spellcastingAbility) || 'charisma',
        speeds: {
            walk: Math.max(0, Number(speeds.walk) || 30),
            fly: Math.max(0, Number(speeds.fly) || 0),
            hover: Math.max(0, Number(speeds.hover) || 0),
            swim: Math.max(0, Number(speeds.swim) || 0),
            climb: Math.max(0, Number(speeds.climb) || 0),
            burrow: Math.max(0, Number(speeds.burrow ?? speeds.dig) || 0)
        }
    };
}

function normalizeSkillAbilityOverrides(overrides) {
    const source = overrides && typeof overrides === 'object' ? overrides : {};
    const result = {};
    Object.entries(source).forEach(([skill, ability]) => {
        const normalized = normalizeAbilityKey(ability);
        if (normalized && SKILL_KEYS.includes(skill)) result[skill] = normalized;
    });
    return result;
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
        maxReactions: Math.max(0, Number(char.maxReactions) || 1),
        currentReactions: Math.max(0, Math.min(Math.max(0, Number(char.maxReactions) || 1), Number.isFinite(Number(char.currentReactions)) ? Number(char.currentReactions) : (Number(char.maxReactions) || 1))),
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
        monsterData: char.monsterData ? normalizeMonsterDbItem(char.monsterData) : undefined,
        monsterAbilities: type === 'monster' ? normalizeMonsterAbilities(char.monsterAbilities, char) : (char.monsterAbilities ? clone(char.monsterAbilities) : undefined),
        spellcasterLevel: Number(char.spellcasterLevel) || 0,
        spellSlots: char.spellSlots && typeof char.spellSlots === 'object' ? clone(char.spellSlots) : {},
        customFeatures: Array.isArray(char.customFeatures) ? clone(char.customFeatures) : [],
        characterAbilities: Array.isArray(char.characterAbilities) ? char.characterAbilities.map(normalizeCharacterAbility) : [],
        characterActions: Array.isArray(char.characterActions) ? char.characterActions.map(normalizeCharacterAbility) : [],
        hitDice: char.hitDice && typeof char.hitDice === 'object'
            ? { max: Number(char.hitDice.max) || 0, current: Number(char.hitDice.current) || 0 }
            : { max: 0, current: 0 },
        proficiencyBonus: Math.max(0, Math.min(10, Math.round(Number(char.proficiencyBonus) || 2))),
        abilityScores: normalizeAbilityScores(char.abilityScores),
        savingThrowProficiencies: normalizeKeyList(char.savingThrowProficiencies, ABILITY_KEYS),
        skillProficiencies: normalizeKeyList(char.skillProficiencies, SKILL_KEYS),
        skillExpertise: normalizeKeyList(char.skillExpertise, SKILL_KEYS),
        skillAbilityOverrides: normalizeSkillAbilityOverrides(char.skillAbilityOverrides),
        sheetBonuses: Array.isArray(char.sheetBonuses) ? char.sheetBonuses.map(normalizeSheetBonus) : [],
        sheetGeneral: normalizeSheetGeneral(char.sheetGeneral),
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
    const normalizedEpic = lower.match(/^(?:special-)*epic([1-3])$/);
    if (normalizedEpic) return { key: `epic${normalizedEpic[1]}`, label: `Epic ${normalizedEpic[1]}` };
    const epicLabel = lower.match(/^epic\s*([1-3])$/);
    if (epicLabel) return { key: `epic${epicLabel[1]}`, label: `Epic ${epicLabel[1]}` };
    const ordinal = lower.match(/^(\d+)(st|nd|rd|th)$/);
    if (ordinal) return { key: ordinal[1], label: `Level ${ordinal[1]}` };
    const epic = lower.match(/^tier\s+(\d+)\s+epic$/);
    if (epic) return { key: `epic${epic[1]}`, label: `Epic ${epic[1]}` };
    if (/^\d+$/.test(lower)) return { key: lower, label: `Level ${lower}` };
    return { key: `special-${slugify(raw)}`, label: raw };
}

function normalizeMonsterTextEntries(entries) {
    if (!Array.isArray(entries)) return [];
    return entries.map((entry, index) => {
        if (typeof entry === 'string') {
            const name = entry.match(/^\*\*([^*.]+).*?\.\*\*/)?.[1] || entry.split('\n')[0].replace(/\*\*/g, '').slice(0, 80) || `Entry ${index + 1}`;
            return { id: makeId('monster_text'), name: name.trim(), description: entry };
        }
        return {
            id: String(entry.id || makeId('monster_text')),
            name: String(entry.name || entry.title || `Entry ${index + 1}`),
            description: String(entry.description || entry.text || '')
        };
    });
}

function normalizeMonsterStats(stats) {
    const source = stats || {};
    const legacy = { str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma' };
    return ABILITY_KEYS.reduce((result, key) => {
        const legacyKey = Object.keys(legacy).find(short => legacy[short] === key);
        result[key] = Math.max(1, Math.min(30, Math.round(Number(source[key] ?? source[legacyKey]) || 10)));
        return result;
    }, {});
}

function normalizeMonsterAbilities(abilities, source = {}) {
    const current = abilities || {};
    const spellcasting = current.spellcasting || {};
    const spellSlots = current.spellSlots || spellcasting.spellSlots || {};
    const perDaySpells = current.perDaySpells || spellcasting.perDaySpells || [];
    const power = current.power || {};
    const maxPower = Number(source.maxPower ?? power.max) || 0;
    return {
        ...clone(current),
        enabled: Boolean(current.enabled || maxPower || current.legendaryActions?.enabled || current.epicActions?.enabled || Object.keys(spellSlots).length || perDaySpells.length || current.customFeatures?.length),
        power: {
            enabled: Boolean(power.enabled || maxPower),
            name: String(power.name || source.powerName || 'Power'),
            max: maxPower,
            current: Math.max(0, Math.min(maxPower, Number(power.current ?? source.currentPower ?? maxPower) || 0))
        },
        spellcasting: {
            enabled: Boolean(spellcasting.enabled || current.spellcastingType || Object.keys(spellSlots).length || perDaySpells.length),
            spellcastingType: String(spellcasting.spellcastingType || current.spellcastingType || 'none'),
            spellcastingLevel: Number(spellcasting.spellcastingLevel || current.spellcastingLevel) || 0,
            spellSlots: normalizeMonsterSpellSlots(spellSlots),
            atWillSpells: Array.isArray(spellcasting.atWillSpells) ? spellcasting.atWillSpells.map(String) : [],
            perDaySpells: normalizeMonsterPerDaySpells(perDaySpells)
        },
        spellSlots: normalizeMonsterSpellSlots(spellSlots),
        perDaySpells: normalizeMonsterPerDaySpells(perDaySpells),
        customFeatures: Array.isArray(current.customFeatures) ? clone(current.customFeatures) : [],
        legendaryActions: {
            enabled: Boolean(current.legendaryActions?.enabled),
            max: Math.max(0, Number(current.legendaryActions?.max) || 0),
            used: Math.max(0, Number(current.legendaryActions?.used) || 0)
        },
        epicActions: {
            enabled: Boolean(current.epicActions?.enabled),
            actions: Array.isArray(current.epicActions?.actions)
                ? current.epicActions.actions.map(action => ({
                    id: String(action.id || makeId('epic')),
                    name: String(action.name || 'Epic Action'),
                    description: String(action.description || ''),
                    maxUses: Math.max(1, Number(action.maxUses) || 1),
                    used: Math.max(0, Number(action.used) || 0)
                }))
                : []
        }
    };
}

function normalizeMonsterSpellSlots(slots) {
    const result = {};
    Object.entries(slots || {}).forEach(([level, value]) => {
        const slot = value || {};
        result[String(level)] = {
            max: Math.max(0, Number(slot.max) || 0),
            used: Math.max(0, Number(slot.used) || 0),
            atWill: Boolean(slot.atWill)
        };
    });
    return result;
}

function normalizeMonsterPerDaySpells(spells) {
    return (Array.isArray(spells) ? spells : []).map(spell => ({
        name: String(spell.name || spell.spellName || 'Spell'),
        maxUses: Math.max(0, Number(spell.maxUses) || 0),
        used: Math.max(0, Number(spell.used) || 0)
    }));
}

function slugify(value) {
    return String(value || 'special').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'special';
}

function normalizeMonsterDbItem(monster) {
    const source = monster || {};
    const stats = normalizeMonsterStats(source.stats || source.abilityScores);
    const maxPower = Number(source.maxPower ?? source.monsterAbilities?.power?.max) || 0;
    const powerName = source.powerName || source.monsterAbilities?.power?.name || 'Power';
    return {
        ...clone(source),
        id: String(source.id || makeId('monster_db')),
        name: String(source.name || 'Monster'),
        hp: Number(source.hp || source.maxHp) || 1,
        maxHp: Number(source.maxHp || source.hp) || 1,
        ac: Number(source.ac) || 10,
        maxReactions: Math.max(0, Number(source.maxReactions) || 1),
        initBonus: Number.isFinite(Number(source.initBonus)) ? Number(source.initBonus) : Math.floor(((stats.dexterity || 10) - 10) / 2),
        speed: String(source.speed || ''),
        stats,
        saves: String(source.saves || source.savingThrows || ''),
        skills: String(source.skills || ''),
        senses: String(source.senses || ''),
        languages: String(source.languages || ''),
        challenge: String(source.challenge || source.cr || ''),
        proficiency: String(source.proficiency || ''),
        type: String(source.type || ''),
        size: String(source.size || ''),
        maxPower,
        powerName,
        description: source.description || source.statblock || '',
        defensiveFeatures: normalizeMonsterTextEntries(source.defensiveFeatures),
        features: normalizeMonsterTextEntries(source.features || source.traits),
        actions: normalizeMonsterTextEntries(source.actions),
        bonusActions: normalizeMonsterTextEntries(source.bonusActions),
        reactions: normalizeMonsterTextEntries(source.reactions),
        legendaryActionEntries: normalizeMonsterTextEntries(source.legendaryActionEntries || source.legendaryActions),
        mythicActions: normalizeMonsterTextEntries(source.mythicActions),
        lairActions: normalizeMonsterTextEntries(source.lairActions),
        hasLairActions: Boolean(source.hasLairActions || (source.lairActions || []).length),
        hasMythicActions: Boolean(source.hasMythicActions || (source.mythicActions || []).length),
        monsterAbilities: normalizeMonsterAbilities(source.monsterAbilities, { maxPower, powerName, currentPower: source.currentPower }),
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
    return ensureUniqueDatabaseIds([...byName.values()], 'condition');
}

function ensureUniqueDatabaseIds(items, prefix) {
    const used = new Set();
    return (items || []).map((item, index) => {
        const copy = { ...item };
        let id = String(copy.id || '').trim();
        if (!id || used.has(id)) {
            const base = `${prefix}_${slugify(copy.name || index + 1)}`;
            let suffix = 2;
            id = base;
            while (used.has(id)) {
                id = `${base}_${suffix}`;
                suffix += 1;
            }
        }
        used.add(id);
        return { ...copy, id };
    });
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
    normalizeCharacterAbility,
    seedConditions,
    migrateAutosave
};
