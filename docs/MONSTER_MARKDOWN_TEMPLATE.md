# DnD Companion Monster Markdown Template

Use this template when asking an AI model to create a monster statblock for
DnD Companion import. Paste the filled Markdown into the monster editor, click
Parse Statblock, review the parsed fields, adjust trackers if needed, then save.

The importer is intentionally Markdown-shaped, not JSON-shaped. It recognizes
the exact bold labels and section headings below, and it reads monster abilities
from entries formatted as `**Feature Name.** Description`.

## Quick Prompt For An AI Model

Copy this prompt and append any lore, CR, role, mechanics, or house rules you
want the model to use.

```text
Create a DnD Companion monster statblock in Markdown using the template below.
Keep the exact bold field labels and section headings. Use entries formatted as
**Name.** Description under each feature/action section. Include recharge,
per-day, per-rest, per-round, spell-slot-cost, and power-cost wording in feature
names or descriptions when relevant so the app can infer trackers.

If the monster casts spells, put the spellcasting entry under Traits or Actions
and include lines like:
Cantrips (at will): Fire Bolt, Mage Hand
1st level (4 slots): Shield, Magic Missile
Epic Tier 1 (3 slots): Antimagic Ray
At will: Detect Magic, Counterspell
3/day each: Fireball, Fly
Counterspells: The Classic, The Mage Killer

Do not output JSON. Do not omit empty sections that I ask for. Use Markdown only.
```

## Fillable Template

```markdown
# Monster Name

**Size:** Large
**Type:** fiend, dragon, undead, construct, humanoid, etc.
**Armor Class:** 18
**Hit Points:** 225
**Speed:** 40 ft., fly 80 ft.
**Saving Throws:** Dex +8, Con +12, Wis +9, Cha +11
**Skills:** Perception +14, Stealth +8, Arcana +10
**Damage Vulnerabilities:** radiant
**Damage Resistances:** cold, fire, lightning; bludgeoning, piercing, and slashing from nonmagical attacks
**Damage Immunities:** poison
**Condition Immunities:** Charmed, Frightened, Poisoned
**Senses:** truesight 60 ft., darkvision 120 ft., passive Perception 24
**Languages:** Common, Draconic, Infernal, telepathy 120 ft.
**Challenge** 18
**Proficiency:** +6

| STR | DEX | CON | INT | WIS | CHA |
| --- | --- | --- | --- | --- | --- |
| 24 (+7) | 16 (+3) | 22 (+6) | 18 (+4) | 18 (+4) | 21 (+5) |

## Protective Traits

**Legendary Resistance (3/Day).** If the monster fails a saving throw, it can choose to succeed instead.

**Magic Resistance.** The monster has advantage on saving throws against spells and other magical effects.

## Regular Traits

**Spellcasting.** The monster is an 18th-level spellcaster. Its spellcasting ability is Charisma (spell save DC 19, +11 to hit with spell attacks).

Cantrips (at will): Fire Bolt, Mage Hand, Prestidigitation
1st level (4 slots): Shield, Magic Missile, Detect Magic
2nd level (3 slots): Misty Step, Hold Person
3rd level (3 slots): Counterspell, Fireball, Dispel Magic
4th level (3 slots): Greater Invisibility, Wall of Fire
5th level (3 slots): Cone of Cold, Wall of Force
6th level (1 slot): Chain Lightning
Epic Tier 1 (2 slots): Antimagic Ray, Reverse Magic
Counterspells: Counterspell, The Mage Killer

**Crystallization Core.** The monster has a power resource called Crystallization. Several abilities cost crystallization points. Set the resource name and maximum manually in the editor after import.

**Aura of Ruin (1/Round).** Once per round, a creature that starts its turn within 10 feet of the monster takes 10 necrotic damage.

## Actions

**Multiattack.** The monster makes three attacks: one bite and two claws.

**Bite.** Melee Weapon Attack: +13 to hit, reach 10 ft., one target. Hit: 18 (2d10 + 7) piercing damage plus 14 (4d6) fire damage.

**Claw.** Melee Weapon Attack: +13 to hit, reach 5 ft., one target. Hit: 14 (2d6 + 7) slashing damage.

**Crystal Breath (Recharge 5-6).** The monster exhales crystal shards in a 60-foot cone. Each creature in that area must make a DC 20 Dexterity saving throw, taking 63 (14d8) piercing damage on a failed save, or half as much damage on a success.

**Shatter Fate.** The monster spends 2 crystallization points to force one creature it can see to reroll a d20 and use the lower result.

**Arcane Sever.** The monster expends a 3rd-level spell slot to end one spell effect it can see within 60 feet.

## Bonus Actions

**Wing Step (3/Day).** The monster teleports up to 30 feet to an unoccupied space it can see.

## Reactions

**Parry.** The monster adds 6 to its AC against one melee attack that would hit it. To do so, the monster must see the attacker and be wielding a melee weapon.

**Counterspell Snap (1/Rest).** When a creature casts a spell within 60 feet, the monster can cast Counterspell without expending a spell slot.

## Legendary Actions

**Detect.** The monster makes a Wisdom (Perception) check.

**Tail Attack.** The monster makes one tail attack.

**Cast a Cantrip.** The monster casts one cantrip.

## Lair Actions

**Crystalline Eruption.** On initiative count 20, crystal spikes erupt from a point the monster can see within 120 feet. Creatures within 15 feet must succeed on a DC 18 Dexterity saving throw or take 21 (6d6) piercing damage.

## Mythic Actions

**Heart of Glass.** If the monster has entered its mythic phase, it regains 30 hit points and sheds bright light in a 30-foot radius.

## Notes

[br]
| Crystalization Level | Effect |
| --- | --- |
| 1 | The monster glows faintly. |
| 2 | Crystal attacks deal +1d6 force damage. |
| 3 | The monster gains resistance to force damage. |
```

## Import Rules The Template Uses

- The first non-empty non-table line becomes the monster name.
- Basic fields are read from bold labels like `**Armor Class:** 18`.
- Ability scores are read from the first six-column score table containing
  values like `24 (+7)`.
- Recognized text sections are:
  `Protective Traits`, `Defensive Traits`, `Regular Traits`, `Traits`,
  `Actions`, `Bonus Actions`, `Reactions`, `Legendary Actions`,
  `Lair Actions`, and `Mythic Actions`.
- Each section entry should start on its own line with:
  `**Feature Name.** Description`.
- Spellcasting is parsed from the first trait or action whose description
  contains `Spellcasting`.
- Spell lines support cantrips, numbered slots, epic tier slots, at-will spells,
  per-day spells, and explicit `Counterspells:`.
- Recharge trackers are inferred from names like `(Recharge 5-6)`.
- Per-use trackers are inferred from names like `(3/Day)`, `(1/Rest)`,
  `(1/Long Rest)`, `(1/Short Rest)`, or `(1/Round)`.
- Power-cost trackers are inferred from descriptions with wording like
  `costs 2 power`, `spend 1 favor`, or `uses 3 crystallization points`.
- Spell-slot-cost trackers are inferred from wording like
  `expends a 3rd-level spell slot`.
- Lair and mythic action sections are imported as descriptive actions. The app
  can create initiative placeholders for lair/mythic actions when adding the
  monster to combat.
- Markdown tables in descriptions are supported, including after `[br]`.

## Manual Review After Import

After parsing, always review the monster in the editor before saving.

- Set custom power resource name, max, and starting value if the monster uses
  power points, favor, crystallization, or a similar pool.
- Confirm custom feature trackers, recharge values, and slot costs in the
  tracker configuration panel.
- Configure structured Epic Actions in the editor if you need tracked epic
  action uses. The Markdown `Mythic Actions` section imports descriptive text,
  while the editor's Epic Actions table controls tracked epic uses.
- Confirm spell names against the spell database, especially multi-word spells
  without commas.
- Use Preview before saving to see the monster in the same view used for combat
  and database previews.
