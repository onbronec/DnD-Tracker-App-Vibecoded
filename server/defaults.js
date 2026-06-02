const { DEFAULT_CONDITIONS } = require('./conditionPresets');

const PAGE_SCOPES = ['combat', 'spells', 'monsters', 'inventory', 'databases'];

function createEmptyInventory() {
    return {
        currency: { manaCoins: 0, platinum: 0, gold: 0, silver: 0, copper: 0 },
        spellComponents: [],
        potions: [],
        scrolls: [],
        generalItems: [],
        magicItems: []
    };
}

function createInitialState() {
    return {
        schemaVersion: 3,
        characters: [],
        combatState: {
            active: false,
            currentTurn: 0,
            round: 1,
            playedThisRound: []
        },
        monsterDatabase: [],
        magicItemDatabase: [],
        potionDatabase: [],
        conditionDatabase: DEFAULT_CONDITIONS.map((condition, index) => ({
            ...condition,
            id: `condition_${index + 1}`,
            tags: Array.isArray(condition.tags) ? condition.tags : []
        })),
        itemDatabase: [],
        actionLog: [],
        redoStacks: PAGE_SCOPES.reduce((acc, page) => {
            acc[page] = [];
            return acc;
        }, {}),
        nextSequence: 1
    };
}

module.exports = {
    PAGE_SCOPES,
    createEmptyInventory,
    createInitialState
};
