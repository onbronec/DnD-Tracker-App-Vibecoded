import { describe, expect, it } from 'vitest';
import { parseMonsterEntries, parseMonsterMarkdown, parseMonsterSpellcasting } from '../../src/shared/monsterParser';
import { weirdboyActions } from '../fixtures/monsterSpellcasting';

describe('monster Markdown parser', () => {
  it('keeps spell lists and continuation paragraphs inside one action through editor round-trips', () => {
    const entries = parseMonsterEntries(weirdboyActions);
    expect(entries.map(entry => entry.name)).toEqual(['Spellcasting — LOUDER! BIGGER!', 'Bonecracking Staff']);
    expect(entries[0].description).toContain('All limited uses recharge');
    expect(parseMonsterEntries(entries.map(entry => entry.description).join('\n\n'))).toEqual(entries);
    const spells = parseMonsterSpellcasting(entries[0].description);
    expect(spells.spellcastingType).toBe('per-day');
    expect(spells.atWillSpells).toHaveLength(12);
    expect(spells.perDaySpells).toHaveLength(22);
    expect(spells.counterspells).toHaveLength(4);
  });

  it.each([{ spells: undefined }, { spells: [
    { name: 'Fly' }, { name: 'Lightning Bolt' }, { name: 'Chain Lightning' },
    { name: 'Globe of Invulnerability' }, { name: 'Meteor Swarm' }, { name: 'Sonic Boom' },
    { name: 'Obsidian Tombs' }, { name: 'The Classic', source: 'Counterspell' },
    { name: 'The Mage Killer', source: 'Counterspell' }, { name: 'The Feint', source: 'Counterspell' }
  ] }])('imports decorated per-day spell lists instead of a trait mentioning Spellcasting (database: %j)', ({ spells: spellDatabase }) => {
    const parsed = parseMonsterMarkdown(`# Grimfang Weirdboy

## Regular Traits
**Follower of Gruumsh.** The Weirdboy participates in Gruumsh Warband mechanics.
**You Cheated! Do It Again! (1/Action).** When a spell the Weirdboy casts as part of his Spellcasting action is successfully countered, he can immediately cast a different spell.

## Actions
**Bonecracking Staff.** Melee Weapon Attack: +12 to hit.
**Spellcasting — LOUDER! BIGGER!** The Weirdboy casts two spells from the list below as one action.
- **At Will:** Fly, Lightning Bolt.
- **Counterspells:** The Classic, The Mage Killer, The Feint (use their existing campaign rules).
- **3/Day Each:** Chain Lightning, Globe of Invulnerability.
- **1/Day Each:** Meteor Swarm, Sonic Boom *(Epic Tier 1)*, Obsidian Tombs *(Epic Tier 2)*.

All limited uses recharge when the Weirdboy finishes a long rest.

## Reactions
**Spellcasting.** The Weirdboy can cast Shield when its normal reaction trigger occurs.
`.replace(/\n/g, '\r\n'), spellDatabase);

    const spellcasting = parsed.monsterAbilities.spellcasting;
    expect(parsed.actions.map(entry => entry.name)).toEqual(['Bonecracking Staff', 'Spellcasting — LOUDER! BIGGER!']);
    expect(spellcasting.enabled).toBe(true);
    expect(spellcasting.spellcastingType).toBe('per-day');
    expect(spellcasting.spellSlots).toEqual({});
    expect(spellcasting.atWillSpells).toEqual(['Fly', 'Lightning Bolt']);
    expect(spellcasting.counterspells).toEqual(['The Classic', 'The Mage Killer', 'The Feint']);
    expect(spellcasting.perDaySpells).toEqual([
      { name: 'Chain Lightning', maxUses: 3, used: 0 },
      { name: 'Globe of Invulnerability', maxUses: 3, used: 0 },
      { name: 'Meteor Swarm', maxUses: 1, used: 0 },
      { name: 'Sonic Boom', maxUses: 1, used: 0 },
      { name: 'Obsidian Tombs', maxUses: 1, used: 0 }
    ]);
  });

  it('does not enable spellcasting for a trait that only mentions it', () => {
    const parsed = parseMonsterMarkdown(`# Guard
## Regular Traits
**Mage Hunter.** The guard interrupts an enemy's Spellcasting action.
`);
    expect(parsed.monsterAbilities.spellcasting.enabled).toBe(false);
  });

  it('accepts Markdown list markers and bold labels for slot-based spellcasting', () => {
    const parsed = parseMonsterMarkdown(`# Mage
## Regular Traits
**Innate Spellcasting.** The mage casts spells.
* **Cantrips (at will):** Light.
+ **1st level (4 slots):** Shield, Magic Missile.
- **Epic Tier 1 (2 slots):** Sonic Boom.
`);
    const spellcasting = parsed.monsterAbilities.spellcasting;
    expect(spellcasting.spellcastingType).toBe('custom-slots');
    expect(spellcasting.atWillSpells).toEqual(['Light']);
    expect(spellcasting.spellSlots['1']).toEqual({ max: 4, used: 0, atWill: false, spells: ['Shield', 'Magic Missile'] });
    expect(spellcasting.spellSlots.epic1).toEqual({ max: 2, used: 0, atWill: false, spells: ['Sonic Boom'] });
  });

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
    expect(parsed.monsterAbilities.customFeatures).toContainEqual(
      expect.objectContaining({ name: 'Divine Protection', maxUses: 2, used: 0, trackerType: 'rest' })
    );
  });

  it('correctly parses complex spellcasting and resource limits', () => {
    const parsed = parseMonsterMarkdown(`
Dragon Champion

# Regular Traits

**Breath Weapon (Recharge 5–6).** The dragon breathes fire.
**Quick Parry (1/round).** The champion deflects an attack.
**Power Punch.** Melee Attack. This attack costs 2 power points.
**Smite.** Melee Attack. Uses a 2nd-level spell slot.

# Actions

**Spellcasting.** The Dragon Champion is a 5th-level spellcaster. Its spellcasting ability is Charisma.
Cantrips (at will): light, sacred flame
1st level (4 slots): shield, cure wounds
2nd level (3 slots): misty step, counterspell
`, [
      { name: 'light', levelKey: 'cantrip', source: 'PHB' },
      { name: 'sacred flame', levelKey: 'cantrip', source: 'PHB' },
      { name: 'shield', levelKey: 'level1', source: 'PHB' },
      { name: 'cure wounds', levelKey: 'level1', source: 'PHB' },
      { name: 'misty step', levelKey: 'level2', source: 'PHB' },
      { name: 'counterspell', levelKey: 'level3', source: 'Counterspell' }
    ]);

    // Spellcasting type
    expect(parsed.monsterAbilities.spellcasting.spellcastingType).toBe('caster-level');
    expect(parsed.monsterAbilities.spellcasting.spellcastingLevel).toBe(5);

    // Spell slots spells mapping
    expect(parsed.monsterAbilities.spellcasting.spellSlots['1'].spells).toEqual(['shield', 'cure wounds']);
    expect(parsed.monsterAbilities.spellcasting.spellSlots['2'].spells).toEqual(['misty step', 'counterspell']);
    expect(parsed.monsterAbilities.spellcasting.atWillSpells).toEqual(['light', 'sacred flame']);
    expect(parsed.monsterAbilities.spellcasting.counterspells).toEqual(['counterspell']);

    // Resource limits
    expect(parsed.monsterAbilities.customFeatures).toContainEqual(
      expect.objectContaining({ name: 'Breath Weapon', trackerType: 'recharge', rechargeValue: 5, maxUses: 1 })
    );
    expect(parsed.monsterAbilities.customFeatures).toContainEqual(
      expect.objectContaining({ name: 'Quick Parry', trackerType: 'round', maxUses: 1 })
    );
    expect(parsed.monsterAbilities.customFeatures).toContainEqual(
      expect.objectContaining({ name: 'Power Punch', trackerType: 'power', costAmount: 2 })
    );
    expect(parsed.monsterAbilities.customFeatures).toContainEqual(
      expect.objectContaining({ name: 'Smite', trackerType: 'slot', costSpellLevel: '2', costAmount: 1 })
    );
  });

  it('correctly parses the user-provided spellcasting formats with space-separated lists, Counterspell lines, custom slots, and epic tiers', () => {
    const spellDatabase = [
      { name: 'Fire Bolt' }, { name: 'Ray of Frost' }, { name: 'Mage Hand' },
      { name: 'Prestidigitation' }, { name: 'Shocking Grasp' },
      { name: 'Detect Magic' }, { name: 'Identify' }, { name: 'Shield' }, { name: 'Magic Missile' },
      { name: 'Hold Person' }, { name: 'Misty Step' }, { name: 'Invisibility' },
      { name: 'Counterspell', source: 'Counterspell' }, { name: 'Fireball' }, { name: 'Dispel Magic' }, { name: 'Fly' },
      { name: 'Greater Invisibility' }, { name: 'Wall of Fire' },
      { name: 'Cone of Cold' }, { name: 'Bigby\'s Hand' }, { name: 'Wall of Force' },
      { name: 'Chain Lightning' }, { name: 'Mass Suggestion' },
      { name: 'Teleport' }, { name: 'Delayed Blast Fireball' },
      { name: 'Maze' }, { name: 'Power Word Stun' },
      { name: 'Time Stop' }, { name: 'Prismatic Wall' },
      { name: 'The Classic', source: 'Counterspell' },
      { name: 'The Feint', source: 'Counterspell' },
      { name: 'The Mage Killer', source: 'Counterspell' },
      { name: 'Prismatic Spray' }, { name: 'Incendiary Cloud' }, { name: 'Dominate Monster' },
      { name: 'Meteor Swarm' }, { name: 'Reverse Magic' }, { name: 'Caldera' }, { name: 'Implosion' },
      { name: 'Abi-Dalzim\'s Horrid Wilting' }, { name: 'Time Ravage' },
      { name: 'Antimagic Ray' }, { name: 'Catastrophe' }, { name: 'Prismatic Deluge' }
    ];

    // Format 1: Archmage spellcasting - levels
    const archmageBlock = `
**Spellcasting.** The archmage is an 20th-level spellcaster. Its spellcasting ability is Intelligence (spell save DC 20, +12 to hit with spell attacks). The archmage has the following wizard spells prepared:

Counterspells: The Classic The Feint  The Mage Killer

Cantrips (at will): Fire Bolt Ray of Frost Mage Hand Prestidigitation Shocking Grasp

1st level (4 slots): Detect Magic Identify Shield Magic Missile

2nd level (3 slots): Hold Person Misty Step Invisibility

3rd level (3 slots): Counterspell Fireball Dispel Magic Fly

4th level (3 slots): Greater Invisibility Wall of Fire

5th level (3 slots): Cone of Cold Bigby's Hand Wall of Force

6th level (2 slot): Chain Lightning Mass Suggestion

7th level (2 slot): Teleport Delayed Blast Fireball

8th level (1 slot): Maze Power Word Stun

9th level (1 slot): Time Stop Prismatic Wall
`;
    const parsedArchmage = parseMonsterMarkdown(`# Archmage\n# Actions\n${archmageBlock}`, spellDatabase);
    const archSc = parsedArchmage.monsterAbilities.spellcasting;
    expect(archSc.spellcastingType).toBe('caster-level');
    expect(archSc.spellcastingLevel).toBe(20);
    expect(archSc.counterspells).toEqual(expect.arrayContaining(['The Classic', 'The Feint', 'The Mage Killer', 'Counterspell']));
    expect(archSc.atWillSpells).toEqual(expect.arrayContaining(['Fire Bolt', 'Ray of Frost', 'Mage Hand', 'Prestidigitation', 'Shocking Grasp']));
    expect(archSc.spellSlots['1'].spells).toEqual(['Detect Magic', 'Identify', 'Shield', 'Magic Missile']);
    expect(archSc.spellSlots['1'].max).toBe(4);
    expect(archSc.spellSlots['3'].spells).toEqual(['Counterspell', 'Fireball', 'Dispel Magic', 'Fly']);
    expect(archSc.spellSlots['9'].spells).toEqual(['Time Stop', 'Prismatic Wall']);
    expect(archSc.spellSlots['9'].max).toBe(1);

    // Format 2: Aurak draconian spellcasting - per day
    const draconianBlock = `
**Spellcasting.** The Draconian is a spellcaster. Its spellcasting ability is Charisma (spell save DC 23, +15 to hit with spell attacks). The draconian has the following wizard spells prepared:

At Will: Fly, Misty Step, Counterspell, Dispel Magic, Shield, Dimension Door, Identify, Detect Magic

Counterspells: The Classic, The Mage Killer, The Feint

3/Day: Prismatic Spray, Incendiary Cloud, Teleport, Dominate Monster

1/Day: Meteor Swarm, Reverse Magic, Caldera, Implosion
`;
    const parsedDraconian = parseMonsterMarkdown(`# Draconian\n# Actions\n${draconianBlock}`, spellDatabase);
    const dracSc = parsedDraconian.monsterAbilities.spellcasting;
    expect(dracSc.spellcastingType).toBe('per-day');
    expect(dracSc.atWillSpells).toEqual(expect.arrayContaining(['Fly', 'Misty Step', 'Counterspell', 'Dispel Magic', 'Shield', 'Identify', 'Detect Magic']));
    expect(dracSc.counterspells).toEqual(expect.arrayContaining(['Counterspell', 'The Classic', 'The Mage Killer', 'The Feint']));
    expect(dracSc.perDaySpells).toContainEqual(expect.objectContaining({ name: 'Prismatic Spray', maxUses: 3 }));
    expect(dracSc.perDaySpells).toContainEqual(expect.objectContaining({ name: 'Meteor Swarm', maxUses: 1 }));

    // Format 3: Belial - custom levels and epic tiers
    const belialBlock = `
**Spellcasting.** Belial is an 24th-level spellcaster. Its spellcasting ability is Intelligence (spell save DC 25, +17 to hit with spell attacks). Belial has the following wizard spells prepared:

Counterspells: The Classic The Feint  The Mage Killer

Cantrips (at will): Fire Bolt Ray of Frost Mage Hand Prestidigitation Shocking Grasp

1st level (at will): Detect Magic Identify Shield Magic Missile

2nd level (at will): Hold Person Misty Step Invisibility

3rd level (at will):  Counterspell  Fireball Dispel Magic Fly

4th level (5 slots): Greater Invisibility Wall of Fire

5th level (4 slots): Cone of Cold Bigby's Hand Wall of Force

6th level (3 slot): Chain Lightning Mass Suggestion

7th level (3 slot): Teleport Delayed Blast Fireball

8th level (2 slot): Power Word Stun Abi-Dalzim's Horrid Wilting

9th level (2 slot): Time Ravage Prismatic Wall

Epic Tier 1 (3 slots): Antimagic Ray Reverse Magic Catastrophe

Epic Tier 2 (2 slots): Caldera Prismatic Deluge
`;
    const parsedBelial = parseMonsterMarkdown(`# Belial\n# Actions\n${belialBlock}`, spellDatabase);
    const belSc = parsedBelial.monsterAbilities.spellcasting;
    expect(belSc.spellcastingType).toBe('caster-level');
    expect(belSc.spellcastingLevel).toBe(24);
    expect(belSc.spellSlots['1'].atWill).toBe(true);
    expect(belSc.spellSlots['1'].max).toBe(0);
    expect(belSc.spellSlots['1'].spells).toEqual(['Detect Magic', 'Identify', 'Shield', 'Magic Missile']);
    expect(belSc.spellSlots['4'].spells).toEqual(['Greater Invisibility', 'Wall of Fire']);
    expect(belSc.spellSlots['4'].max).toBe(5);
    expect(belSc.spellSlots['epic1'].spells).toEqual(['Antimagic Ray', 'Reverse Magic', 'Catastrophe']);
    expect(belSc.spellSlots['epic1'].max).toBe(3);
    expect(belSc.spellSlots['epic2'].spells).toEqual(['Caldera', 'Prismatic Deluge']);
    expect(belSc.spellSlots['epic2'].max).toBe(2);
  });

  it('correctly parses damage resistances, damage immunities, condition immunities, and damage vulnerabilities', () => {
    const parsed = parseMonsterMarkdown(`
Demon Lord

**Armor Class:** 22
**Hit Points:** 350
**Speed:** 40 ft., fly 60 ft.

| Strength | Dexterity | Constitution | Intelligence | Wisdom | Charisma |
| --- | --- | --- | --- | --- | --- |
| 26 (+8) | 16 (+3) | 24 (+7) | 20 (+5) | 18 (+4) | 22 (+6) |

**Damage Resistances:** Fire, Cold, Lightning; Bludgeoning, Piercing, and Slashing from Nonmagical Attacks
**Damage Immunities:** Poison, Acid, Hellfire, Vile
**Condition Immunities:** Poisoned, Charmed, Stunned
**Damage Vulnerabilities:** Radiant, Righteous
`);

    expect(parsed.damageResistances).toBe('Fire, Cold, Lightning; Bludgeoning, Piercing, and Slashing from Nonmagical Attacks');
    expect(parsed.damageImmunities).toBe('Poison, Acid, Hellfire, Vile');
    expect(parsed.conditionImmunities).toBe('Poisoned, Charmed, Stunned');
    expect(parsed.damageVulnerabilities).toBe('Radiant, Righteous');
  });

  it('imports encounter points and a fixed-initiative non-monster object', () => {
    const parsed = parseMonsterMarkdown(`
# Gruumsh Warband
**Entity Type:** Non-Monster
**Fixed Initiative:** 20
**Has HP/AC:** no
**Encounter Points:** 0.5
**Expected DPR:** 35

## Actions
**Gruumsh's Gaze (1/Round).** Choose a Hunter and Prey.
`);

    expect(parsed).toEqual(expect.objectContaining({
      name: 'Gruumsh Warband', entityKind: 'nonMonster', hasHpAc: false,
      fixedInitiative: 20, encounterPoints: 0.5, dpr: 35
    }));
    expect(parsed.monsterAbilities.customFeatures).toContainEqual(
      expect.objectContaining({ name: "Gruumsh's Gaze", trackerType: 'round', maxUses: 1 })
    );
  });
});
