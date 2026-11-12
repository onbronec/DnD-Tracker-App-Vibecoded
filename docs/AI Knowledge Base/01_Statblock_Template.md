# DnD Companion Monster Template & Parser Specification

This document provides the authoritative Markdown template, AI prompt, and parser specification for creating monsters in **DnD Companion**.

Monsters created with this format can be imported into DnD Companion via **Databases → Monsters → Database actions → Import from .md** or pasted directly into the **Monster Editor** using **Parse Statblock**.

---

## 1. AI Generation Prompt

Give the prompt below to an AI model when requesting a new monster statblock:

```text
Create a DnD Companion monster statblock by filling out the Markdown template below.
Keep every bold field label and section heading exactly as written.
Start each trait, action, reaction, legendary action, and epic action in this exact form:
**Entry Name.** Description

Descriptions may continue in paragraphs, bullet points, and tables.
Use exactly one # heading for the monster name and ## headings for the main sections.
Use ### headings only for suboptions inside a preceding epic action; they remain part of that action.
Put minion/allied statblocks or encounter objects in separate statblocks.
Keep encounter running notes under a separate ## Encounter Running Notes heading after the statblock.

Formatting and parsing rules:
1. Header fields: Provide Encounter Points, Expected DPR, Armor Class, Hit Points, and Max Reactions.
2. Trackers: Add (Recharge 5-6), (N/Day), (N/Rest), or (N/Round) in feature names to create automatic usage boxes.
3. Power costs: If an ability costs power/favor, include explicit phrasing like "This feature costs 1 favor to use." or "costs 2 power".
4. Spell slots: If an ability expends a spell slot, include explicit phrasing like "expends a 3rd-level spell slot".
5. Spell lists: Separate all spell names with commas (e.g. Fireball, Counterspell). List counterspells on their own "Counterspells:" line.
6. Database links: Reference conditions using @Condition (e.g. @Stunned, @Poisoned) and spells using @[Spell Name] (e.g. @[Antimagic Ray]).
7. Epic actions: State the timing rule in the section introduction. Add (N/Round) in the action title if limited per round.
8. Do not return JSON, HTML, code fences, or meta-commentary outside the statblock.
```

---

## 2. Fillable Markdown Template

```markdown
# [Monster Name]

**Size:** [Medium / Large / Huge / Gargantuan]
**Type:** [fiend / dragon / undead / humanoid / aberration / construct / etc.]
**Group:** [Faction / Category Name, e.g. Gruumsh Warband, Devils, Pandemonium]
**Entity Type:** Monster
**Encounter Points:** [1.0]
**Expected DPR:** [90]
**Armor Class:** [18] ([armor or defense description, e.g. plate, natural armor])
**Hit Points:** [150] ([hit dice or note, e.g. 15d8 + 75])
**Speed:** [30 ft., fly 60 ft.]
**Saving Throws:** [Dex +8, Con +10, Wis +9, Cha +11]
**Skills:** [Perception +9, Athletics +10, Stealth +8]
**Damage Vulnerabilities:** [radiant]
**Damage Resistances:** [cold, fire; bludgeoning, piercing, and slashing from nonmagical attacks]
**Damage Immunities:** [poison]
**Condition Immunities:** [@Charmed, @Frightened, @Poisoned]
**Senses:** [darkvision 120 ft., truesight 60 ft., passive Perception 19]
**Languages:** [Common, Infernal, telepathy 120 ft.]
**Challenge:** [12]
**Proficiency:** [+5]
**Max Reactions:** [1]
**Lair Action Initiative:** [20]
**Mythic Action Initiative:** [20]

| STR | DEX | CON | INT | WIS | CHA |
| --- | --- | --- | --- | --- | --- |
| 20 (+5) | 16 (+3) | 20 (+5) | 14 (+2) | 18 (+4) | 16 (+3) |

## Protective Traits

**Magic Resistance.** The monster has advantage on saving throws against spells and other magical effects.

**Legendary Resistance (3/Day).** If the monster fails a saving throw, it can choose to succeed instead.

**Divine Protection (2/Rest).** The monster can spend 1 charge to pass a failed saving throw, prevent damage it was about to take, pass an ability check, or suppress an effect preventing it from taking game actions. Epic effects cost 1 additional charge.

## Regular Traits

**Keen Senses.** The monster has advantage on Wisdom (Perception) checks that rely on hearing or smell.

**Divine Favor (Power Pool — 5 Points).** The monster tracks a power pool called Divine Favor with a maximum of 5 points. Several abilities spend or generate Divine Favor.

**Spellcasting.** The monster is a 12th-level spellcaster. Its spellcasting ability is Charisma (spell save DC 18, +10 to hit with spell attacks).

Cantrips (at will): Fire Bolt, Mage Hand, Prestidigitation
1st level (4 slots): Shield, Magic Missile
2nd level (3 slots): Misty Step, Hold Person
3rd level (3 slots): Counterspell, Fireball
4th level (3 slots): Dimension Door, Greater Invisibility
5th level (2 slots): Cone of Cold, Wall of Force
6th level (1 slot): Chain Lightning
Epic Tier 1 (2 slots): Antimagic Ray, Reverse Magic
At will: Detect Magic, Levitate
3/Day each: Fly, Dispel Magic
Counterspells: Counterspell, The Classic, The Mage Killer

**Recharge Breath (Recharge 5-6).** Describe an ability that recharges on a d6 roll of 5 or 6.

**Power Strike.** This feature costs 1 favor to use. The monster infuses its weapon with radiant energy, dealing an extra 27 (6d8) radiant damage.

**Slot Recovery.** This feature expends a 3rd-level spell slot to remove one condition from the monster.

## Actions

**Multiattack.** The monster makes three attacks: two with its greatsword and one with its slam.

**Greatsword.** Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 19 (4d6 + 5) slashing damage.

**Slam.** Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 14 (2d8 + 5) bludgeoning damage. If the target is a creature, it must succeed on a DC 18 Strength saving throw or be knocked @Prone.

## Bonus Actions

**Shadow Step (3/Day).** The monster teleports up to 30 feet to an unoccupied space in dim light or darkness.

## Reactions

**Parry (1/Round).** The monster adds 4 to its AC against one melee attack that would hit it.

**Counter-Riposte.** When a creature misses the monster with a melee attack, the monster can spend 1 favor to make one Greatsword attack against the attacker.

## Legendary Actions

The monster can take 3 legendary actions, choosing from the options below. Only one legendary action option can be used at a time and only at the end of another creature's turn. The monster regains spent legendary actions at the start of its turn.

**Detect.** The monster makes a Wisdom (Perception) check.

**Attack.** The monster makes one Greatsword attack.

**Wing Beat (Costs 2 Actions).** The monster beats its wings. Each creature within 10 feet must succeed on a DC 18 Dexterity saving throw or take 12 (2d6 + 5) bludgeoning damage and be knocked @Prone.

## Epic Actions

At the end of each player character's turn, the monster can take one Epic Action.
(Include this section only if the monster uses Epic Actions).

**Arcane Bolt.** The monster makes one ranged spell attack (+10 to hit, range 120 ft., 25 force damage). This action has no round use limit.

**Divine Intervention (2/Round).** Spend the listed resource cost to choose one option below. The two round uses are shared across all options.

### Divine Command — 3 Divine Favor (1/Encounter)
The monster targets one enemy within 60 feet. The target must succeed on a DC 18 Wisdom saving throw or become @Stunned until the end of its next turn.

### Divine Miracle — Variable Divine Favor
The monster channels its god's will:

| Effect | Divine Favor Cost |
| --- | ---: |
| 5th-level spell from list | 1 |
| Tier 1 Epic spell from list | 3 |
| Cleanse all non-Epic conditions | 2 |

## Lair Actions

On initiative count 20 (losing initiative ties), the monster can take one lair action:

**Tremor.** The ground violently shakes in a 60-foot radius. Each creature touching the ground must succeed on a DC 18 Dexterity saving throw or fall @Prone.

## Mythic Actions

If the monster's mythic trait has activated, it can take the following action on initiative count 20:

**Mythic Awakening.** The monster sheds all status conditions and unleashes a shockwave dealing 35 force damage to all enemies within 30 feet.

## Encounter Running Notes

- Opening tactic: Trigger Shadow Step on round 1 to engage the party's backline.
- Preserve Divine Favor for defensive saves against Epic crowd control.
```

---

## 3. Parser Specifications & Import Rules

The application uses `parseMonsterMarkdown()` in `src/shared/monsterParser.ts`. To ensure flawless ingestion, follow these exact rules:

### Metadata Headers
- **`**Encounter Points:** [N]`**: Primary field for encounter budgeting. 1 point ≈ 150 HP and 80–100 DPR. Decimal values (e.g. `0.5`, `1.5`, `3.0`, `8.0`) are fully supported.
- **`**Expected DPR:** [N]`**: Estimated damage output per round across all actions, reactions, and legendary/epic turns.
- **`**Max Reactions:** [N]`**: Monsters default to 1 reaction. If a monster has multiple reactions per round (e.g. Elites or Archdevils with 2 or 3 reactions), specify `**Max Reactions:** 2`. The combat tracker renders distinct reaction checkboxes and resets them at the start of the monster's turn.
- **`**Group:** [Name]`**: Organizes monsters into searchable faction/category groups in the Monster Database and combat filters.
- **`**Entity Type:** Monster`** vs **`**Entity Type:** Non-Monster`**: Sets whether the entity is a living creature or an encounter object/hazard/warband. See [06_Non_Monster_Entities.md](file:///c:/Users/onbro/OneDrive/Plocha/DnD-Tracker-App/docs/AI%20Knowledge%20Base/06_Non_Monster_Entities.md) for non-monsters.
- **`**Lair Action Initiative:** [N]`** & **`**Mythic Action Initiative:** [N]`**: Custom initiative count for lair/mythic triggers (default 20).
- **Multiple Health Bars**: For multi-phase bosses, format Hit Points as:
  `**Hit Points:** 450 per health bar (4 bars; 1,800 total)`
  The parser assigns `450` as the active bar HP. Phase transitions and health bar resets are managed in the combat tracker.

### Interactive Database References (`@` and `@[]`)
The app automatically turns markdown references into interactive clickable UI elements that open modal detail cards:
- **Conditions:** Use `@Condition` for single words (e.g. `@Stunned`, `@Poisoned`, `@Prone`, `@Paralyzed`, `@Charmed`, `@Frightened`, `@Blinded`, `@Exhaustion`) and `@[Condition Name]` for multi-word conditions (e.g. `@[Ability Score Set]`, `@[Armor Class Reduced]`, `@[Burning 2d4 fire]`).
- **Spells:** Use `@[Spell Name]` (e.g. `@[Fireball]`, `@[Counterspell]`, `@[Antimagic Ray]`, `@[Shield]`). The app links directly to `spellDatabase`.
- **Monsters:** Use `@[Monster Name]` (e.g. `@[Zealot]`, `@[Gruumsh Battle Cultist]`) to link to minions or summoned creatures.

### Automatic Resource Tracker Inference
The parser reads feature titles and descriptions to generate active tracker checkboxes:
1. **Recharge Tracker**:
   - Title contains `(Recharge 5-6)` or `(Recharge 6)`.
   - Creates a recharge button with roll animation.
2. **Per-Day, Per-Rest, Per-Round Trackers**:
   - Title contains `(N/Day)`, `(N/Rest)`, `(N/Short Rest)`, `(N/Long Rest)`, or `(N/Round)`.
   - Parentheses are stripped from the display name, and `N` interactive use boxes are generated.
   - `(N/Round)` resets automatically at the start of the monster's turn.
   - Text fallbacks: phrases such as `once per round`, `1/round`, `once per day`, `once per rest` also trigger trackers.
3. **Power Resource Costs**:
   - Phrasing such as `costs 1 favor`, `costs 2 power`, `costs 3 crystallization points`, `spend 1 divine favor` sets `trackerType: 'power'` and the exact cost amount.
4. **Spell Slot Costs**:
   - Phrasing such as `expends a 3rd-level spell slot` or `costs a 1st-level spell slot` sets `trackerType: 'slot'` and the slot level.

### Spellcasting Block Rules
Spellcasting must be placed under `## Regular Traits` or `## Actions` using the title `**Spellcasting.**`:
- **Spell Slots:**
  `Cantrips (at will): Fire Bolt, Light`
  `1st level (4 slots): Shield, Magic Missile`
  `1st level (at will): Magic Missile`
  `2nd level (3 slots): Misty Step, Hold Person`
  ...
  `Epic Tier 1 (2 slots): Antimagic Ray, Reverse Magic`
  `Epic Tier 2 (1 slot): Caldera`
  `Epic Tier 3 (1 slot): Equinox`
- **Per-Day / Innate:**
  `At will: Detect Magic, Levitate`
  `3/day each: Fireball, Fly`
- **Counterspells:**
  `Counterspells: Counterspell, The Classic, The Mage Killer`
  The app tracks counterspells in a dedicated monster counterspell picker.
- **Comma Separation:** Spell names **MUST** be separated by commas to match against `spellDatabase`.

#### Expected DPR from Spells (Non-Epic and Epic 3-Round Average):
When calculating `**Expected DPR:**` for a caster relying on spells over weapon attacks, use the 3-round average of the highest available slots (AoE damage is doubled):
- **Apprentice (up to 4th level):** `(33 + 2 × 27) / 3 = 29 DPR` (CR 4, Limited) / `(49 + 2 × 42) / 3 = 44 DPR` (CR 6.5, Great list)
- **Advanced (up to 7th level):** `(60.5 + 55 + 44) / 3 = 53 DPR` (CR 8, Limited) / `(84 + 77 + 56) / 3 = 72 DPR` (CR 11, Great list)
- **Master (up to 9th level):** `(82.5 + 66 + 60.5) / 3 = 70 DPR` (CR 11, Limited) / `(98 + 91 + 84) / 3 = 91 DPR` (CR 14, Great list)
- **Epic Tier 1 Caster:** `(95 + 95 + 82.5) / 3 = 91 DPR` (CR 14, Limited) / `(125 + 125 + 98) / 3 = 116 DPR` (CR 18, Great list)
- **Epic Tier 2 Caster:** `(120 + 120 + 95) / 3 = 112 DPR` (CR 17, Limited) / `(155 + 155 + 125) / 3 = 145 DPR` (CR 21, Great list)
- **Epic Tier 3 Caster:** `(155 + 120 + 95) / 3 = 123 DPR` (CR 19–20, Limited) / `(195 + 155 + 125) / 3 = 158 DPR` (CR 22, Great list)
See [05_Monster_Types.md](file:///c:/Users/onbro/OneDrive/Plocha/DnD-Tracker-App/docs/AI%20Knowledge%20Base/05_Monster_Types.md) (Section 4) for detailed formulas and spell benchmarks.

#### Supported Spellcasting Formats (Examples):
1. **Innate / Per-Day with Epic Slots (e.g. Urzha):**
   ```text
   **Spellcasting.** Urzha casts one of the following spells:
   At will: Blight, Command, Counterspell, Dispel Magic, Misty Step, Shield.
   3/day each: Chain Lightning, Disintegrate, Hold Monster, Wall of Force.
   2/day each: Dominate Monster, Feeblemind, Maze, Power Word Stun.
   1/day each: Mass Polymorph, Meteor Swarm.
   Epic Tier 1 (3 slots): Catastrophe, Crown of Vermin, Reverse Magic.
   Epic Tier 2 (2 slots): Anatomy Augmentation, Bloodbane, Implosion.
   ```
2. **Wizard Slots with At-Will Base & Epic Tiers (e.g. Belial / Archmage / Librarian):**
   ```text
   **Spellcasting.** Belial is an 24th-level spellcaster (spell save DC 25, +17 to hit).
   Counterspells: The Classic, The Feint, The Mage Killer
   Cantrips (at will): Fire Bolt, Ray of Frost, Prestidigitation
   1st level (at will): Detect Magic, Identify, Shield, Magic Missile
   2nd level (at will): Hold Person, Misty Step, Invisibility
   3rd level (at will): Counterspell, Fireball, Dispel Magic, Fly
   4th level (5 slots): Greater Invisibility, Wall of Fire
   5th level (4 slots): Cone of Cold, Bigby's Hand, Wall of Force
   6th level (3 slots): Chain Lightning, Mass Suggestion
   7th level (3 slots): Teleport, Delayed Blast Fireball
   8th level (2 slots): Power Word Stun, Abi-Dalzim's Horrid Wilting
   9th level (2 slots): Time Ravage, Prismatic Wall
   Epic Tier 1 (3 slots): Antimagic Ray, Reverse Magic, Catastrophe
   Epic Tier 2 (2 slots): Caldera, Prismatic Deluge
   ```
3. **Action Economy Dual-Caster / Per-Spell Recharge (e.g. The Weirdboy):**
   ```text
   **Spellcasting — LOUDER! BIGGER!** The Weirdboy casts two spells from the list below as one action (one of any level/tier, one non-Epic ≤ 6th level; spell save DC 24, +16 to hit).
   At Will: Fly, Misty Step, Counterspell, Shield, Fireball, Lightning Bolt.
   Counterspells: The Classic, The Mage Killer, The Feint.
   3/Day Each: Chain Lightning, Disintegrate, Synaptic Static, Scatter, Reverse Gravity.
   1/Day Each: Meteor Swarm, Psychic Scream, Sonic Boom (Epic Tier 1), Caldera (Epic Tier 2), Implosion (Epic Tier 2).
   ```

### Epic Actions Structure
`src/shared/monsterEpic.ts` structures Epic Actions into a dedicated tracker:
- Section starts with `## Epic Actions`.
- The first paragraph before any `**Action.**` is stored as `Epic Action Rules` (e.g. timing: "At the end of each player character's turn...").
- Main action entries: `**Action Name (N/Round).** Description` (or `(1/Encounter)`, `(1/Day)`, `(1/Rest)`, or no limit if unlimited).
- Suboptions: Written with `### Option Name — Cost (Limit)`:
  ```markdown
  ### Divine Command — 3 Divine Favor (1/Encounter)
  Description of option...
  ```
  The parser extracts each `###` into a structured suboption with its own cost and reset limit.
- Tables inside an epic action are preserved inside the option description.
