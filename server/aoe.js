const { clone, clamp } = require('./utils');
const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

function prepareAoe(state, payload) {
    if (!Number.isFinite(payload.dc) || payload.dc < 1 || !Number.isSafeInteger(payload.damageTotal) || payload.damageTotal < 0 || !['half', 'none'].includes(payload.onSuccess)) throw new Error('Neplatne AOE damage / DC.');
    if (!Array.isArray(payload.targets) || payload.targets.length === 0 || !Array.isArray(payload.conditions)) throw new Error('AOE nema vybrane cile.');
    const conditionIds = new Set();
    const conditions = payload.conditions.map(selected => {
        const definition = state.conditionDatabase.find(item => item.id === selected.conditionId);
        if (!definition || conditionIds.has(definition.id)) throw new Error('Neplatna nebo duplicitni condition.');
        conditionIds.add(definition.id);
        const effect = { name: String(definition.name), level: null };
        if (selected.remainingRounds !== undefined && selected.remainingRounds !== null) {
            if (!Number.isInteger(selected.remainingRounds) || selected.remainingRounds < 1) throw new Error('Neplatne trvani condition.');
            effect.remainingRounds = selected.remainingRounds;
        }
        if (definition.hasLevels) {
            if (!Number.isInteger(selected.level) || selected.level < 1 || selected.level > (Number(definition.maxLevel) || 20)) throw new Error('Neplatny condition level.');
            effect.level = selected.level;
        }
        if (definition.statAdjustmentType) {
            if (!ABILITIES.includes(selected.ability)) throw new Error('Condition nema vybranou ability.');
            effect.ability = selected.ability;
            effect.value = effect.level;
        }
        if (definition.hasDice || definition.defaultDiceCount) {
            if (!Number.isInteger(selected.diceCount) || selected.diceCount < 1 || !Number.isInteger(selected.diceSides) || selected.diceSides < 2) throw new Error('Neplatne condition dice.');
            effect.diceCount = selected.diceCount;
            effect.diceSides = selected.diceSides;
            effect.damageType = String(selected.damageType || definition.defaultDamageType || '');
        }
        return { definition, effect };
    });
    const ids = new Set();
    return payload.targets.map(target => {
        const character = state.characters.find(item => item.id === target.characterId);
        const primaryId = String(target.characterId).replace(/_turn2$/, '');
        if (!character || character.activeInCombat === false || character.isNonMonster || character.monsterData?.entityKind === 'nonMonster' || ids.has(primaryId)) throw new Error('Neplatny nebo duplicitni AOE cil.');
        if (!Number.isFinite(target.saveTotal) || (target.natural !== null && (!Number.isInteger(target.natural) || target.natural < 1 || target.natural > 20)) || typeof target.halfDamage !== 'boolean') throw new Error('Chybi platny save vysledek.');
        ids.add(primaryId);
        const success = target.natural === 20 || (target.natural !== 1 && target.saveTotal >= payload.dc);
        let damage = success ? payload.onSuccess === 'half' ? Math.floor(payload.damageTotal / 2) : 0 : payload.damageTotal;
        if (target.halfDamage) damage = Math.floor(damage / 2);
        const effects = clone(character.effects || []);
        if (!success) conditions.forEach(({ definition, effect }) => {
            const index = effects.findIndex(item => {
                const current = typeof item === 'string' ? { name: item } : item;
                return current.name.toLowerCase() === effect.name.toLowerCase() && (!definition.statAdjustmentType || current.ability === effect.ability);
            });
            const existing = index < 0 ? null : typeof effects[index] === 'string' ? { name: effects[index], level: 1 } : effects[index];
            const next = { ...(existing || {}), ...effect };
            if (definition.hasLevels) {
                next.level = clamp((existing ? Number(existing.level) || 1 : 0) + effect.level, 1, Number(definition.maxLevel) || 20);
                if (definition.statAdjustmentType) next.value = next.level;
            }
            if (index < 0) effects.push(next);
            else effects[index] = next;
        });
        return { character, damage, effects };
    });
}

module.exports = { prepareAoe };
