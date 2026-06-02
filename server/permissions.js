const PLAYER_ALLOWED_TYPES = new Set([
    'character.adjustHp',
    'effect.add',
    'effect.remove',
    'effect.level.set',
    'inventory.currency.set',
    'inventory.item.add',
    'inventory.item.update',
    'inventory.item.quantity',
    'inventory.item.remove',
    'inventory.item.transfer',
    'inventory.magic.attune',
    'spell.slot.toggle',
    'spell.hitDie.toggle',
    'spell.feature.uses',
    'spell.feature.add',
    'spell.feature.update',
    'spell.feature.remove',
    'spell.rest.character',
    'spell.character.update',
    'database.magic.upsert',
    'database.potion.upsert',
    'database.condition.upsert',
    'character.activateInCombat',
    'character.deactivateFromCombat'
]);

function findCharacter(state, characterId) {
    return state.characters.find(character => character.id === characterId);
}

function actionCharacterIds(action) {
    const payload = action.payload || {};
    const ids = [];
    if (payload.characterId) ids.push(payload.characterId);
    if (payload.sourceCharacterId) ids.push(payload.sourceCharacterId);
    if (payload.targetCharacterId) ids.push(payload.targetCharacterId);
    return ids;
}

function canPlayerChangeAction(state, action) {
    if (!PLAYER_ALLOWED_TYPES.has(action.type)) {
        return { ok: false, reason: 'Player nemuze provest tuto akci.' };
    }

    if (action.type.startsWith('database.')) {
        return { ok: true };
    }

    const ids = actionCharacterIds(action);
    if (ids.length === 0) {
        return { ok: false, reason: 'Akce nema cilovou hracskou postavu.' };
    }

    for (const id of ids) {
        const character = findCharacter(state, id);
        if (!character) return { ok: false, reason: 'Postava neexistuje.' };
        if (character.type !== 'player') {
            return { ok: false, reason: 'Player muze menit pouze hracske postavy.' };
        }
    }

    return { ok: true };
}

function authorizeAction(state, action, client) {
    if (client.role === 'dm') return { ok: true };
    return canPlayerChangeAction(state, action);
}

function canUseHistory(page, client) {
    if (client.role === 'dm') return true;
    return page === 'combat' || page === 'spells' || page === 'inventory';
}

module.exports = {
    authorizeAction,
    canUseHistory
};
