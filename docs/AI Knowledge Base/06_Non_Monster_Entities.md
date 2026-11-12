# Non-Monster Entities — Encounter Objects, Warbands, Hazards & Objectives

This document defines **Non-Monster Entities** in DnD Companion. An external AI agent designing encounters or tactical challenges must use these rules whenever creating battlefield objects, warbands, lair controllers, environmental hazards, rituals, or destructible boss anchors.

---

## 1. What is a Non-Monster Entity?

In DnD Companion, not every combatant in the initiative line is an individual living monster.

A **Non-Monster Entity** is an initiative-tracked object, controller, or environmental system that:

1. **Acts on a Fixed Initiative count** (by default initiative count 20). It never rolls for initiative.
2. **Takes turns in the initiative order**, allowing the DM to trigger persistent effects, faction actions, environmental hazards, or countdown stages predictably.
3. **Has Tracked Abilities**, using the exact same usage trackers as monsters (`(1/Round)`, `(3/Day)`, `(Recharge 5-6)`, or resource costs like `costs 1 favor`).
4. **May be Indestructible or Destructible**:
   - **Indestructible** (`**Has HP/AC:** no`): Abstract controllers, environmental conditions, weather, or warband commanders that persist until specific encounter conditions are met.
   - **Destructible** (`**Has HP/AC:** yes`): Physical objects like pylons, soul crystals, ritual altars, siege engines, or siege barriers with explicit AC, HP, damage resistances, and condition immunities.

---

## 2. Four Core Archetypes

### Archetype A: Warband Controller
A Warband Controller represents the collective coordination, morale, and divine momentum of a group of minions or followers (e.g. Followers of Gruumsh, Undead Legions, Cultists of Set).

- **Shared Resource Pool:** The warband tracks a single central power resource (e.g. *Gruumsh's Favor*, *Necrotic Essence*) shared by all participating followers.
- **Off-Turn Coordination:** Instead of making individual chumps complex, the warband object spends power to command minions to reposition, make reactive attacks, or break defensive lines.
- **Revival & Momentum:** Warbands often feature resurrection mechanics (e.g. raising fallen minions at half HP) or focus-fire mechanics (e.g. designating a "Hunter" and "Prey").
- **Deactivation Condition:** The warband controller explicitly stops functioning when fewer than a threshold of conscious followers remain (e.g. "Stops functioning while fewer than two conscious Followers remain").

### Archetype B: Battlefield Hazard / Environmental Controller
An Environmental Controller automates dynamic lair hazards, collapsing terrain, wild magic surges, lava flows, or planar anomalies.

- **Fixed Trigger:** Operates on initiative count 20 (or a specified count), forcing saving throws or altering the battlefield grid.
- **Dynamic Escalation:** May intensify each round or react to player actions.
- **Predictable Counterplay:** Players can predict the timing, allowing them to reposition, manipulate enemy positioning into hazard zones, or use spells to suppress the hazard.

### Archetype C: Ritual / Objective Controller
A countdown or summoning ritual that creates urgency beyond "kill all enemies."

- **Round-by-Round Progression:** Tracks progress via usage boxes or stages (e.g. Stage 1 to Stage 4).
- **Disruption Conditions:** Explicitly defines how player characters can interact with it (e.g. Arcana checks, physical damage, channeling counter-magic, killing ritualists).

### Archetype D: Destructible Pylon / Conduit / Anchor
A physical anchor or focus that empowers a boss monster (e.g. providing damage immunity, regeneration, or phase shielding) until destroyed.

- **Explicit HP and AC:** Defined with `**Has HP/AC:** yes`, `**Armor Class:** 16`, `**Hit Points:** 80`.
- **Defensive Profile:** Typically immune to psychic, poison, and status conditions; may have damage thresholds or specific damage vulnerabilities/resistances.
- **Boss Link:** Explains exactly what happens to the linked boss or encounter when the anchor is shattered.

---

## 3. Markdown Statblock Template for Non-Monsters

When generating a Non-Monster statblock, use the exact format below:

```markdown
# [Entity Name]

**Entity Type:** Non-Monster
**Fixed Initiative:** [20]
**Has HP/AC:** [no]
**Encounter Points:** [0.1]
**Expected DPR:** [0]
**Type:** [encounter object / warband controller / battlefield hazard / ritual]

## Protective Traits

**Object Rule.** Describe any persistent protection, immunity, or deactivation conditions (e.g. when the object stops functioning).

## Regular Traits

**Activation & Resource Pool.** Describe how the object enters the fight, its starting power pool, and how it gains or resets charges.

## Actions

**Tracked Command (1/Round).** Describe a once-per-round action or command.

**Resource Command.** This action costs 1 power point to use. Describe what happens when power is expended.

## Reactions

**Triggered Event.** Describe any reactive trigger (if applicable).
```

### Optional Destructible Object Fields

If the object can be targeted and attacked, set `**Has HP/AC:** yes` and provide AC and HP:

```markdown
**Has HP/AC:** yes
**Armor Class:** [16] ([material description, e.g. reinforced obsidian])
**Hit Points:** [75]
**Damage Resistances:** [piercing, slashing]
**Damage Immunities:** [poison, psychic, necrotic]
**Condition Immunities:** [all conditions]
```

---

## 4. Parser and App Behavior

- **`**Entity Type:** Non-Monster`**: Automatically configures the app to treat this entry as an encounter object rather than a regular creature.
- **`**Fixed Initiative:** [20]`**: Bypasses initiative rolls. The combat tracker places the object at this exact initiative count automatically.
- **`**Has HP/AC:** no`**: Hides the HP bar and AC badge on the combat card, leaving a clean action/resource dashboard.
- **`**Encounter Points:** [0.1]`**: Budgeted into the Encounter Planner. Most pure controller objects cost between 0.1 and 0.5 points. If the object deals significant direct damage, budget it at 1 point per 80–100 DPR.
- **Trackers & Power Costs:**
  - `(1/Round)` creates a single use box that resets at the start of the object's turn.
  - Phrasing such as `costs 1 favor`, `costs 2 power`, `spend 1 divine favor` automatically wires up the app's power tracker.
- **Database References:** Use `@Condition` (e.g. `@Prone`, `@Stunned`) and `@[Spell Name]` (e.g. `@[Dispel Magic]`) in descriptions for interactive clickable popups.

---

## 5. Reference Non-Monster Statblocks

### Reference 1: Gruumsh Warband (Warband Controller)

The flagship Warband Controller. Coordinates Followers of Gruumsh, manages shared divine favor, directs focus-fire Hunts, and raises fallen warriors.

```markdown
# Gruumsh Warband

**Entity Type:** Non-Monster
**Fixed Initiative:** 20
**Has HP/AC:** no
**Encounter Points:** 0.1
**Expected DPR:** 0
**Type:** encounter object
**Group:** Gruumsh Warband

## Protective Traits

**Gruumsh's Protection.** This feature costs 1 favor to use. When two or more conscious Followers of Gruumsh are affected by the same spell, ability, or other effect, the Warband may invoke Gruumsh's Protection. Against a non-Epic effect, all affected followers automatically succeed on saving throws caused by the effect, prevent all damage from it, and ignore any conditions or other effects it would impose. Against an Epic effect, all affected followers instead automatically succeed on their saving throws and take half damage; any effect that normally occurs on a successful save still occurs.

## Regular Traits

**Warband.** Add this object once to an encounter containing at least two conscious Followers of Gruumsh. All such creatures share the same Gruumsh's Favor power pool. The Warband stops functioning while fewer than two conscious Followers remain.

**Strength in Numbers.** At the beginning of combat, the Warband gains 1 point of Gruumsh's Favor for every four Followers of Gruumsh participating in the encounter, rounded up. Its maximum Gruumsh's Favor equals this starting amount + 2.

**Hunt Passes With Blood.** A Hunter that successfully Draws Blood cannot be selected as the Hunter during the next Hunt. If the Hunter fails to Draw Blood, it may be selected again normally.

**Defiance Draws His Eye (1/Round).** When a creature other than the Prey directly prevents the Hunter from reaching, attacking, or damaging the Prey, that creature may choose to become the new Prey.

**Hunt Turn.** On initiative count 10, if a Hunt is active, the Hunter takes a special Hunt Turn. It may move up to its speed and make one melee weapon attack against the Prey.

**Draw Blood.** If the Hunter deals melee weapon damage to the Prey during its Hunt Turn, the Hunt succeeds. The Warband gains 1 point of Gruumsh's Favor and the Hunt ends.

## Actions

**Gruumsh's Gaze (1/Round).** Choose one conscious Follower of Gruumsh as the Hunter and one hostile creature as the Prey. Any previous Hunt ends. Until the Hunt ends, the Hunter knows the direction and distance to the Prey while both are on the same plane, its movement speed is doubled while moving toward the Prey, and it has advantage on melee attack rolls against the Prey.

**War Without End.** This action costs 1 favor to use. Choose up to three dead Followers of Gruumsh worth no more than 2 encounter points in total. Each returns to life with half its maximum Hit Points, stands up, and may immediately move up to half its speed.

**Blood Frenzy.** This action costs 1 favor to use. Choose up to three Followers of Gruumsh. Each may immediately move up to its speed and make one melee weapon attack.

**Unbreakable Horde.** This action costs 1 favor to use. Choose up to four Followers of Gruumsh. Each ends one non-Epic condition, spell, or other effect currently affecting it, then may move up to half its speed without provoking opportunity attacks.

**Break Their Line.** This action costs 1 favor to use. Choose up to four Followers of Gruumsh. Each may immediately move up to its speed without provoking opportunity attacks, then may Shove, Grapple, or use one attack or ability whose primary purpose is to knock a creature @Prone, Grapple it, or forcibly move it.
```

---

### Reference 2: Soul Pylon of the Archpriest (Destructible Boss Anchor)

A physical anchor that shields a boss from permanent defeat and radiates necrotic suppression.

```markdown
# Soul Pylon of the Archpriest

**Entity Type:** Non-Monster
**Fixed Initiative:** 20
**Has HP/AC:** yes
**Armor Class:** 17 (infused gloomstone)
**Hit Points:** 80
**Encounter Points:** 0.3
**Expected DPR:** 15
**Type:** encounter object (anchor)
**Damage Resistances:** bludgeoning, piercing, and slashing from nonmagical attacks
**Damage Immunities:** poison, psychic, necrotic
**Condition Immunities:** @Charmed, @Frightened, @Paralyzed, @Petrified, @Poisoned, @Prone, @Stunned, @Unconscious

## Protective Traits

**Veiled Invulnerability.** While the Archpriest is above 0 Hit Points, the Soul Pylon is shielded by a barrier of divine light and cannot take damage or be targeted by hostile effects. The moment the Archpriest is reduced to 0 Hit Points, the barrier shatters and the Pylon becomes vulnerable.

## Regular Traits

**Life Conduit.** While this Pylon exists, if the Archpriest starts its turn at 0 Hit Points, it absorbs life energy from the Pylon: the Archpriest regains 150 Hit Points, and this Pylon takes 30 necrotic damage. When all active Pylons are destroyed, the Archpriest can finally be permanently defeated.

## Actions

**Soul Pulse (1/Round).** Waves of dark energy radiate in a 30-foot aura. Each hostile creature in the area must make a DC 22 Constitution saving throw, taking 22 (4d10) necrotic damage on a failed save, or half as much on a successful one. A creature that fails this save cannot regain Hit Points until the end of its next turn.
```

---

### Reference 3: Infernal Crucible (Environmental Hazard)

A dynamic battlefield hazard that alters terrain and punishes static positioning on count 20.

```markdown
# Infernal Crucible

**Entity Type:** Non-Monster
**Fixed Initiative:** 20
**Has HP/AC:** no
**Encounter Points:** 0.5
**Expected DPR:** 40
**Type:** battlefield hazard

## Regular Traits

**Rupture Points.** The DM places three 15-foot radius Rupture Zones on the battlefield. At the start of the encounter, the zones are dormant.

## Actions

**Magma Surge (1/Round).** On initiative count 20, magma erupts from one dormant or active Rupture Zone chosen by the DM or determined randomly:
- The zone becomes active lava terrain for 2 rounds. Entering the zone or starting a turn there deals 35 (10d6) fire damage.
- Any creature standing in the zone when it erupts must succeed on a DC 24 Dexterity saving throw or take 45 (10d8) fire damage and be knocked @Prone.

**Tectonic Quake (Recharge 5-6).** The entire cavern shudders. Every creature touching the ground must succeed on a DC 23 Strength saving throw or fall @Prone. Concentrating spellcasters must make a DC 23 Constitution saving throw to maintain concentration.
```
