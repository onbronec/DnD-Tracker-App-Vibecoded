# Epic Monster Design — System Rules & Knowledge Base Map

This file contains the authoritative numerical and structural assumptions for monster design in this project, as well as the map for the entire AI Knowledge Base.

---

## DnD Companion & Knowledge Base Overview

**DnD Companion** is a server-authoritative, real-time battle dashboard and DM combat tracker designed for high-level Epic 5e play (levels 20–30).

### How Monsters Exist in the Application
- **Ingestion & Parsing:** Monsters are created in Markdown format and parsed by `parseMonsterMarkdown()` into structured server state (`src/shared/monsterParser.ts`). The DM imports them via **Databases → Monsters → Import from .md** or pastes them directly into the **Monster Editor**.
- **Interactive Combat Dashboard:** The app manages and displays:
  - Active HP bars, temp HP, AC, speed, saving throws, and skills.
  - Interactive reaction counters (`maxReactions`, with multi-reaction support for elites and bosses).
  - Power resource pools (`monsterAbilities.power`) for deity favor, crystallization, or demonic points.
  - Spellcasting slots (1st–9th, Epic Tiers 1–3, At Will, Per-Day, and dedicated Counterspell trackers).
  - Usage-tracked custom features (`(Recharge 5-6)`, `(N/Day)`, `(N/Rest)`, `(N/Round)`, power costs, slot costs).
  - Structured Epic Actions with suboptions and resource costs.
  - Interactive database references (`@Condition`, `@[Spell]`, `@[Monster]`) that open modal detail cards on click.
- **Two Entity Types in the Monster Database:**
  1. **Monsters (`Entity Type: Monster`):** Living combatants with ability scores, defenses, actions, and reactions.
  2. **Non-Monster Entities (`Entity Type: Non-Monster`):** Initiative-tracked battlefield hazards, warband controllers, countdown rituals, and destructible boss anchors acting on fixed initiative count 20 without rolling.

### Knowledge Base Directory Map
External AI agents must use the documents in `docs/AI Knowledge Base/` to design monsters and encounter elements:

| File | Purpose & Contents |
| :--- | :--- |
| **`00_Epic_System_Rules.md`** | **System calibration**, Encounter Points, DPR/HP benchmarks, cosmological damage (Arcane/Righteous/Vile), power patterns, Player Epic Progression (Levels 21–30), and Epic Spell Catalogue. |
| **`01_Statblock_Template.md`** | **Authoritative Markdown template** and parser specification, header fields, auto-inferred trackers, spellcasting format, epic actions structure, and `@` database references. |
| **`02_Reference_Monsters.md`** | **Reference statblocks** illustrating calibrated designs across roles (minion, brute, controller, spellcaster, solo boss, archdevil). |
| **`03_Reusable_Chassis.md`** | **Reusable mechanical packages** (Divine/Demonic Protection, Frenzy, Divine Miracles, Too Angry to Die, and the ability pattern library). |
| **`04_Setting_and_Factions.md`** | **Campaign cosmology and lore**, Far Realm (Imateria), Seven Ancient Principles, Gruumsh, Pandemonium, and Divine Chosen mechanics. |
| **`05_Monster_Types.md`** | **Tactical roles guide** (Monster, Controller, Spellcaster, Leader, Ranged, Elite), team composition, counterplay taxonomy, and verification checklists. |
| **`06_Non_Monster_Entities.md`** | **Encounter objects guide and template**, Warband Controllers (Gruumsh Warband), battlefield hazards, rituals, and destructible boss anchors. |

---

## Encounter Points

Monsters are measured in **encounter points** rather than normal 5e CR alone.

As a default calibration:

- **1 point ≈ 150 listed HP**
- **1 point ≈ 80–100 DPR**
- A full major encounter is usually around **12 points**, roughly ±2 depending on composition and mechanics.

These are calibration targets, not rigid formulas.

A monster with unusually strong control, resurrection, damage prevention, battlefield manipulation, extreme mobility, multiple turns, or unusual death mechanics may need less listed HP or lower raw DPR than the point formula suggests.

## Typical Numerical Benchmarks

### Save DCs

- Chump / weak enemy: around **DC 19**
- Standard epic threat: around **DC 24**
- Strong boss-tier threat: around **DC 27**
- Exceptionally powerful signature abilities may exceed this when justified.

### Attack Bonuses

- Chump / weak enemy: around **+12**
- Standard epic threat: around **+16**
- Strong boss-tier attacker: around **+20**

These values should reflect the monster's role. A creature should not automatically use boss-level accuracy simply because it has many encounter points.

## Ability Scores

Epic creatures may exceed normal 5e ability-score expectations.

- Weak statistics may remain below 20.
- Important statistics commonly sit in the 20–30 range.
- Exceptionally powerful creatures may reach 30–40.

Do not inflate all six ability scores. Strong creatures should still have a profile and weaknesses unless their concept explicitly demands otherwise.

## Effective Durability

Listed HP is not the same as effective durability.

When evaluating durability, include:

- resistances and immunities;
- healing and regeneration;
- damage prevention;
- defensive resource pools;
- resurrection or additional health bars;
- special 0 HP mechanics;
- control cleansing;
- phases with defensive modifiers;
- bodyguards, anchors, shared defenses, or similar encounter systems.

A monster listed at 1,000 HP may function as a 1,400+ HP creature if its defensive systems are strong.

## Damage Budget

Estimate all meaningful damage sources, including:

- normal actions;
- extra turns;
- reactions;
- legendary or epic actions;
- bonus/free actions;
- AoE damage;
- movement-triggered damage;
- persistent zones;
- retaliation mechanics;
- summoned creatures or revived allies.

Avoid hiding large amounts of DPR inside passive movement or unavoidable side effects unless that passive damage is deliberately one of the monster's defining mechanics.

A useful rule:

> Significant damage should usually come from an explicit attack, action, ability choice, or resource expenditure.

### Spellcaster DPR & CR Calibration (Non-Epic and Epic Benchmarks)

For spellcaster monsters who rely on spellcasting rather than weapon attacks as their primary damage engine, **Expected DPR** is calculated using the **average damage per round over the first 3 rounds of combat (AVG damage per round)** using their highest available spell slots (standard 5e DMG methodology):

$$\text{DPR} = \frac{\text{Round 1 dmg} + \text{Round 2 dmg} + \text{Round 3 dmg}}{3}$$

Two spell list profiles are distinguished:
- **Limited spell list:** Single-target, defensive, utility, or crowd-control focus (e.g. *Wall of Force*, *Maze*, *Power Word Stun*, single-target attacks).
- **Great spell list:** Optimal offensive AoE damage spells (e.g. *Meteor Swarm*, *Chain Lightning*, *Cone of Cold*, *Flash Freeze*, *Caldera*), where **AoE damage is doubled** (assuming at least 2 targets fail their saving throws per 5e DMG guidelines).

#### Non-Epic Baseline:
- **Apprentice (up to 4th-level spells):**
  - **Limited spell list:** `(33 [4th] + 2 × 27 [3rd]) / 3 = 29 DPR` → **CR 4** (~0.3–0.4 Encounter Points)
  - **Great spell list:** `(49 [4th] + 2 × 42 [3rd]) / 3 = 44 DPR` → **CR 6.5** (~0.45–0.5 Encounter Points)
- **Advanced (up to 7th-level spells):**
  - **Limited spell list:** `(60.5 [7th] + 55 [6th] + 44 [5th]) / 3 = 53 DPR` → **CR 8** (~0.55–0.6 Encounter Points)
  - **Great spell list:** `(84 [7th] + 77 [6th] + 56 [5th]) / 3 = 72 DPR` → **CR 11** (~0.75–0.8 Encounter Points)
- **Master (up to 9th-level spells):**
  - **Limited spell list:** `(82.5 [9th] + 66 [8th] + 60.5 [7th]) / 3 = 70 DPR` → **CR 11** (~0.75–0.8 Encounter Points)
  - **Great spell list:** `(98 [9th] + 91 [8th] + 84 [7th]) / 3 = 91 DPR` → **CR 14** (~1.0 Encounter Point)

#### Epic Spell Calibration (Tier 1, Tier 2, Tier 3):
Epic spells scale above 9th level with a critical design principle: **they deal more damage than non-epic spells, but not drastically more** so as not to invalidate the Encounter Point budget (1 point ≈ 80–100 DPR). AoE damage is doubled (2 targets).
- **Individual Spell Benchmarks (Single / AoE Doubled):**
  - *9th-level (Non-Epic):* **82.5** / **98**
  - *Epic Tier 1:* **95** (e.g. *Crescent Cleave* 91) / **125** (e.g. *Flash Freeze* 110, *Sonic Boom* 140)
  - *Epic Tier 2:* **120** (e.g. *Prismatic Deluge* Red 120) / **155** (e.g. *Caldera* 180, *Maelstrom* 140)
  - *Epic Tier 3:* **155** (e.g. *Sphere of Ultimate Destruction* 165) / **195** (e.g. *Obliterate* 220, *Inferno* 225)
- **3-Round AVG for Epic Casters:**
  - **Epic Tier 1 Caster (Tier 1 + Tier 1 + 9th):**
    - Limited: `(95 + 95 + 82.5) / 3 =` <u>**91 DPR — CR 14**</u> *(při 3× T1: `95 DPR — CR 15`)* (~1.0 EP)
    - Great (AoE doubled): `(125 + 125 + 98) / 3 =` <u>**116 DPR — CR 18**</u> *(při 3× T1: `125 DPR — CR 20`)* (~1.25–1.3 EP)
  - **Epic Tier 2 Caster (Tier 2 + Tier 2 + Tier 1):**
    - Limited: `(120 + 120 + 95) / 3 =` <u>**112 DPR — CR 17**</u> (~1.2–1.3 EP)
    - Great (AoE doubled): `(155 + 155 + 125) / 3 =` <u>**145 DPR — CR 21**</u> (~1.5–1.6 EP)
  - **Epic Tier 3 Caster (Tier 3 + Tier 2 + Tier 1):**
    - Limited: `(155 + 120 + 95) / 3 =` <u>**123 DPR — CR 19–20**</u> (~1.35–1.4 EP)
    - Great (AoE doubled): `(195 + 155 + 125) / 3 =` <u>**158 DPR — CR 22**</u> (~1.7–1.8 EP)

*Action Economy Note (Dual-Casting):* Monsters capable of casting multiple spells per action (e.g. *The Weirdboy*) combine outputs across actions, scaling to 180–220+ DPR (2.0–2.5+ Encounter Points). See [05_Monster_Types.md](file:///c:/Users/onbro/OneDrive/Plocha/DnD-Tracker-App/docs/AI%20Knowledge%20Base/05_Monster_Types.md) (Section 4) for detailed formulas and full statblock examples.

## Multiple Turns

If a creature takes multiple turns per round, calculate its balance using the **total output across all of those turns**.

A normal boss-level Multiattack repeated two or three times can multiply DPR much faster than intended.

For multi-turn creatures, explicitly define:

- when each turn occurs;
- whether reactions refresh normally;
- which effects are once per turn versus once per round;
- when resources regenerate;
- whether phase transitions occur between turns.

## Epic Effects

This campaign distinguishes normal effects from **Epic** effects.

Epic abilities, spells, attacks, and effects may interact differently with monster defenses.

A common defensive convention is:

- a normal effect costs 1 defensive resource to negate or overcome;
- an Epic effect costs 1 additional resource.

This is a reusable convention, not a universal rule.

## Epic Damage — Cosmological Resonance

The campaign uses three Epic damage types: **Arcane**, **Righteous**, and **Vile**. Their metaphysical meaning and damage interactions are independent of Good/Evil alignment, personal morality, religious allegiance, and the damage types a creature can itself use.

- **Arcane damage** manipulates the structure of reality. It has no universal cosmological damage-doubling rule.
- **Righteous damage** expresses the power of Creation to oppose and unravel the influence of **Imateria (the Far Realm)**. It is **doubled against Imateria-Tainted creatures**.
- **Vile damage** channels the alien power of Imateria and disrupts the foundations of created existence. It is **doubled against Creation-Bound creatures**.

### Cosmological Traits

- **Creation-Bound.** A creature whose existence is anchored in the natural order of Creation. Ordinary mortals, dragons, and celestials are typical examples. A normal mortal does not need to be virtuous, faithful, or divinely blessed to be Creation-Bound.
- **Imateria-Tainted.** A creature intrinsically connected to Imateria or fundamentally altered by its power or by the Seven Ancient Principles. **Daemoni** are inherently Imateria-Tainted. Taint is an ontological property, not a moral verdict: even a benevolent creature may be Tainted, and cruelty alone does not grant this trait.

A creature can be **both**, **either**, or **neither**. If it has both traits, it takes double damage of both corresponding types. A creature's use of Righteous or Vile damage does not grant or remove either trait. Do not infer a trait solely from creature type, class, faith, or faction: make any exception or non-obvious case explicit in the statblock or relevant feature.

### Damage Resolution and Encounter Budget

Double only the **qualifying damage-type portion** of a mixed-damage attack or effect, not its other damage types. Multiple reasons to double the same portion of damage do not stack into repeated doublings; use the normal campaign/5e damage-resistance and vulnerability resolution where applicable.

In practice, Vile damage may often be doubled against a mortal player party. Budget monster DPR against the **expected targets after doubling**, rather than treating the multiplier as free extra output. Righteous damage can similarly double against Daemoni and other explicitly Imateria-Tainted enemies.

## Common Power-System Pattern

Many important creatures use a resource such as:

- Divine Favor;
- Chaos Favor;
- Crystallization;
- HP expenditure;
- deity-specific or faction-specific resources.

Prefer one central resource when possible.

Use multiple resources only when each has a clearly different gameplay purpose.

The strongest resource systems create tension between competing uses, such as:

- offense versus defense;
- survival versus escalation;
- immediate strength versus later strength;
- preventing player effects versus preserving a future phase.

## Common Defensive Chassis

A common high-level defensive resource may be spent to do one of the following:

- pass a failed saving throw;
- prevent incoming damage;
- pass an ability check;
- suppress a spell or effect preventing the creature from taking a game action.

Epic effects may require an additional expenditure.

Do not automatically give this system to every monster. It should fit the creature's theme and resource economy.

## Death and 0 HP

Epic monsters may use special defeat conditions instead of immediately dying at 0 HP.

Examples include:

- multiple health bars;
- resurrection through anchors;
- exhaustion-based death;
- divine intervention;
- transformation;
- objective-based defeat conditions.

Whenever a monster uses a nonstandard 0 HP rule, explicitly verify:

- whether it remains conscious;
- whether it can act normally;
- how damage at 0 HP works;
- whether healing works;
- what actually kills or defeats it;
- how control effects interact with the mechanic.

## Encounter Design Principle

Raw numbers are not the whole encounter budget.

The following all consume meaningful power budget:

- action denial;
- stun or similar hard control;
- large forced movement;
- anti-spell effects;
- battlefield transformation;
- extreme mobility;
- revival of allies;
- unavoidable targeting;
- large persistent AoEs;
- powerful reactions;
- effects that break normal 5e assumptions.

When in doubt, compare the monster to existing reference creatures from this project rather than only to standard 5e CR guidance.

---

# Player Characters — Epic Progression Rules (Levels 21–30)

In this campaign, player characters progress past the standard 20th-level boundary up to **Level 30**. At this tier, PCs face ancient primordials, Far Realm horrors, avatars of deities, and archfiends. The companion application enforces server-side and client-side support for these epic levels.

### 1. Ability Scores & Modifiers
- **Ability Cap:** Player ability scores can exceed the mortal ceiling of 20, reaching up to **30**.
- **Modifiers:** Calculated normally as `floor((Score - 10) / 2)` (up to **+10** at score 30).
- **Temporary Effects & Sheet Overrides:** Conditions such as *Ability Score Set/Increased/Reduced* dynamically modify sheet calculations up to the 30 cap without permanently corrupting base editor stats.

### 2. Proficiency Bonus Scale (Levels 21–30)
Proficiency bonus continues to scale into epic levels:
- **Levels 1–4:** +2
- **Levels 5–8:** +3
- **Levels 9–12:** +4
- **Levels 13–16:** +5
- **Levels 17–20:** +6
- **Levels 21–24:** **+7**
- **Levels 25–28:** **+8**
- **Levels 29–30:** **+9** (with epic boons, divine blessings, and campaign ceilings scaling up to **+10**)

This bonus applies to all proficient saving throws, skills, spell attack rolls (`proficiency + casting modifier`), and spell save DCs (`8 + proficiency + casting modifier`).

### 3. Spell Slots Progression (Levels 1–9 vs. Epic Tiers 1–3)
- **1st–9th Level Non-Epic Slots Freeze:**
  Spell slots for 1st through 9th level **do not increase** beyond 20th level. Full spellcasters freeze at the 20th-level matrix:
  `[4, 3, 3, 3, 3, 2, 2, 1, 1]` (4× 1st, 3× 2nd, 3× 3rd, 3× 4th, 3× 5th, 2× 6th, 2× 7th, 1× 8th, 1× 9th).
- **Epic Spell Slot Progression (Tiers 1–3):**
  Epic slots are unlocked starting at Level 22. In the application and server state, canonical keys are strictly `epic1`, `epic2`, and `epic3` (never prefixed with `special-` or numbered as 10/11/12):

| PC Level | Epic Tier 1 (`epic1`) | Epic Tier 2 (`epic2`) | Epic Tier 3 (`epic3`) | Total Epic Slots | Notes |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **Level 21** | 0 | 0 | 0 | 0 | Mortal cap broken; epic traits begin |
| **Level 22** | **2** | 0 | 0 | 2 | Epic Tier 1 unlocked |
| **Level 23** | **3** | 0 | 0 | 3 | Full Tier 1 reserves |
| **Level 24** | 3 | **1** | 0 | 4 | Epic Tier 2 unlocked |
| **Level 25** | 3 | **2** | 0 | 5 | Tier 2 expansion |
| **Level 26** | 3 | 2 | **1** | 6 | Epic Tier 3 unlocked (Pinnacle of magic) |
| **Level 27** | 3 | 2 | 1 | 6 | Pinnacle maintained |
| **Level 28** | 3 | 2 | 1 | 6 | Pinnacle maintained |
| **Level 29** | 3 | 2 | 1 | 6 | Pinnacle maintained |
| **Level 30** | 3 | 2 | 1 | 6 | Ultimate Mastery |

### 4. Spellbook & Prepared Spells Rules
- **Cantrips:** Always prepared and active; cast at will without taking up prepared limits.
- **Non-Epic Prepared Spells (Levels 1–9):** Count against `preparedNonEpicMax` (capped at level 20 matrix calculations).
- **Epic Prepared Spells (Tiers 1–3):** Count against `preparedEpicMax`.
- **Special / Boon Spells:** Spells granted by special items, boons, or specific racial/class features have their own independent prepared toggles without consuming preparation budget.

### 5. Multi-Reaction Architecture
High-level epic characters frequently gain access to multiple reactions per round through class capstones, epic feats, or divine gifts. The system tracks `maxReactions` and `currentReactions` as interactive checkboxes on the character sheet and combat tracker, which are automatically reset at the start of each combatant's turn.

---

# Epic Spell Tier Catalogue

This catalogue establishes **spell names, schools, ritual status, and Epic tier only**. It does not define the rules text of the spells. Do not invent missing spell effects from the name alone; request or use the actual spell reference when mechanics matter.

## Epic Tier 1

- **Unclassified:** Translocation
- **Abjuration:** Antimagic Ray; Ashran's Arcane Absorption; Demecius's Divine Intercession; Epic Contingency - Teleport; Reverse Magic
- **Conjuration:** Crown of Vermin; Venom Lance; Wall of Dissolution
- **Conjuration (ritual):** Call of the Lance; Well of Infinite Darkness
- **Divination:** Night Terror
- **Enchantment:** Dimensional Mastery; Hideous Mandate; Spell Sequencer
- **Enchantment (ritual):** Affair of Honor
- **Evocation:** Crescent Cleave; Flash Freeze; Magic Bullet; Sonic Boom
- **Evocation (ritual):** Genesis
- **Illusion:** Mortifying Apparition
- **Illusion (ritual):** Enigma Masque; Infinity Room
- **Necromancy:** Catastrophe; Spark of the Blackflame; Wave of Calamity
- **Necromancy (ritual):** Final Death
- **Transmutation:** Arboreal Metamorphosis; Hungry Fissure; Mera's Miraculous Lightning Leap; Phoenix Pyre

## Epic Tier 2

- **Abjuration:** Adjure Purity; Energy Renewal
- **Abjuration (ritual):** Arcane Embargo; Congruent Spellward; Exalted Brand of Absolution
- **Conjuration:** Maelstrom of Pandemonium; Obsidian Tombs; Planar Eviction; Ravenous Gluttony
- **Conjuration (ritual):** Feast of the Ages; Megalith
- **Divination:** Determinism; Seal Fate
- **Enchantment (ritual):** Puppeteer
- **Evocation:** Beacon of Life; Force Armor; Implosion; Prismatic Deluge
- **Evocation (ritual):** Impenetrable Force Field; Torrential Avalanche
- **Illusion (ritual):** Dematerialize; Impossible Labyrinth
- **Necromancy:** Bloodbane; Necrotic Cyst; Storm of Torment
- **Necromancy (ritual):** Army of Darkness; Heart of Pestilence; Immortal Legend
- **Transmutation:** Anatomy Augmentation; Caldera
- **Transmutation (ritual):** Kinetic Control; Temporal Stasis

## Epic Tier 3

- **Abjuration:** Entropy Scythe
- **Conjuration:** Call the Depths; Hail of Deadly Blossoms; Sphere of Ultimate Destruction
- **Conjuration (ritual):** Cast Down; Miracle
- **Divination:** Luck of Ages
- **Enchantment (ritual):** Legacy of Steel
- **Evocation:** Equinox; Inferno; Malevolent Fists of Spite; Obliterate
- **Evocation (ritual):** Apocalypse; Celestial Tempest
- **Illusion:** Dreamscape
- **Necromancy:** Soul Harvest
- **Transmutation:** Phenomenal Cosmic Power; Transmogrification; True Alchemy

---

## Canonical Damaging Epic Spells (Mechanical Reference)

The following established Epic spells provide authoritative mechanical text and damage benchmarks for encounter balance:

### Epic Tier 1
- **Flash Freeze (Tier 1 Evocation):** A 20-foot-radius sphere centered on a point within range. Creatures in the area must succeed on a Constitution saving throw or take **10d10 cold damage** (average 55) and become @Icebound. A successful saving throw halves the damage and prevents the condition. *Benchmark: 55 single / 110 AoE doubled.*
- **Catastrophe (Tier 1 Necromancy):** Melee spell attack against one creature within reach. On hit, target is wreathed in negative energy for 1 minute. When the target would regain hit points, the negative energy prevents that healing and the creature loses that many hit points instead. The effect ends once it has prevented and inverted a total of **200 hit points**. *Benchmark: ~95–100/round anti-heal value.*
- **Sonic Boom (Tier 1 Evocation):** A 60-foot-radius wave of thunderous energy centered on the caster. Other creatures in the area must succeed on a Constitution saving throw or take **20d6 thunder damage** (average 70) and be blinded and deafened until they regain at least 1 hit point from a magical effect (save halves damage and prevents conditions). In an enclosed space smaller than the 60-foot radius, it deals an additional **20d6 thunder damage** and subjects the caster to its effects. *Benchmark: 70 single / 140 AoE doubled.*
- **Crescent Cleave (Tier 1 Evocation):** Melee weapon attack using a held weapon. On hit, target takes an additional **14d12 radiant damage** (average 91). Until the end of your turn, you may repeat this attack against a different creature within reach, up to a maximum number of creatures equal to your spellcasting ability modifier. *Benchmark: 91 single / 180+ multi-target sequence.*

### Epic Tier 2
- **Caldera (Tier 2 Transmutation):** Ten 10-foot cubes of molten lava (difficult terrain). A creature that enters the area for the first time on a turn or starts its turn there takes **20d8 fire damage** (average 90) and must make a Constitution saving throw or be incapacitated until the start of its next turn (save halves and prevents condition). While concentrating, damage increases by **2d8** each turn (max **40d8**) and two additional 10-foot cubes of lava are added. *Benchmark: 90 single / 180 AoE doubled.*
- **Prismatic Deluge (Tier 2 Evocation):** 150-foot-radius, 10-foot-tall cylinder cloud. On cast and as an action each turn, rain down up to 2 colored globes into separate 15-foot cubes:
  - *Red:* Dex save or **120 fire damage** (half on save). Objects take triple damage.
  - *Orange:* Dex save or **80 acid damage** (objects triple damage).
  - *Yellow:* Dex save or **40 lightning damage** and @Stunned until end of next turn.
  - *Green:* Con save or **80 poison damage** and @Poisoned for duration.
  - *Blue:* Con save or **80 cold damage** and speed reduced to 0 until end of next turn.
  - *Indigo:* Con save or @Restrained; 3 total failed Con saves petrifies (@Petrified).
  - *Violet:* Wis save or slowed (speed halved, no bonus actions or reactions).
  *Benchmark: 120 single / 200–240 AoE combination.*
- **Maelstrom of Pandemonium (Tier 2 Conjuration):** 30-foot-radius, 1-mile-high cyclone (moves up to 120 ft as an action). Sucks up Huge or smaller unsecured objects. When a creature enters or starts its turn there: Strength saving throw or become restrained, take **70 (20d6) slashing damage**, and be drawn 100 feet up into the air (save halves damage and prevents restrained). Objects take **120 slashing damage** each turn. Restrained creature can escape with DC Strength (Athletics) or Dexterity (Acrobatics) check. *Benchmark: 70 single / 140 AoE doubled.*

### Epic Tier 3
- **Sphere of Ultimate Destruction (Tier 3 Conjuration):** 5-foot-diameter sphere of destructive emptiness (moves up to 60 ft as a bonus action). When a creature, object, or structure comes into contact with the sphere for the first time in a round, it takes **30d10 force damage** (average 165; Con save halves). Anything reduced to 0 HP is instantly and totally destroyed. Disintegrates legendary or lower magic items after full duration contact. *Benchmark: 165 single force.*
- **Obliterate (Tier 3 Evocation):** Conjures a sphere of destructive force in hand. Action each turn can charge +**20d10 force damage**. Action to unleash in a 15-foot-wide line of infinite length dealing **40d10 force damage** (average 220) + 20d10 per charge. *Benchmark: 195–220 effective encounter output.*
- **Inferno (Tier 3 Evocation):** 500-foot-long, 15-foot-wide line of pure lava. Creatures, objects, and structures take **50d8 hellfire damage** (average 225) and must succeed on a Dexterity save or be coated in molten lava for 1 minute (taking **10d8 hellfire damage** [average 45] at the start of each of their turns). Submerging completely in water removes the coating. *Benchmark: 195–225 effective encounter output.*
