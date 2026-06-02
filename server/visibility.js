const { clone } = require('./utils');

function filterCharacterForPlayer(character) {
    if (character.type === 'player') return clone(character);
    if (!character.revealedToPlayers) return null;

    const visible = clone(character);
    delete visible.monsterData;
    delete visible.monsterAbilities;
    visible.currentPower = undefined;
    visible.maxPower = undefined;
    return visible;
}

function filterStateForClient(state, role) {
    if (role === 'dm') return clone(state);

    return {
        schemaVersion: state.schemaVersion,
        characters: state.characters.map(filterCharacterForPlayer).filter(Boolean),
        combatState: clone(state.combatState),
        monsterDatabase: [],
        magicItemDatabase: clone(state.magicItemDatabase || []),
        potionDatabase: clone(state.potionDatabase || []),
        conditionDatabase: clone(state.conditionDatabase || []),
        itemDatabase: [],
        actionLog: filterHistoryForPlayer(state.actionLog),
        redoStacks: {},
        nextSequence: state.nextSequence
    };
}

function filterHistoryForPlayer(actionLog) {
    return actionLog
        .filter(entry => entry.visibility !== 'dm')
        .map(entry => {
            const safe = { ...entry };
            delete safe.before;
            delete safe.after;
            return safe;
        });
}

module.exports = {
    filterStateForClient,
    filterHistoryForPlayer
};
