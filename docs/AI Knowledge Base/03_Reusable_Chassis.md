# Reusable Monster Chassis

These are reusable patterns from the campaign. They are **options, not mandatory templates**.

Use them when they support the creature's identity. Adapt names, triggers, costs, and flavor as needed.

---

## Divine Protection

A common divine defensive-resource chassis.

**Divine Protection (X/Rest).** The creature may spend one Divine Protection charge to do one of the following:

- Pass a failed saving throw.
- Prevent damage it was about to take.
- Pass an ability check.
- Suppress a spell or effect that prevented it from taking a game action.

If the triggering effect is an Epic attack, Epic spell, or Epic ability, the creature must spend one additional charge.

### Design Use

Best when a divine creature needs a limited pool that can be shared between defense and stronger deity-specific abilities.

Avoid giving it to every divine monster automatically.

---

## Demonic Protection

The fiendish equivalent of Divine Protection.

**Demonic Protection.** The creature may spend one point of its demonic resource, such as Chaos Favor, to:

- Pass a failed saving throw.
- Prevent damage it was about to take.
- Pass an ability check.
- Suppress a spell or effect that prevented it from taking a game action.

Epic effects normally cost one additional resource.

### Design Use

Works best when the same resource also powers offense, escalation, or phases. This creates player interaction because forcing the demon to defend itself weakens its future offense.

---

## Frenzy — Multiple Turns

**Frenzy.** The creature has advantage on initiative checks and takes two turns during each round of combat. It takes its second turn at its initiative count minus 10, to a minimum initiative count of 1.

### Design Use

Use for creatures whose fantasy depends on unusually high tempo.

Always balance total output across both turns.

If a creature gains three turns or conditionally gains extra turns, define timing explicitly.

---

## Divine Miracle — Chosen of a God

Divine Miracle represents direct intervention by a god rather than an activated spell or ordinary resource expenditure.

### Core Chassis

**Divine Miracle.** The first time the Chosen is reduced to 0 Hit Points, it does not die. Instead it immediately:

- heals to full Hit Points;
- ends all non-Epic spells, conditions, and effects affecting it;
- may repeat available saving throws against Epic effects with advantage;
- may stand or reposition up to half its speed without provoking opportunity attacks;
- triggers deity-specific manifestations.

The intervention is a deific effect.

### Manifestation Package

A good deity-specific package usually contains four options covering different functions:

1. restore or reinforce allies;
2. break control or hostile magic;
3. seize momentum;
4. alter the battlefield.

A Miracle should dramatically change the state of the encounter rather than merely grant AC or bonus damage.

### Multiple Miracles

A creature may have **Promised Miracles (2+)**.

Possible escalation models:

- first Miracle triggers 2 manifestations, second 3, third all 4;
- later Miracles use stronger versions;
- each Miracle has a predetermined narrative package;
- each Miracle adds persistent divine presence.

Remember that each full heal acts like an additional health bar.

---

## Follower of Gruumsh

This tag identifies creatures that participate in Gruumsh's warband systems.

Followers may benefit from:

- Gruumsh's Favor;
- Gruumsh's Protection;
- Hunt;
- Warband Actions;
- faction-specific resurrection or movement effects.

A creature allied with Gruumsh is not automatically a Follower of Gruumsh.

This distinction matters mechanically.

---

# Gruumsh Warband Chassis

The warband is an encounter-level Non-Monster statblock representing Gruumsh's attention on a coordinated group of followers. For the complete, parser-ready Non-Monster statblock, see [06_Non_Monster_Entities.md](file:///c:/Users/onbro/OneDrive/Plocha/DnD-Tracker-App/docs/AI%20Knowledge%20Base/06_Non_Monster_Entities.md).

It exists only while at least two conscious Followers of Gruumsh remain.

It cannot itself be targeted, damaged, or affected by normal creature mechanics.

## Gruumsh's Favor

At the start of combat, the warband gains **1 Favor per 4 starting Followers of Gruumsh, rounded up**.

Maximum Favor equals starting Favor +2.

The number of Followers is snapshotted when the encounter begins. Summons and resurrections do not recalculate the maximum.

Favor is shared across the warband.

Successful Hunts may generate additional Favor.

## Gruumsh's Protection

Costs 1 Gruumsh's Favor and does not count as a Warband Action.

When two or more Followers of Gruumsh are affected by the same effect, Gruumsh may protect them.

Against a non-Epic effect, protected Followers may:

- pass the save;
- prevent all damage;
- ignore conditions and other effects from that triggering effect.

Against an Epic effect, protected Followers automatically succeed on the save and take half damage; effects that still occur on a successful save still happen.

This chassis lets low-HP followers survive occasional AoE without individually inflating their HP.

---

## Gruumsh's Hunt

At initiative 20, choose one conscious Follower of Gruumsh as the **Hunter** and one hostile creature as the **Prey**.

The Hunter:

- always knows the direction and distance to the Prey while on the same plane;
- doubles its movement speed while moving toward the Prey;
- has advantage on melee attack rolls against the Prey.

At initiative 10, the Hunter takes a special **Hunt Turn**. During it, the Hunter may move up to its speed and make one melee weapon attack, only against the Prey.

If that Hunt Turn deals melee weapon damage to the Prey, **Draw Blood** occurs:

- the warband gains 1 Gruumsh's Favor;
- the Hunt ends.

Normal turns and Warband Actions cannot trigger Draw Blood.

### Defiance Draws His Eye — 1/Round

When another creature directly prevents the Hunter from reaching, attacking, or damaging the Prey, that creature may voluntarily become the new Prey. The Hunter remains unchanged.

### Hunt Passes With Blood

A Hunter that successfully Draws Blood cannot be selected as the Hunter for the next Hunt.

A Hunter that fails may be selected again.

---

## Gruumsh Warband Actions

At initiative 20, the warband may use one Warband Action by spending 1 Gruumsh's Favor.

### War Without End

Return up to three dead Followers of Gruumsh worth no more than 2 encounter points total.

Each returns with half its maximum HP, stands, and may move up to half its speed.

A creature can be returned by War Without End only once per encounter.

### Blood Frenzy

Choose up to three Followers of Gruumsh. Each immediately moves up to its speed and makes one melee attack.

These attacks cannot Draw Blood.

### Unbreakable Horde

Choose up to four Followers.

Each may:

- end one non-Epic condition, spell, or effect affecting it;
- stand from Prone;
- move up to half its speed without provoking opportunity attacks.

Against an Epic effect, it instead immediately repeats its saving throw with advantage and ends the effect on a success.

### Break Their Line

Choose up to four Followers.

Each moves up to its speed without provoking opportunity attacks, then uses one of:

- Shove;
- Grapple;
- Shield Bash;
- another statblock ability whose primary function is forced movement, Prone, or Grappled.

Any saving throw caused by such an ability gains +2 DC for this use.

---

# Special Defeat Chassis — Too Angry to Die

Used for creatures whose fantasy is continuing to fight after conventional death.

**Too Angry to Die.** The creature does not die or fall unconscious when reduced to 0 Hit Points and continues to act normally. Whenever it takes damage while at 0 Hit Points, it makes a Constitution saving throw with a DC equal to half the damage dealt. On a failure, it gains one level of Exhaustion. Exhaustion gained this way cannot be removed while the creature remains at 0 Hit Points. The creature dies when its Exhaustion reaches the campaign's lethal threshold.

### Design Use

This makes large post-0-HP hits substantially more valuable than chip damage.

If the creature also has damage-prevention resources, preventing the hit also prevents the Too Angry to Die saving throw.

---

# Phase / Resource Design Checklist

Whenever using a phase system, explicitly define:

- starting phase;
- starting resource;
- maximum resource;
- gain triggers;
- spending rules;
- threshold transitions;
- whether the resource can still be generated in each phase;
- what happens to leftover resource;
- how the phase interacts with 0 HP;
- how many turns per round occur in each phase.

---

# Additional Ability Pattern Library

The following are **reference patterns and inspiration, not default mechanics**. Some examples rely on campaign-specific conditions or subsystems that may be defined elsewhere. When reusing one, preserve the design idea rather than copying numbers blindly.

## **Devoted Resistance**

**Devoted Resistance.** If the creature fails a saving throw against a non-epic effect, it can choose to lose 50 HP to succeed instead.

## **Arcane Blood**

**Arcane Blood (Xth).** This creature is born of magic and magic courses through its blood. Thus spellcasting comes as naturally as breathing to it. It can cast any Sorcerer or Warlock spell of **Xth** level or lower as an action or a reaction. This is still considered a normal use of spellcasting and follows the same rule. It however does not require any spell slots and is always considered to be cast at **Xth** level. The spellcasting ability of this creature is **Charisma** with spell save DC of **XX** and attack roll bonus of +**XX**.

## Mythic Boss

On its turn, the boss can use its movement and interaction as normal. However, it does not take an action or bonus action on its turn unless forced to do so by a spell or other effect. Instead, the boss takes one of the following mythic actions. He cannot use the same mythic action twice in a row:

In addition to its Mythic action the boss takes one of the following epic actions of its choice at the end of each player character’s turn:

**Epic Resistance.** The epic boss chooses one condition, spell, or other effect currently affecting them and rolls 1d20. On an 11 or higher, the effect ends on it. An epic boss can use this action even if it would otherwise be unable to take actions, its actions are being controlled by another creature, or if a spell or effect alters its game statistics. It has advantage on these rolls against non-Epic effects.

---

## Epic Boss

On its turn, the boss can use its movement and interaction as normal. However, it does not take an action or bonus action on its turn unless forced to do so by a spell or other effect. Instead, the boss takes one of the following epic actions of its choice at the end of each player character’s turn:

**Epic Resistance.** The epic boss chooses one condition, spell, or other effect currently affecting them and rolls 1d20. On an 11 or higher, the effect ends on it. An epic boss can use this action even if it would otherwise be unable to take actions, its actions are being controlled by another creature, or if a spell or effect alters its game statistics. It has advantage on these rolls against non-Epic effects.

---

## Mythic Resistance

**Mythic Resistance.** If the boss fails a saving throw, they can choose to succeed instead. First use in a round is free and every other use expends one of their unspent legendary actions.

---

## Unstoppable

**Unstoppable (1/Turn).** If an effect or condition would stop the monster from using an action or moving, it may instead move or take an action.

---

## Minion

Minion. If the hyena takes damage from an attack or as the result of a failed saving throw, their hit points are reduced to 0. If the hyena takes damage from another effect, they die if the damage equals or exceeds their hit point maximum; otherwise they take no damage.

---

**Entangling Mycelia (recharges when bloodied).** Mushroom roots sprout in a 30-foot radius centered on the humongous fungus troll. Each creature of the troll’s choice in that area when the plants appear must succeed on a DC 15 Strength saving throw or become entangled (escape DC 15).

---

## Frenzy or Bonesaw Attack

**Whirling Bonesaw.** Melee Weapon Attack. +11 to hit, reach 10 ft., one target. Hit: 20 (4d6 + 6) slashing damage. This attack ignores resistance or immunity to slashing damage. Each time the ripper hits with this attack on its turn, it can make an additional attack against the same target as part of the same action. A ripper continues making these attacks until it misses or the target dies.

---

## Regeneration

**Regeneration (energy type).** The troll regains 10 hit points at the start of its turn. If the troll takes (energy type) damage, this trait doesn’t function at the start of the troll’s next turn. The troll dies only if it starts its turn with 0 hit points and doesn’t regenerate.

---

## Blink Eldritch Creature

**Bonus Actions**
**
Void Walker.** The eldritch crawler magically transports itself from the Material Plane to the Space Between Worlds, or vice versa.

**Reactions**
**
Fractured Reality.** Whenever an attack that targets the eldritch crawler misses, the eldritch crawler can teleport 30 feet to an unoccupied space it can see, momentarily leaving behind a fractured image of itself being hit by the attack in its place.

---

## Frogspawn

**Throw Frogspawn.** Ranged Weapon Attack: +4 to hit, range 30/60 ft., one target. Hit: 6 (1d8+2) bludgeoning damage. If the target is a creature, the egg sticks to the target’s body, melding with the creature’s flesh. The target or another creature within 5 feet of it can spend an action to remove the eggs from the target’s body, dealing 10 (3d6) acid damage to the target in the process. If the target finishes its next turn and the eggs are still attached to its body it gains a disease and becomes sickened until the disease ends as octarine boils and sores spread through its body, originating from the egg melded to the creature’s flesh. The disease can not be removed except by magic that removes diseases (such as lesser restoration). The target must make a DC 12 Constitution saving throw after every hour that elapses. On a failed save, the target gains one level of contamination. Contamination gained in this way can not be removed until the disease ends. If the target suffers a monstrous transformation the octarine boils and sores burst and the creature’s flesh falls away, killing the creature instantly, and revealing a Lob Frog in its place.

---

## Reaumata minion

**Relentless Endurance.** If damage reduces the reautomata to 0 hit points, it must make a Constitution saving throw with a DC of 5 + the damage taken, unless the damage is from a critical hit. On a success, the reautomata drops to 1 hit point instead.

Standing Leap. The reautomata’s long jump is up to 50 feet and its high jump is up to 30 feet, with or without a running start.

**Actions**

**Multiattack.** The reautomata makes two arm blade attacks and uses Entrapping Rend.

**Arm Blade.** Melee Weapon Attack: +9 to hit, reach 5 ft., one target. Hit: 20 (4d6 + 6) slashing damage. If the target is a Large or smaller creature, it must succeed on a DC 15 Strength saving throw or be pushed up to 5 feet and knocked prone.

**Entrapping Rend.** Melee Weapon Attack: +9 to hit, reach 5 ft., one prone target. Hit: 23 (5d6 + 6) piercing damage, and if the target is a Large or smaller creature, it is trapped in the reautomata’s grip and grappled (escape DC 18). Until this grapple ends, the target is restrained, and the reautomata can’t use Entrapping Rend on another target.

**Bonus Actions**

**Aggressive.** The reautomata can move up to its speed toward a hostile creature that it can see. This movement doesn’t provoke opportunity attacks.

---

**Impaling Limbs.** Melee Weapon Attack: +7 to hit, reach 10 ft., one creature. Hit: 18 (4d6 + 4) piercing damage and the target is bleeding 2d6. While bleeding in this way, the target is also slowed.

**Corrosive Mucus.** Ranged Weapon Attack: +7 to hit, range 30/60 ft., one target. Hit: 14 (4d4 + 4) acid damage and the target is burning (2d4 acid). While burning in this way, the target’s AC becomes 10 + its Dexterity modifier.

---

## The Injector

**Multiattack.** The injector makes four needle attacks. It can replace any number of these attacks with its Booster Dose instead.

**Needle.** Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 11 (2d4 + 6) piercing damage. In addition, on a hit, the injector can can cause one of the following additional effects (choose one or roll a d4).  It can’t use the same effect more than once per turn.

- **Lethal Injection.** The target takes an additional 35 (10d6) poison damage.
- **Numbing Solution.** The target must make a DC 15 Wisdom saving throw. On a failed save, it becomes dazed (save ends).
- **Mind Dampener.** The target takes an additional 10 (3d6) psychic damage and must make a DC 15 Intelligence saving throw. On a failed save, it becomes bewildered (save ends).
- **Induced Necrosis.** The target takes an additional 18 (4d8) necrotic damage and must make a DC 15 Strength saving throw. On a failed save, the target becomes weakened (save ends).

Booster Dose. The injector administers a tincture to a friendly creature it can see within 5 feet of it that isn’t a construct. Once a target benefits from a tincture, it can’t gain the benefit of that tincture again until it finishes a short or long rest.

- **Adrenaline Rush.** The target can use its reaction to move its speed without provoking opportunity attacks, or make one weapon attack with advantage.
   Inoculation. The target gains resistance to all damage for 1 minute.
- **Restorative Fluid.** The target regains (35) 10d6 hit points. If the target is already at it’s maximum hit points, it gains these as temporary hit points instead.
- **Focus.** The target becomes blessed (1d4) for 1 minute.

Reactions

**Unstable Tank.** When the injector would take damage, it can instead absorb the damage by causing one of its tanks to explode violently effecting each creature within 20 feet of it. The fluids are expended and the injector can’t use that effect until it finishes a long rest, but takes no damage from the triggering attack or effect.

---

## Cool 2nd Phase Reaction

**Crescendo of Chaos (1/day).** When the cacophonous chimera current hit points fall below half its hit point maximum, it can use this reaction. It may do so if it is incapacitated or otherwise unable to take reactions. All conditions and spells on the cacophonous chimera immediately end unless it chooses to be affected by them, and it can move its speed without provoking opportunity attacks and ignoring difficult terrain. It then unleashes a blast of thunderous power. Creatures within 300 feet of it who can hear it must make a Wisdom saving throw. Those who fail this saving throw take 17 (5d6) thunder damage and 17 (5d6) psychic damage and are knocked prone and stunned until the end of their next turn.

---

## Fear Monster

**Insensitive to Pain.** Critical hits against the ripper become normal hits.

**Dismemberment.** Creatures killed by attacks made by the ripper can’t be restored to life except by means of resurrection or similar magic.

**Feed on Fear.** Frightened creatures are helpless and defenseless against attacks made by the Ripper.

**Dreadful Warrior.** Creatures cannot be immune to Frightened condition inflicted by the Ripper.

---

## Replay Time

**Replay Time.** The sphinx causes an action that it has time marked to replay. The creature that took the action returns to the spot where the action was originally taken. If the action had a creature target (or targets), the target(s) returns to their spot as well. All creatures returned this way return to the exact state that they were in at that moment in time. This includes hit points, spell effects, exhaustion levels, etc. The action that was taken is retaken. The action can replay out differently due to other creatures being in different positions, and the dice may fall differently this time.

**Time Sight.** The sphinx can enter a state of awareness where it sees the immediate past, the present and the immediate future. It has advantage on attack rolls, ability checks and saving throws. Attacks against it have disadvantage. At the end of each oif its turns, the sphinx can choose to change its initiative score. It gains advantage on its new initiative roll.

**Time Mark.** The sphinx time marks an action taken by a creature within sight of it who just took its turn. The creature is time marked as well. If the creature's action had a target creature, the target creature is time marked as well. The time mark lasts for 1 minute. The sphinx can only have one time mark active at a time. The sphinx cannot mark itself or another sphinx.

**Example:** Using Time Mark & Replay Time A hierocosphinx can use time mark to record a fireball, and then when replay time is used, the wizard casting the spell might hit all of his companions by accident.

---

## Fling

Fling. Strength Saving Throw: DC 14, one creature Grappled by the beetle knight. Failure: The target is thrown up to 1d6 × 10 feet, landing with the Prone condition. If the target strikes a solid surface, it takes 3 (1d6) Bludgeoning damage for every 10 feet it was thrown. If the target is thrown at another creature, that creature must succeed on a DC 14 Dexterity saving throw or take the same damage and have the Prone condition.

---

## Dark Decay

Infection Spores. Ranged Attack Roll: +7, range 60 ft. Hit: 18 (4d6 + 4) Necrotic damage, and if the target is a creature, it is subjected to the following effect. Constitution Saving Throw: DC 14. Failure: The target is infected with a disease called Dark Decay. Instead of acting normally on its turn, the target must move toward the closest creature that isn’t infected with Dark Decay and make one melee attack against it. If the attack hits, the target of that attack must also make a saving throw against Dark Decay. At the end of each of its turns, the target repeats the save. Subsequent Failures: The target suffers a Contamination level. Third Success: The disease ends. An infected creature that dies or undergoes a Monstrous Transformation becomes a Dark Growth Shambler. A Lesser Restoration spell or similar magic that removes diseases ends Dark Decay, as does any magic that removes Contamination levels.

---

## Dark Decay Bite

Infectious Bite. Melee Attack Roll: +6, reach 5 ft. Hit: 10 (2d6 + 3) Necrotic damage, and if the target is a creature, it is subjected to the following effect. Constitution Saving Throw: DC 14. Failure: The target is infected with a disease called Dark Decay. Instead of acting normally on its turn, the target must move toward the closest creature that isn’t infected with Dark Decay and make one melee attack against it. If the attack hits, the target of that attack must also make a saving throw against Dark Decay. At the end of each of its turns, the target repeats the save. Subsequent Failures: The target suffers a Contamination level. Third Success: The disease ends.

An infected creature that dies or undergoes a Monstrous Transformation becomes a Dark Growth Shambler. A Lesser Restoration spell or similar magic that removes diseases ends Dark Decay, as does any magic that removes Contamination levels.

---

## Sludge Monster

Invisible in Sludge. The elemental has the Invisible condition while fully submerged in delerium sludge.

Sludge Form. The elemental can enter a Hostile creature’s space and stop there. It can move through a space as narrow as 1 inch without squeezing.

Contaminated Touch. Melee Attack Roll: +7, reach 5 ft. Hit: 10 (3d6) Necrotic damage. Constitution Saving Throw: DC 15. Failure: The target suffers a Contamination level.

Engulf. Strength Saving Throw: DC 15, each Large or smaller creature in the elemental’s space. Success: The target is pushed out of the elemental’s space. Failure: The target has the Grappled condition (escape DC 15). While Grappled, the target has the Restrained condition. The elemental can grapple one Large creature or two Medium or smaller creatures at a time. At the start of each of the elemental’s turns, the target takes 28 (8d6) Necrotic damage and is subjected to the following effect. Constitution Saving Throw: DC 15. Failure: The target suffers a Contamination level. A creature within 5 feet of the elemental can take an action to pull a creature or object out of it with a successful DC 15 Strength (Athletics) check.

---

## Reality Alter / mindcontrol

Effulgent Cnidarian (page 45)

Altered Reality. The cnidarian has the Invisible condition for creatures Charmed by it.

Hallucinogenic Bioluminescence. A creature that starts its turn within 60 feet of the cnidarian and can see it is subjected to the following effect unless the cnidarian chooses otherwise. Wisdom Saving Throw: DC 16. Failure: The target has the Charmed condition (save ends). While Charmed, the target regards all other creatures as enemies except the cnidarian, whom it regards as an ally. Whenever the target makes an attack or casts a detrimental spell, it must choose its target at random from the creatures it can see within range. If a creature provokes an Opportunity Attack from the target, it must make the attack, if able. If the target ends its turn without taking an Attack or Magic action, it takes 14 (4d6) Psychic damage. Unless surprised, a creature can avert its eyes to avoid the saving throw at the start of its turn. If the creature does so, it has Disadvantage on attack rolls against the cnidarian until the start of its next turn. If the creature looks at the cnidarian in the meantime, that creature must immediately make the saving throw.

Neon Illumination. The cnidarian sheds Bright Light in a 30-foot radius and Dim Light for an additional 30 feet.

Multiattack. The cnidarian makes two Tendrils attacks. Tendrils. Melee Attack Roll: +6, reach 10 ft. Hit: 29 (6d8 + 2) Necrotic damage, or 48 Necrotic damage if the target is Charmed by the cnidarian.

Reflexive Flash. Trigger: A creature the cnidarian can see within 30 feet deals damage to it. Response—Constitution Saving Throw: DC 16, each creature in a 30-foot Emanation originating from the cnidarian that can see it. Failure: 10 (3d6) Radiant damage and the target has the Blinded condition (save ends). Success: Half damage only..

---

## Death Burst

Death Burst. Constitution Saving Throw: DC 16, each creature in a 30-foot Emanation originating from the elemental when it dies from a damage type other than Force, Radiant, or Thunder. Failure: 42 (12d6) Necrotic damage, and the target suffers a Contamination level. Failure or Success: The explosion triggers a random Catastrophic Arcane Anomaly (see Appendix D).

---

## Elemental Spells

Chain Lightning. Melee or Ranged Attack Roll: +9, range 120 ft. Hit: 14 (2d8 + 5) Lightning damage, the target has the Shocked condition until the end of the cataclysm’s next turn, and the lightning leaps to another creature of the cataclysm’s choice within 15 feet of the first target. The cataclysm makes a separate Chain Lightning attack against the target. The cataclysm can make any number of Chain Lightning attacks in this way, but a creature can be targeted only once each time the cataclysm takes this action.

Icy Bolt. Melee or Ranged Attack Roll: +9, range 120 ft. Hit: 14 (2d8 + 5) Cold damage. Hit or Miss: The target and each creature within 5 feet of it are subjected to the following effect. Dexterity Saving Throw: DC 17. Failure: 18 (4d8) Cold damage, and the target has the Frozen condition (DC 17).

Meteor Strike. Dexterity Saving Throw: DC 17, each creature in a 15-foot radius, 40-foot tall Cylinder centered on a point the cataclysm can see within 120 feet. Failure: 18 (4d8) Fire damage plus 18 (4d8) Bludgeoning damage.

Quake. Constitution Saving Throw: DC 17, each creature in a 30-foot Emanation originating from the cataclysm. Failure: 28 (8d6) Thunder damage, and the target has the Prone condition. Success: Half damage only.

---

## Cyclone

Cyclonic Storm. The eldritch cataclysm emits a 120-foot Emanation of high winds that disperse gases and vapors and extinguish unprotected flames. Ranged attacks that pass through the area have Disadvantage. A creature that starts its turn in the Emanation is subjected to the following effect. Strength Saving Throw: DC 17 (flying creatures have Disadvantage). Failure: The target has the Slowed condition until the start of its next turn. Failure by 5 or More: The target is flung 1d6 × 5 feet in a random direction, landing with the Prone condition.

---

## Antimagic Susceptibility

Antimagic Susceptibility. The graffiti is incapacitated while in the area of an antimagic field. If targeted by Dispel Magic, the graffiti must succeed on a Constitution saving throw against the caster’s spell save DC or become Unconscious for 1 minute.

---

## Forced Teleport

Transposition. The air quivers around creatures near the graffiti. Charisma Saving Throw: DC 15, up to five creatures the graffiti can see within 120 feet. Failure: The creature teleports to an unoccupied space capable of supporting the creature within 120 feet.

---

## Chaotic Blast

Lantern Blast. Magical octarine beams flash from one of the Gravekeeper’s many lanterns at one creature it can see within 120 feet that is not behind Total Cover, subjecting it to one of the following effects (the gravekeeper can only use each blast once per round):

1. Dispelling Blast. Intelligence Saving Throw: DC 18. Failure: 35 (10d6) Psychic damage. Any spell or magical effect on the target ends, and it has the Bewildered condition (save ends). Success: Half damage only.
2. Forceful Blast. Strength Saving Throw: DC 18. Failure: 35 (10d6) Force damage, and the target is pushed 20 feet away from the gravekeeper and has the Prone condition. Success: Half damage only.
3. Blinding Blast. Constitution Saving Throw: DC 18. Failure: 35 (10d6) Radiant damage, and the target has the Blinded condition (save ends). Success: Half damage only.
4. Contaminating Blast. Constitution Saving Throw: DC 18. Failure: 35 (10d6) Necrotic damage, and the target suffers a Contamination level. Success: Half damage only.
5. Igniting Blast. Dexterity Saving Throw: DC 18. Failure: 35 (10d6) Fire damage, and the target has the Burning condition (10d6 Fire). Success: Half damage only.
6. Freezing Blast. Constitution Saving Throw: DC 18. Failure: 35 (10d6) Cold damage, and the target has the Frozen condition (DC 18). Success: Half damage only.

---

## Animate Walls

Animate Walls (Recharge 5–6). Dexterity Saving Throw: DC 18, each creature within 10 feet of any number of walls within 120 feet of the gravekeeper. Failure: The target has the Grappled condition (escape DC 18). The wall sprouts limbs to facilitate this grapple, which disappear when the condition ends.

---

## Hypnotic Pollen

Hypnotic Pollen (Recharges after a Short or Long Rest). Wisdom Saving Throw: DC 10, each creature in a 30-foot Emanation originating from the eldritch blossom. Failure: The target has the Charmed condition for 1 minute. While Charmed, the target has the Incapacitated condition and must approach the eldritch blossom on its turns, taking the most direct path possible and moving through hazards. The effect ends early if a creature takes an action to shake the target out of its stupor.

---

## Spell Reflection

**Spell Reflection.** Trigger: The eldritch blossom succeeds on its save against a spell that targets only the eldritch blossom and doesn’t have an area of effect, or a spell attack misses the eldritch blossom. Response: The eldritch blossom chooses a creature it can see within 30 feet as the spell’s new target (the original caster is a valid target). If the spell forces a saving throw, the new target makes its own save. If the spell has an attack roll, the original caster rerolls the attack against the new target.

---

## Skin Crawler

Page 76

Amorphous Form. The skin crawler can move through a space as narrow as 1 inch without squeezing.

Multiattack. The skin crawler makes two Claw attacks and one Bind attack.

Claw. Melee Attack Roll: +4, reach 5 ft. Hit: 11 (2d8 + 2) Slashing damage.

Bind. Melee Attack Roll: +4, reach 5 ft. Hit: 15 (3d8 + 2) Bludgeoning damage, and if the target is Medium or smaller, it has the Grappled condition (escape DC 12). While Grappled, the target has the Restrained condition and Disadvantage on Strength checks and Strength saving throws, and the skin crawler can’t Bind another target.

BONUS ACTION Crush and Consume. Strength Saving Throw: DC 12, one creature Grappled by the skin crawler. Failure: 10 (3d6) Bludgeoning damage, and the skin crawler regains an equal number of Hit Points. If this damage kills the target, the skin crawler assumes its form. The skin crawler’s game statistics are the same in each form. It reverts to its true form if it dies.

---

## Teleport Polyp

Displacement. The polyp’s form is constantly shifting, moving through reality in unnatural ways. Attack rolls against the polyp have Disadvantage. If the polyp takes damage, this trait ceases to function until the start of its next turn. This treat is suppressed while the polyp has the Incapacitated or Restrained conditions, or is otherwise unable to move.

Actions

Multiattack. The polyp makes two Mucus attacks.

Mucus. Melee or Ranged Attack Roll: +6, reach 5 ft. or range 60 ft. Hit: 13 (3d6 + 3) Acid damage, and a 5-foot radius centered on the target is covered in acidic slime for 1 minute. A creature other than the polyp that enters the area for the first time on a turn or starts its turn there is subjected to the following effect. Constitution Saving Throw: DC 15. Failure: 10 (3d6) Acid damage, and the target has the Burning condition (3d6 Acid).

Slip Space. The polyp teleports to an unoccupied space it can see within 20 feet. Constitution Saving Throw: DC 15, each creature in a 10-foot Emanation originating from the polyp when it reappears. Failure: 16 (3d10) Force damage. Failure by 5 or More: The target triggers an Arcane Anomaly centered on itself. Success: Half damage only.

Bonus Actions

Shift Step. The polyp teleports to an unoccupied space it can see within 60 feet.

Reactions

Confused Realities. Trigger: The polyp takes damage from a creature it can sense within 30 feet. Response: The triggering creature is teleported to an unoccupied space the polyp can see within 30 feet of its original space. The destination must be on a surface or liquid that can support the target without the target having to squeeze.

---

## Possession

Possession. Charisma Saving Throw: DC 13, one Humanoid the warp witch can see within 5 feet. Failure: The target is possessed by the Warp Witch. The witch disappears, and the target has the Incapacitated condition and loses control of its body. The witch controls the target’s body but doesn’t deprive the target of awareness. The witch can’t be targeted by any attack, spell, or other effect, except ones that turn undead. The witch retains its alignment, Intelligence, Wisdom, Charisma, and Immunity to the Charmed and Frightened conditions. It otherwise uses the possessed target’s game statistics, but doesn’t gain access to the target’s knowledge, class features, or proficiencies. The possession lasts until the body drops to 0 Hit Points, the witch ends it as a Bonus Action, or the witch is turned or forced out by an effect like the Dispel Evil and Good spell. When the possession ends, the witch reappears in an unoccupied space within 5 feet of the body. If the target succeeds on its save or the effect ends for it, it is immune to this warp witch’s Possession for 24 hours.

---
