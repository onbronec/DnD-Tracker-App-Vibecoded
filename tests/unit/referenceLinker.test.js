const {
    collectReferences,
    linkSpellDatabaseReferences,
    linkTextReferences
} = require('../../scripts/link-spell-markdown-references');

describe('spell markdown reference linker', () => {
    it('links exact condition, spell and monster names without matching stripped-space text', () => {
        const references = collectReferences({
            conditionDatabase: [{ id: 'poisoned', name: 'Poisoned' }, { id: 'stunned', name: 'Stunned' }],
            spellDatabase: [{ id: 'wish', name: 'Accursed Wish' }],
            monsterDatabase: [{ id: 'orc', name: 'Orc Warlord' }]
        });

        const result = linkTextReferences('A poisoned target is Stunned. A poi soned typo stays. Cast Accursed Wish near an Orc Warlord.', references);

        expect(result.text).toBe('A @Poisoned target is @Stunned. A poi soned typo stays. Cast @[Accursed Wish] near an @[Orc Warlord].');
        expect(result.inserted).toBe(4);
        expect(result.byKind).toEqual({ condition: 2, spell: 1, monster: 1 });
    });

    it('normalizes existing references without rewriting markdown links or urls', () => {
        const references = collectReferences({
            conditionDatabase: [{ id: 'stunned', name: 'Stunned' }, { id: 'invisible', name: 'Invisible' }],
            spellDatabase: [{ id: 'wish', name: 'Accursed Wish' }, { id: 'invisibility', name: 'Invisibility' }],
            monsterDatabase: []
        });

        const result = linkTextReferences('@stunned, @invisible and @[accursed wish] normalize. [Stunned](https://example.com/Stunned) stays. https://example.com/Stunned stays. Stunned links. @invisibility links the spell.', references);

        expect(result.text).toBe('@Stunned, @Invisible and @[Accursed Wish] normalize. [Stunned](https://example.com/Stunned) stays. https://example.com/Stunned stays. @Stunned links. @Invisibility links the spell.');
        expect(result.inserted).toBe(1);
        expect(result.normalized).toBe(4);
    });

    it('updates spell markdown fields and skips self spell references', () => {
        const state = {
            conditionDatabase: [{ id: 'stunned', name: 'Stunned' }],
            monsterDatabase: [{ id: 'lich', name: 'Lich King' }],
            spellDatabase: [
                { id: 'accursed', name: 'Accursed Wish', description: 'Accursed Wish does not self-link. Stunned enemies see the Lich King.', atHigherLevels: 'Stunned again.' },
                { id: 'shield', name: 'Shield', description: 'References Accursed Wish.', atHigherLevels: '' }
            ]
        };

        const result = linkSpellDatabaseReferences(state, { minNameLength: 4 });

        expect(state.spellDatabase[0].description).toBe('Accursed Wish does not self-link. @Stunned enemies see the @[Lich King].');
        expect(state.spellDatabase[0].atHigherLevels).toBe('@Stunned again.');
        expect(state.spellDatabase[1].description).toBe('References @[Accursed Wish].');
        expect(result.totals.spellsChanged).toBe(2);
        expect(result.totals.inserted).toBe(4);
    });
});
