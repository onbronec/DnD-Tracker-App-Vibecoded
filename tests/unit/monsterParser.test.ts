import { describe, expect, it } from 'vitest';
import { parseMonsterMarkdown } from '../../src/shared/monsterParser';

describe('monster Markdown parser', () => {
  it('parses Notion-style monster statblocks into editable monster data', () => {
    const parsed = parseMonsterMarkdown(`
Zealot

**Armor Class:** 13
**Hit Points:** 50
**Speed:** 30 ft.

| Strength | Dexterity | Constitution | Intelligence | Wisdom | Charisma |
| --- | --- | --- | --- | --- | --- |
| 11 (+0) | 14 (+2) | 12 (+4) | 10 (+0) | 14 (+2) | 13 (+1) |

**Saving Throws:** Wis +11, Cha +10
**Challenge** 6 (0.5 point), **Proficiency:** +4

**Type:** humanoid
**Size:** medium
**Skills:** Religion +9, Perception +11

# Protective Traits

**Divine Protection (2/Rest).** Aura of divine light surrounds the zealot.

# Regular Traits

**Devoted Follower.** Uses the proficiency bonus of its archpriest.

# Actions

**Pact Blade.** Melee Weapon Attack: +11 to hit.

# Reactions

**Counterspell.** Uses counterspell.
`);

    expect(parsed).toEqual(expect.objectContaining({
      name: 'Zealot',
      ac: 13,
      hp: 50,
      speed: '30 ft.',
      saves: 'Wis +11, Cha +10',
      type: 'humanoid',
      size: 'medium'
    }));
    expect(parsed.stats).toEqual(expect.objectContaining({ strength: 11, dexterity: 14, constitution: 12 }));
    expect(parsed.defensiveFeatures[0]).toEqual(expect.objectContaining({ name: 'Divine Protection (2/Rest)' }));
    expect(parsed.features[0]).toEqual(expect.objectContaining({ name: 'Devoted Follower' }));
    expect(parsed.actions[0]).toEqual(expect.objectContaining({ name: 'Pact Blade' }));
    expect(parsed.reactions[0]).toEqual(expect.objectContaining({ name: 'Counterspell' }));
    expect(parsed.monsterAbilities.customFeatures).toEqual([
      expect.objectContaining({ name: 'Divine Protection', maxUses: 2, used: 0 })
    ]);
  });
});
