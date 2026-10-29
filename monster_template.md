# DnD Companion Monster Template

Give the following instructions and template to an AI model. Replace every
value in square brackets. Paste the completed Markdown into the Monster Editor
and choose **Parse Statblock**.

```text
Create a DnD Companion monster statblock by filling out the Markdown template
below. Keep every bold field label and section heading exactly as written.
Keep each trait, action, and reaction on its own line in this exact form:
**Entry Name.** Description

Omit an optional section only when the monster has no entries for it. Do not
return JSON, HTML, explanations, or Markdown outside of the completed template.
For spell lists, separate spell names with commas.
```

```markdown
# [Monster Name]

**Size:** [Medium]
**Type:** [humanoid]
**Encounter Points:** [1.0]
**Expected DPR:** [90]
**Armor Class:** [15] ([armor or defense description])
**Hit Points:** [110] ([hit dice or other note])
**Speed:** [30 ft., fly 60 ft.]
**Saving Throws:** [Dex +6, Con +8]
**Skills:** [Perception +5, Stealth +6]
**Damage Vulnerabilities:** [radiant]
**Damage Resistances:** [cold, fire]
**Damage Immunities:** [poison]
**Condition Immunities:** [Charmed, Poisoned]
**Senses:** [darkvision 60 ft., passive Perception 15]
**Languages:** [Common, Infernal]
**Challenge** [8]
**Proficiency:** [+3]

| STR | DEX | CON | INT | WIS | CHA |
| --- | --- | --- | --- | --- | --- |
| 18 (+4) | 14 (+2) | 16 (+3) | 12 (+1) | 14 (+2) | 16 (+3) |

## Protective Traits

**Magic Resistance.** The monster has advantage on saving throws against spells and other magical effects.

**Legendary Resistance (3/Day).** If the monster fails a saving throw, it can choose to succeed instead.

## Regular Traits

**Keen Senses.** The monster has advantage on Wisdom (Perception) checks that rely on hearing or smell.

**Spellcasting.** The monster is a 9th-level spellcaster. Its spellcasting ability is Charisma (spell save DC 15, +7 to hit with spell attacks).

Cantrips (at will): [Fire Bolt, Mage Hand]
1st level (4 slots): [Shield, Magic Missile]
2nd level (3 slots): [Misty Step, Hold Person]
3rd level (3 slots): [Counterspell, Fireball]
At Will: [Detect Magic]
3/Day: [Fly]
Counterspells: [Counterspell]

**Recharge Feature (Recharge 5-6).** Describe a feature that becomes available again on a recharge roll.

**Limited Feature (1/Rest).** Describe a feature with a rest-based use limit.

**Power Feature.** This feature costs 2 power points to use.

**Spell Slot Feature.** This feature expends a 3rd-level spell slot.

## Actions

**Multiattack.** The monster makes two attacks.

**Weapon Attack.** Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 12 (2d8 + 3) slashing damage.

## Bonus Actions

**Quick Step (3/Day).** The monster moves up to half its speed without provoking opportunity attacks.

## Reactions

**Parry (1/Round).** The monster adds 3 to its AC against one melee attack that would hit it.

## Legendary Actions

**Detect.** The monster makes a Wisdom (Perception) check.

**Attack.** The monster makes one weapon attack.

## Lair Actions

**Lair Effect.** On initiative count 20, describe one lair action.

## Mythic Actions

**Mythic Effect.** Describe one mythic action or phase effect.
```

## Import Notes

- `Protective Traits` and `Defensive Traits` become defensive features.
- `Regular Traits` and `Traits` become regular features.
- Empty optional fields may be removed; use a real number for Armor Class and
  Hit Points.
- `Encounter Points` is imported directly into the Encounter Planner. One
  point is roughly 150 HP and 80–100 DPR; use decimal values from 0.1 to 20.
- The app recognizes use trackers from names such as `(3/Day)`, `(1/Rest)`,
  `(1/Round)`, and `(Recharge 5-6)`.
- Power and spell-slot costs are inferred from wording such as `costs 2 power
  points` and `expends a 3rd-level spell slot`. Set the power pool's name and
  maximum manually in the editor after importing.
- Spell entries are matched against the app's spell database. Comma-separated
  spell names are the most reliable format.
- Review the parsed editor fields and tracker settings before saving.
