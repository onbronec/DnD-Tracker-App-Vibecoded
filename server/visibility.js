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
    if (role === 'dm') {
        return {
            schemaVersion: state.schemaVersion,
            characters: clone(state.characters || []),
            combatState: clone(state.combatState),
            monsterDatabase: clone(state.monsterDatabase || []),
            magicItemDatabase: clone(state.magicItemDatabase || []),
            potionDatabase: clone(state.potionDatabase || []),
            conditionDatabase: clone(state.conditionDatabase || []),
            spellDatabase: clone(state.spellDatabase || []),
            itemDatabase: clone(state.itemDatabase || []),
            toolbelt: clone(state.toolbelt || {}),
            actionLog: stripHistorySnapshots(state.actionLog),
            redoStacks: clone(state.redoStacks || {}),
            nextSequence: state.nextSequence
        };
    }

    return {
        schemaVersion: state.schemaVersion,
        characters: state.characters.map(filterCharacterForPlayer).filter(Boolean),
        combatState: clone(state.combatState),
        monsterDatabase: [],
        magicItemDatabase: clone(state.magicItemDatabase || []),
        potionDatabase: clone(state.potionDatabase || []),
        conditionDatabase: clone(state.conditionDatabase || []),
        spellDatabase: clone(state.spellDatabase || []),
        itemDatabase: [],
        toolbelt: {
            diceRolls: clone(state.toolbelt?.diceRolls || {}),
            improvNames: [],
            calendar: {
                weekday: '',
                day: 0,
                month: '',
                year: 0,
                records: []
            },
            notes: []
        },
        actionLog: filterHistoryForPlayer(state.actionLog),
        redoStacks: {},
        nextSequence: state.nextSequence
    };
}

function filterHistoryForPlayer(actionLog) {
    return actionLog
        .filter(entry => entry.visibility !== 'dm')
        .map(stripHistoryEntrySnapshot);
}

function stripHistorySnapshots(actionLog) {
    return (actionLog || []).map(stripHistoryEntrySnapshot);
}

function stripHistoryEntrySnapshot(entry) {
    const safe = { ...entry };
    delete safe.before;
    delete safe.after;
    return safe;
}

module.exports = {
    filterStateForClient,
    filterHistoryForPlayer,
    stripHistorySnapshots
};
