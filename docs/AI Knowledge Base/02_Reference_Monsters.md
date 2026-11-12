# Reference Monsters

These statblocks are canonical examples of successful designs from the campaign.

They are **reference material, not mandatory templates**.

When using them, identify the principle that makes the creature work rather than copying mechanics blindly. All statblocks below use the DnD Companion Markdown format, including interactive database references (`@Condition`, `@[Spell]`), tracked resource phrasing, and standard headers.

---

# Zealot

A simple low-ranking enemy showing how a small defensive resource can make a fragile creature relevant in an epic encounter without inflating its raw hit points.

**Size:** Medium  
**Type:** humanoid (cultist)  
**Group:** Cult of Set  
**Entity Type:** Monster  
**Encounter Points:** 0.5  
**Expected DPR:** 40  
**Armor Class:** 13  
**Hit Points:** 50  
**Speed:** 30 ft.  
**Saving Throws:** Wis +11, Cha +10  
**Skills:** Religion +9, Perception +11  
**Senses:** passive Perception 21  
**Languages:** Common  
**Challenge:** 6  
**Proficiency:** +4  
**Max Reactions:** 1  

| STR | DEX | CON | INT | WIS | CHA |
| --- | --- | --- | --- | --- | --- |
| 11 (+0) | 14 (+2) | 12 (+1) | 10 (+0) | 14 (+2) | 13 (+1) |

## Protective Traits

**Divine Protection (2/Rest).** The Zealot can spend one charge to:
- pass a failed saving throw;
- prevent damage it was about to take;
- pass an ability check;
- suppress a spell or effect preventing it from taking a game action.

Epic effects cost one additional charge.

## Regular Traits

**Devoted Follower.** The Zealot uses the proficiency bonus of its archpriest (+9) for saving throws and attack rolls.

## Actions

**Pact Blade.** *Melee Weapon Attack:* +11 to hit, reach 5 ft., one target. *Hit:* 10 (3d4 + 2) piercing damage plus 25 (6d8) radiant damage.

**Divine Bolt.** *Ranged Weapon Attack:* +11 to hit, range 120 ft., one target. *Hit:* 30 (6d8 + 2) radiant damage.

### Design Principle

A small, high-agency defensive pool (2 charges) forces players to spend actions stripping protection rather than vaporizing minions with casual AoE spells.

---

# Shade of Set

A one-point spirit using its own Hit Points as a defensive resource, demonstrating high lethality paired with self-expending durability.

**Size:** Medium  
**Type:** undead  
**Group:** Cult of Set  
**Entity Type:** Monster  
**Encounter Points:** 1.0  
**Expected DPR:** 80  
**Armor Class:** 18  
**Hit Points:** 150  
**Speed:** 30 ft., fly 60 ft.  
**Saving Throws:** Dex +8, Wis +6  
**Skills:** Stealth +12, Perception +6  
**Damage Resistances:** acid, cold, fire, lightning; bludgeoning, piercing, and slashing from nonmagical attacks  
**Damage Immunities:** necrotic, poison  
**Condition Immunities:** @Charmed, @Exhaustion, @Grappled, @Paralyzed, @Petrified, @Poisoned, @Prone, @Restrained  
**Senses:** darkvision 120 ft., passive Perception 16  
**Languages:** Common, Infernal  
**Challenge:** 9  
**Proficiency:** +4  
**Max Reactions:** 1  

| STR | DEX | CON | INT | WIS | CHA |
| --- | --- | --- | --- | --- | --- |
| 8 (-1) | 19 (+4) | 16 (+3) | 12 (+1) | 14 (+2) | 16 (+3) |

## Defensive Traits

**Ward of the Sands.** The Shade takes 40 damage to:
- pass a failed saving throw;
- prevent incoming damage from an attack or area effect;
- pass an ability check;
- suppress a spell or condition preventing it from taking a game action.

Epic effects cost an additional 40 HP. This self-damage cannot be reduced or prevented.

## Regular Traits

**Incorporeal Movement.** The Shade can move through other creatures and objects as difficult terrain. It takes 5 force damage if it ends its turn inside an object.

## Actions

**Spectral Blade.** *Melee Weapon Attack:* +8 to hit, reach 10 ft., one target. The target gains no benefit from armor or magic items. Physical armor instead provides base AC 10 + Dexterity modifier. *Hit:* 80 necrotic damage, and the target's maximum Hit Points are reduced by 20 until it finishes a long rest.

### Design Principle

A defensive resource does not need to be a separate token pool. Spending Hit Points directly unifies offense, defense, and defeat pressure without tracking extra counters.

---

# Cassiel — Fallen Archangel

A six-point fallen archangel demonstrating a self-escalating defensive resource, escalating penalty thresholds, and high battlefield mobility.

**Size:** Large  
**Type:** celestial (fallen)  
**Group:** Celestials  
**Entity Type:** Monster  
**Encounter Points:** 6.0  
**Expected DPR:** 160  
**Armor Class:** 23 (natural armor; 26 while Crystallization is 1+)  
**Hit Points:** 900  
**Speed:** 50 ft., fly 150 ft.  
**Saving Throws:** Str +18, Con +18, Wis +17, Cha +15  
**Skills:** Perception +17, Athletics +18, Insight +17  
**Damage Resistances:** radiant, necrotic; bludgeoning, piercing, and slashing from nonmagical attacks  
**Damage Immunities:** poison  
**Condition Immunities:** @Charmed, @Exhaustion, @Frightened, @Poisoned  
**Senses:** truesight 120 ft., passive Perception 27  
**Languages:** all, telepathy 120 ft.  
**Challenge:** 30  
**Proficiency:** +8  
**Max Reactions:** 2  

| STR | DEX | CON | INT | WIS | CHA |
| --- | --- | --- | --- | --- | --- |
| 30 (+10) | 16 (+3) | 30 (+10) | 16 (+3) | 28 (+9) | 24 (+7) |

## Protective Traits

**Plague of the Ancients (Crystallization).** Cassiel tracks a power resource called Crystallization (starts at 0, maximum 7):
- **1+:** AC increases by 3 (to 26).
- **3+:** Speed is halved; advantage on all d20 rolls.
- **5+:** Gaze of Judgment DC increases by 3.
- **7:** Cassiel becomes permanently @Petrified in pure divine crystal; this is a deific effect.

**Crystalic Protection.** This feature costs 1 crystallization to use. Cassiel advances Crystallization by 1 point to:
- pass a failed saving throw;
- prevent damage from one attack or effect;
- pass an ability check;
- suppress an action-preventing condition or spell.

Epic effects advance Crystallization by 2 points.

## Regular Traits

**Gaze of Judgment.** At the start of Cassiel's turn, each hostile creature that can see him must choose: either face its crimes and take 28 (8d6) psychic damage, or avert its eyes and have disadvantage on attack rolls against Cassiel until the start of its next turn.

## Actions

**Multiattack.** Cassiel makes two Angelic Lance attacks and one Shield Slam.

**Angelic Lance.** *Melee Weapon Attack:* +18 to hit, reach 30 ft., one target. *Hit:* 50 (8d8 + 10) piercing damage. If the attack roll exceeds the target's AC by 5 or more, the hit becomes a critical hit.

**Shield Slam.** *Melee Weapon Attack:* +18 to hit, reach 10 ft., one target. *Hit:* 55 (10d8 + 10) bludgeoning damage. The target must succeed on a DC 25 Strength saving throw or be thrown 50 feet away and knocked @Prone.

## Bonus Actions

**Heavenly Reposition (3/Day).** Cassiel flies up to his fly speed without provoking opportunity attacks.

## Reactions

**Crystal Deflection (1/Round).** When hit by a ranged attack or targeted by a spell, Cassiel adds 4 to his AC or saving throw against that effect.

### Design Principle

The same resource can be defensive and self-destructive. A protection system becomes deeply engaging when every defensive activation pushes the boss closer to a fatal petrification threshold.

---

# Archpriest

An eight-point high-tier boss using encounter-wide Epic Actions, Divine Favor expenditure, and an objective-anchored defeat condition.

**Size:** Medium  
**Type:** humanoid (cleric)  
**Group:** Cult of Set  
**Entity Type:** Monster  
**Encounter Points:** 8.0  
**Expected DPR:** 240  
**Armor Class:** 22 (divine plate)  
**Hit Points:** 500 per health bar (2 bars; 1,000 total)  
**Speed:** 50 ft.  
**Saving Throws:** Str +11, Dex +14, Con +16, Wis +17, Cha +12  
**Skills:** Religion +20, Perception +17, Insight +17  
**Damage Resistances:** necrotic, radiant; bludgeoning, piercing, and slashing from nonmagical attacks  
**Condition Immunities:** @Charmed, @Frightened, @Poisoned  
**Senses:** truesight 60 ft., darkvision 120 ft., passive Perception 27  
**Languages:** Celestial, Common, Infernal  
**Challenge:** 30  
**Proficiency:** +8  
**Max Reactions:** 2  

| STR | DEX | CON | INT | WIS | CHA |
| --- | --- | --- | --- | --- | --- |
| 17 (+3) | 23 (+6) | 26 (+8) | 18 (+4) | 27 (+8) | 19 (+4) |

## Protective Traits

**Divine Favor (Power Pool — 6 Points).** The Archpriest tracks a power pool called Divine Favor. It starts with 4 Favor and has a maximum of 6. It gains 1 Favor whenever it scores a critical hit, reduces an enemy to 0 HP, or when an allied follower dies.

**Deific Resistance.** This feature costs 1 favor to use. The Archpriest spends 1 Divine Favor to pass a failed saving throw or end one condition affecting it. Against an Epic effect, this costs 2 Divine Favor.

**Divine Anchors.** The Archpriest does not die at 0 Hit Points. While any of its three Soul Pylons remain intact on the battlefield, reducing the Archpriest to 0 HP causes it to enter a dormant state until the start of its next turn, at which point it regains 250 Hit Points. When all Soul Pylons are destroyed, reducing the Archpriest to 0 HP defeats it permanently.

## Regular Traits

**Spellcasting.** The Archpriest is an 18th-level spellcaster. Its spellcasting ability is Wisdom (spell save DC 25, +17 to hit with spell attacks).

Cantrips (at will): Sacred Flame, Toll the Dead
1st level (4 slots): Shield, Guiding Bolt
2nd level (3 slots): Hold Person, Spiritual Weapon
3rd level (3 slots): Counterspell, Dispel Magic
4th level (3 slots): Banishment, Guardian of Faith
5th level (3 slots): Flame Strike, Holy Weapon
6th level (2 slots): Harm, Heal
7th level (2 slots): Divine Word
8th level (1 slot): Holy Aura
Epic Tier 1 (2 slots): Demecius's Divine Intercession, Wave of Calamity
Counterspells: Counterspell, The Classic

## Actions

**Multiattack.** The Archpriest makes two Scepter strikes.

**Sun-Shatter Scepter.** *Melee Weapon Attack:* +17 to hit, reach 5 ft., one target. *Hit:* 20 (3d8 + 7) bludgeoning plus 36 (8d8) radiant damage.

## Epic Actions

At the end of each player character's turn, the Archpriest can take one Epic Action.

**Godly Trial (2/Round).** The Archpriest targets one creature within 90 feet. The target must make a DC 25 saving throw of the Archpriest's choice (Dexterity, Constitution, or Wisdom). The target takes 45 (10d8) radiant or necrotic damage on a failed save, or half as much on a successful one.

**Divine Step.** The Archpriest teleports up to 40 feet to an unoccupied space it can see. This action has no round use limit.

**Divine Intervention (2/Round).** The Archpriest expends Divine Favor to invoke one of the following options:

### Touch of Judgment — 1 Divine Favor
The Archpriest makes one Sun-Shatter Scepter attack against a target within reach. On a hit, the target must also succeed on a DC 25 Constitution saving throw or be @Stunned until the end of its next turn.

### Miracle of Restoration — 2 Divine Favor (1/Encounter)
The Archpriest cleanses all non-Epic conditions affecting itself and regains 100 Hit Points.

### Divine Wrath — 3 Divine Favor (1/Encounter)
The Archpriest casts @[Wave of Calamity] *(Epic Tier 1)* without expending a spell slot.

### Design Principle

High-level solo bosses survive through objective infrastructure (pylons/anchors) and a flexible Epic Action economy, distributing pressure evenly across all player turns rather than taking one overwhelming turn.

---

# Gruumsh Battle Cultist

A 0.5-point frontline follower designed to become tactically threatening through warband coordination rather than individual bloat.

**Size:** Medium  
**Type:** humanoid (orc)  
**Group:** Gruumsh Warband  
**Entity Type:** Monster  
**Encounter Points:** 0.5  
**Expected DPR:** 40  
**Armor Class:** 19 (splint, shield)  
**Hit Points:** 50  
**Speed:** 30 ft.  
**Saving Throws:** Str +12, Con +10, Wis +8  
**Skills:** Athletics +12, Intimidation +7, Perception +8  
**Senses:** darkvision 60 ft., passive Perception 18  
**Languages:** Common, Orc  
**Challenge:** 8  
**Proficiency:** +6  
**Max Reactions:** 1  

| STR | DEX | CON | INT | WIS | CHA |
| --- | --- | --- | --- | --- | --- |
| 22 (+6) | 12 (+1) | 18 (+4) | 9 (-1) | 14 (+2) | 12 (+1) |

## Regular Traits

**Follower of Gruumsh.** The cultist participates in Gruumsh Warband mechanics. It shares the warband's Gruumsh's Favor pool and can be chosen as the Hunter.

**Hold the Line.** The cultist has advantage on checks and saving throws to resist being moved or knocked @Prone while wielding its shield.

## Actions

**Multiattack.** The cultist makes two attacks: one with its War Spear and one with its Shield Bash.

**War Spear.** *Melee Weapon Attack:* +12 to hit, reach 10 ft., one target. *Hit:* 25 (3d10 + 6) piercing damage.

**Shield Bash.** *Melee Weapon Attack:* +12 to hit, reach 5 ft., one target. *Hit:* 15 (2d8 + 6) bludgeoning damage. If the target is Large or smaller, it must succeed on a DC 20 Strength saving throw or be pushed 15 feet away or knocked @Prone.

### Design Principle

A faction-level warband controller carries the tactical complexity, keeping individual minions fast to run and low in HP while maintaining genuine battlefield presence.

---

# Chosen Rider of Gruumsh

A four-point mobile mounted Chosen interacting with the warband Hunt system and multi-stage Divine Miracles.

**Size:** Huge  
**Type:** humanoid (orc, chosen)  
**Group:** Gruumsh Warband  
**Entity Type:** Monster  
**Encounter Points:** 4.0  
**Expected DPR:** 270  
**Armor Class:** 23 (plate of the All-Father)  
**Hit Points:** 350 per health bar (2 bars; 700 total)  
**Speed:** 60 ft.  
**Saving Throws:** Str +18, Dex +12, Con +17, Wis +15  
**Skills:** Athletics +18, Perception +15, Survival +15  
**Damage Resistances:** bludgeoning, piercing, and slashing from nonmagical attacks  
**Condition Immunities:** @Charmed, @Frightened, @Poisoned  
**Senses:** darkvision 120 ft., passive Perception 25  
**Languages:** Common, Orc  
**Challenge:** 30  
**Proficiency:** +8  
**Max Reactions:** 2  

| STR | DEX | CON | INT | WIS | CHA |
| --- | --- | --- | --- | --- | --- |
| 30 (+10) | 18 (+4) | 28 (+9) | 14 (+2) | 24 (+7) | 22 (+6) |

## Protective Traits

**Follower of Gruumsh.** The Chosen participates in Gruumsh Warband mechanics.

**Divine Miracle (Gruumsh).** When the Chosen is reduced to 0 Hit Points for the first time, Gruumsh intervenes:
- The Chosen does not die; its second health bar (350 HP) activates immediately.
- All non-Epic conditions affecting the Chosen end instantly.
- The Chosen immediately makes one Impaling Spear attack against the current Prey.

## Regular Traits

**Chosen and Sacred Mount.** Rider and mount share statistics, movement, and initiative. Area effects hitting both resolve only once.

## Actions

**Multiattack.** The Chosen makes three Impaling Spear attacks.

**Impaling Spear.** *Melee Weapon Attack:* +18 to hit, reach 15 ft., one target. *Hit:* 90 (12d10 + 10) piercing damage. If the target is the current Prey, the Chosen may also push it 30 feet, drag it 30 feet adjacent to the Chosen, or knock it @Prone.

**Break the Formation (Recharge 5-6).** The Chosen charges up to 60 feet in a straight line, passing through hostile spaces without provoking opportunity attacks. Each creature in its path must make a DC 25 Dexterity saving throw, taking 65 (10d10 + 10) bludgeoning damage and being knocked @Prone on a failure, or half damage on a success.

## Reactions

**Cruel Intervention.** When a creature other than the Prey damages the Chosen or hinders its movement toward the Prey, the Chosen can move up to 30 feet toward that creature and make one Impaling Spear attack against it.

### Design Principle

A boss interacting with a faction system transforms that system into its personal weapon. The Chosen turns the Warband Hunt into lethal pursuit and displacement.

---

# Pandemonium Ravager

An eight-point solo chaotic demon whose combat rhythm escalates from violence into a devastating Murderous Rampage phase.

**Size:** Gargantuan  
**Type:** fiend (demon)  
**Group:** Pandemonium  
**Entity Type:** Monster  
**Encounter Points:** 8.0  
**Expected DPR:** 300  
**Armor Class:** 24 (chitinous plate)  
**Hit Points:** 1000  
**Speed:** 50 ft.  
**Saving Throws:** Str +21, Con +20, Wis +14, Cha +16  
**Skills:** Athletics +21, Perception +14, Intimidation +16  
**Damage Resistances:** cold, fire, lightning  
**Damage Immunities:** poison; bludgeoning, piercing, and slashing from nonmagical attacks  
**Condition Immunities:** @Charmed, @Frightened, @Poisoned  
**Senses:** truesight 120 ft., tremorsense 60 ft., passive Perception 24  
**Languages:** Abyssal, telepathy 120 ft.  
**Challenge:** 35  
**Proficiency:** +9  
**Max Reactions:** 2  

| STR | DEX | CON | INT | WIS | CHA |
| --- | --- | --- | --- | --- | --- |
| 34 (+12) | 16 (+3) | 32 (+11) | 12 (+1) | 20 (+5) | 24 (+7) |

## Protective Traits

**Chaos Favor (Power Pool — 10 Points).** The Ravager starts combat with 2 Favor and has a maximum of 10. Favor powers both Demonic Protection and Murderous Rampage abilities. At 0 Favor, the Ravager has disadvantage on all d20 rolls.

**Demonic Protection.** This feature costs 1 favor to use. The Ravager spends 1 Chaos Favor to pass a failed save, prevent damage, or suppress an action-preventing effect. Epic effects cost 2 Chaos Favor.

**Too Angry to Die.** At 0 Hit Points, the Ravager does not die or fall unconscious. While at 0 HP, taking damage forces a DC 20 Constitution saving throw (or half damage taken, whichever is higher); on a failed save, the Ravager suffers 1 level of @Exhaustion. It dies only when reaching 6 levels of Exhaustion.

## Regular Traits

**Frenzy.** The Ravager takes two turns per round: one on its rolled initiative, and one at initiative minus 10.

**Cycle of Violence.** The Ravager cycles through Spent, Bloodheat, and Murderous Rampage:
- **Spent:** Lasts 1 turn; speed halved, cannot gain Favor.
- **Bloodheat:** Generates 1 Favor from successful melee hits, critical hits, and taking 100+ damage in a single turn.
- **Murderous Rampage:** Begins at 7+ Favor. Disables further Favor gain, unlocks rampaging actions, and ends when Favor reaches 2 or less.

**Unstoppable Mass.** The Ravager can move through Huge or smaller creatures, pushing them aside. It deals no passive movement damage.

## Actions

**Multiattack.** The Ravager makes three Titanic Cleaver attacks, or two Cleaver attacks and one Seize.

**Titanic Cleaver.** *Melee Weapon Attack:* +21 to hit, reach 20 ft., one target. *Hit:* 105 (14d10 + 12) slashing damage.

**Seize.** *Melee Weapon Attack:* +21 to hit, reach 15 ft., one Large or smaller creature. *Hit:* 70 (8d12 + 12) bludgeoning damage and the target is @Grappled and @Restrained (escape DC 25).

**Hurl.** *Ranged Weapon Attack:* +21 to hit, range 60/120 ft., one grappled creature. *Hit:* 100 (16d10 + 12) bludgeoning damage to both the thrown creature and the target.

**Stampede (Recharge 5-6).** The Ravager tramples across the battlefield in a 60-foot line. Each creature in the area must make a DC 25 Dexterity saving throw, taking 80 (15d8 + 12) bludgeoning damage and falling @Prone on a failure, or half damage on a success.

**Break Their Bodies (Murderous Rampage).** This action costs 2 favor to use. The Ravager slams the ground. The primary target must make a DC 25 Constitution saving throw or be @Stunned until the end of its next turn. All other enemies within 20 feet must succeed on a DC 25 Strength saving throw or fall @Prone.

**Worldbreaker (Murderous Rampage).** This action costs 3 favor to use. The Ravager leaps up to 100 feet and crashes into the earth. Each creature within 30 feet must succeed on a DC 25 Dexterity saving throw or take 110 (20d10) bludgeoning damage and be thrown 30 feet backward.

## Reactions

**Violent Reversal.** This reaction costs 1 favor to use. When damaged or forced to fail a save during Murderous Rampage, the Ravager rushes the triggering creature and immediately makes one Titanic Cleaver or Seize attack against it.

### Design Principle

Phase transitions feel most earned when driven by dynamic resource generation rather than fixed round timers. The Ravager forces players to coordinate defensive control to starve its Favor generation.

---

# Baalzebul — Health-Fueled Spellcaster

A three-point Epic spellcaster demonstrating **Hit Points as a spellcasting resource**, health-paid reactions, self-duplication, and defensive expenditure.

**Size:** Large  
**Type:** fiend (devil)  
**Group:** Archdevils  
**Entity Type:** Monster  
**Encounter Points:** 3.0  
**Expected DPR:** 120  
**Armor Class:** 19 (natural armor)  
**Hit Points:** 850 (expected to spend 200+ HP on abilities)  
**Speed:** 20 ft., burrow 20 ft., climb 20 ft.  
**Saving Throws:** Str +17, Con +15, Int +15, Cha +16  
**Skills:** Athletics +17, Deception +24, Insight +15, Intimidation +16, Persuasion +16  
**Damage Resistances:** acid, cold; bludgeoning, piercing, and slashing from nonmagical attacks  
**Damage Immunities:** fire, poison  
**Condition Immunities:** @Charmed, @Exhaustion, @Frightened, @Poisoned  
**Senses:** truesight 120 ft., tremorsense 10 ft., passive Perception 17  
**Languages:** all, telepathy 120 ft.  
**Challenge:** 26  
**Proficiency:** +8  
**Max Reactions:** 2  

| STR | DEX | CON | INT | WIS | CHA |
| --- | --- | --- | --- | --- | --- |
| 28 (+9) | 15 (+2) | 25 (+7) | 24 (+7) | 24 (+7) | 26 (+8) |

## Protective Traits

**Bloody Resistance (50 Health).** If Baalzebul fails a saving throw, he can spend 50 HP to succeed instead.

**Magic Resistance.** Baalzebul has advantage on saving throws against spells and other magical effects.

**Power in Blood.** Baalzebul expends Hit Points to power spells and abilities. This health loss cannot be prevented or reduced and uses actual Hit Points, never temporary Hit Points.

## Regular Traits

**Stench of the Slug.** A creature that starts its turn within 10 feet of Baalzebul must succeed on a DC 24 Constitution saving throw or become @Poisoned until the start of its next turn.

## Actions

**Multiattack.** Baalzebul makes two Bloody Gorge attacks.

**Bloody Gorge.** *Melee Weapon Attack:* +17 to hit, reach 10 ft., one target. *Hit:* 29 (4d10 + 7) piercing plus 27 (6d8) acid damage. Baalzebul regains HP equal to half the acid damage dealt (14 on average).

**Pungent Emergence (50 Health).** Baalzebul spends 50 HP and loses half his remaining HP. A duplicate of Baalzebul emerges within 20 feet with identical current HP and statistics. It acts on his initiative count. Both copies share daily spell limits.

**Spellcasting.** Baalzebul casts one of the following spells using Charisma (spell save DC 24). Each category requires the listed health expenditure.

At will (20 Health): @[Dispel Magic], @[Dimension Door], @[Suggestion], @[Darkness], @[Shield]
3/Day each (40 Health): @[Dominate Person], @[Wall of Force], @[Teleport]
1/Day each (60 Health): @[Necrotic Cyst], @[Crown of Vermin], @[Heart of Pestilence]
Counterspells (20 Health): Counterspell, The Classic, The Feint, The Mage Killer

## Bonus Actions

**Displace (30 Health).** Baalzebul spends 30 HP to teleport up to 120 feet to an unoccupied space he can see.

## Reactions

**Shield of Blood (20 Health).** Baalzebul spends 20 HP to protect allies. Any number of chosen creatures within 120 feet automatically succeed on saving throws against a newly cast damaging spell and take no damage. Baalzebul makes the saving throw himself and takes full damage.

### Design Principle

Hit Points can serve as a unified **spellcasting, mobility, reaction, and defense currency**. When evaluating durability, account for expected self-spending and duplication.

---

# Belial — Temporal Archdevil Spellcaster

An eight-point supreme spellcaster demonstrating a **restricted second turn**, conjoined boss immortality, hellfire manipulation, and 24th-level spell mastery.

**Size:** Medium  
**Type:** fiend (archdevil)  
**Group:** Archdevils  
**Entity Type:** Monster  
**Encounter Points:** 8.0  
**Expected DPR:** 220  
**Armor Class:** 22 (natural armor)  
**Hit Points:** 850  
**Speed:** 30 ft.  
**Saving Throws:** Dex +11, Con +14, Int +17, Wis +14  
**Skills:** Arcana +17, History +17, Deception +22, Insight +14, Perception +14, Persuasion +22  
**Damage Resistances:** cold; bludgeoning, piercing, and slashing from nonmagical attacks that aren't silvered  
**Damage Immunities:** fire, poison  
**Condition Immunities:** @Charmed, @Poisoned  
**Senses:** truesight 120 ft., passive Perception 24  
**Languages:** Celestial, Common, Draconic, Infernal, telepathy 120 ft.  
**Challenge:** 30  
**Proficiency:** +8  
**Max Reactions:** 2  

| STR | DEX | CON | INT | WIS | CHA |
| --- | --- | --- | --- | --- | --- |
| 25 (+7) | 17 (+3) | 22 (+6) | 29 (+9) | 22 (+6) | 23 (+6) |

## Protective Traits

**Conjoined Twin.** While his sister Fierna is above 1 Hit Point, any effect that would reduce Belial below 1 HP or kill him instead reduces him to 1 HP. If Fierna is reduced to 1 HP or dies, Belial becomes enraged: he gains Hellfire Breath, and any creature attempting to interact with his spells must pass a DC 25 Constitution saving throw or take 14 (4d6) hellfire damage.

**Legendary Resistance (3/Day).** If Belial fails a saving throw, he can choose to succeed instead.

**Magic Resistance.** Belial has advantage on saving throws against spells and other magical effects.

## Regular Traits

**Temporal Lock.** Belial permanently captures the magic of *Time Stop*. He takes two turns per round: one on his rolled initiative, and a second turn at initiative minus 10. During this temporal turn, time remains frozen until one of Belial's actions affects another creature or an object carried by another creature.

**Fiendish Regeneration.** Belial regains 20 HP at the start of his normal turn. If he took radiant damage since his last turn, this trait does not function. Belial dies only if he starts his turn at 0 HP and does not regenerate.

**Spellcasting.** Belial is a 24th-level spellcaster. His spellcasting ability is Intelligence (spell save DC 25, +17 to hit with spell attacks).

Cantrips (at will): Fire Bolt, Ray of Frost, Mage Hand, Prestidigitation, Shocking Grasp
1st level (4 slots): Shield, Magic Missile, Detect Magic
2nd level (3 slots): Hold Person, Misty Step, Invisibility
3rd level (3 slots): Counterspell, Fireball, Dispel Magic, Fly
4th level (3 slots): Greater Invisibility, Wall of Fire
5th level (3 slots): Cone of Cold, Wall of Force
6th level (2 slots): Chain Lightning, Mass Suggestion
7th level (2 slots): Teleport, Delayed Blast Fireball
8th level (1 slot): Power Word Stun
9th level (1 slot): Time Ravage, Prismatic Wall
Epic Tier 1 (2 slots): Antimagic Ray, Reverse Magic, Catastrophe
Epic Tier 2 (1 slot): Caldera, Prismatic Deluge
Counterspells: Counterspell, The Classic, The Feint, The Mage Killer

## Actions

**Hellfire Staff.** *Melee Weapon Attack:* +17 to hit, reach 5 ft., one target. *Hit:* 11 (1d8 + 7) bludgeoning plus 22 (4d10) fire damage.

**Hellfire Breath (Recharge 5-6).** Belial exhales hellfire in a 90-foot cone. Each creature in the area must make a DC 25 Dexterity saving throw, taking 130 (20d12) fire damage on a failure, or half as much on a success.

### Design Principle

A second turn does not have to be an unrestricted full turn. **Temporal Lock** creates a thematic setup window with an explicit condition that ends the protected time freeze. Conjoined immortality shifts the victory condition from brute damage to controlling the pair.

---

## Non-Monster Reference Statblocks

For complete reference examples of **Non-Monster Entities** (including the canonical **Gruumsh Warband**, **Soul Pylon of the Archpriest**, and **Infernal Crucible**), see [06_Non_Monster_Entities.md](file:///c:/Users/onbro/OneDrive/Plocha/DnD-Tracker-App/docs/AI%20Knowledge%20Base/06_Non_Monster_Entities.md).
