# Divine and Faction Power Systems — Corellon, Shar, Draconians

**Purpose:** Reusable monster-design chassis for Epic D&D 5e encounters. These rules are designed to be inserted into many different monster statblocks; individual monsters supply their own offensive powers, transformations, and numerical scaling.

**Status:** Corellon's Divine Perfection, Reclaim Perfection, and the Pompous condition are the finalized design agreed in this conversation. Shar and Draconian sections faithfully document the supplied example statblocks; explicitly unresolved details are flagged rather than silently invented.

---

## 1. Corellon — Divine Perfection

### Identity

Corellon's servants embody the tension between **unblemished perfection**, **the expenditure of divine power**, and **prideful self-exposure**. They begin combat in a Perfected Form. Spending Divine Favor on extraordinary feats or protection can bring them back to a Mortal Form. Once per encounter, they can reclaim all Favor, but they forever surrender their divine protection for that encounter and become dangerously vulnerable for one round.

### Shared resource and scaling

| Servant class | Maximum Divine Favor | Starting Divine Favor | Perfected while Favor is... |
| --- | ---: | ---: | --- |
| Lesser Servant | 2 | 2 | 1–2 |
| Greater Servant | 4 | 4 | 2–4 |
| Elite / Chosen | 6 | 6 | 3–6 |

Each servant has **one individual Divine Favor pool**. The pool cannot exceed its maximum. There is **no automatic per-turn restoration**; unless an individual statblock explicitly adds another source, the universal way to restore Favor during combat is *Reclaim Perfection*.

### Ready-to-use feature text (English)

**Divine Perfection (Divine Favor — Maximum 2/4/6).** The servant begins combat with its maximum Divine Favor. While it has Divine Favor equal to at least half its maximum, it is in its **Perfected Form**; otherwise, it is in its **Mortal Form**. It changes form immediately whenever its Divine Favor crosses this threshold. The features gained in Perfected Form are listed in the servant's statblock. Perfected Form does not grant universal bonuses to attacks, saving throws, or damage.

**Corellon's Protection.** The servant can spend 1 Divine Favor to pass a failed saving throw, prevent the damage it would take from one attack or effect, pass a failed ability check, or suppress an effect preventing it from taking a game action. If the triggering attack, spell, or ability is Epic, this costs 2 Divine Favor instead. The servant cannot spend more Favor than it currently has. Using Protection requires no action or reaction. Protection is not available after the servant has used Reclaim Perfection.

**Reclaim Perfection (1/Encounter).** At the start of its turn, while in Mortal Form and not @Incapacitated, the servant can restore its Divine Favor to its maximum (no action required). This immediately returns it to Perfected Form. After using Reclaim Perfection, it **cannot use Corellon's Protection again for the remainder of the encounter**, even if it later loses and regains Perfected Form. It also gains **@Pompous** until the start of its first turn in the following round.

**Perfected Arts.** Individual servants have their own abilities marked **Perfected Form only**; these may spend Divine Favor. An ability that requires Perfected Form checks that prerequisite when it is activated; the ability still resolves if its Favor cost drops the servant below the Perfected threshold. The servant then enters Mortal Form after the ability resolves. Other abilities may spend Favor in either form if their statblock says so.

### New condition — Pompous

**Pompous.** Attack rolls against a Pompous creature have advantage, and the creature has vulnerability to **all damage types**. Pompous does not remove damage immunity. Multiple sources of vulnerability do not multiply the same damage again. The condition lasts for the duration specified by the effect that applies it.

**Corellon timing:** Pompous from Reclaim Perfection lasts until the start of the servant's **first turn in the next combat round**, not an additional turn in the round in which it reclaimed Perfection. This ensures a normal player-response window for multi-turn bosses.

**Epic damage interaction:** Apply the campaign's damage-type and resistance/vulnerability rules. The same damage portion is not doubled again merely because it is already doubled against an Imateria-Tainted or Creation-Bound target.

### Quick table example — Greater Servant

1. Starts with **4/4 Favor**, Perfected (threshold **2**).
2. Uses a Perfected Art costing 3 Favor: **1/4**, now Mortal.
3. At the start of a later turn, uses **Reclaim Perfection**: immediately returns to **4/4**, Perfected, and becomes **Pompous** through the start of its first turn in the next round.
4. From this moment onward, it **can still spend Divine Favor on its offensive or utility powers**, but it can **never again spend Favor on Corellon's Protection in this encounter**.
5. If it spends Favor below 2, it becomes Mortal again. Reclaim Perfection cannot be used a second time.

### Design and balance notes

- **The Perfected Form is monster-specific.** A duelist, transmuter, archer, and commander all use this framework but obtain very different Perfected features.
- **Reclaim is not a skipped turn.** It requires no action, so it is meaningful even in encounters lasting approximately three rounds.
- **Pompous is an extreme liability.** Advantage on attacks plus universal vulnerability can make focus fire dramatically more effective. Account for this when balancing listed HP and any burst expected during Reclaim; do not compensate with hidden extra protection.
- Reclaim is **once per encounter**, not repeatable each time Favor drops.
- Corellon's Protection prevents damage from **one defined triggering attack/effect**, not an unlimited set of subsequent damage events.
- Important: **@Pompous is a new condition specification**, not automatically an existing condition in the DnD Companion database. Create its entry there before relying on an interactive reference.

---

## 2. Shar — Servants of Agony / Health-for-Power

### Identity

These servants **expend their own Hit Points** to overcome threats or unleash powerful abilities. As their health decreases, they become more dangerous. There is **no separate point resource**: their current HP is both durability and fuel.

> **Terminology note:** The supplied example calls these creatures *servants of agony*, while the conversation refers to them as *Shar's servants*. This section uses the requested Shar label without asserting that Shar and the campaign's separate Principle of Agony are the same entity.

### Ready-to-use feature text (English; based on the supplied statblock)

**Blessing of the Mother (40 Health).** The servant takes 40 damage to choose one of the following effects:

- Pass a failed saving throw.
- Prevent damage from an area-of-effect attack or ability.
- Pass a failed ability check.
- Suppress a spell or effect preventing it from taking a game action.

If the effect is an Epic ability or Epic spell, the servant takes **an additional 40 damage** (80 total).

**Lessons in Agony.** As the servant's Hit Points fall, it gains the following benefits:

- **Bloodied (at or below 50% maximum HP):** Advantage on all attack rolls.
- **At or below 25% maximum HP:** The servant is **Hasted**, using the campaign's existing custom condition.

These thresholds depend on **current HP**, not the number of times the creature has been damaged. Healing above a threshold removes its corresponding benefit unless an individual statblock states otherwise.

### Supplied example: a 180-HP servant

| Health threshold | Current HP | Benefit |
| --- | ---: | --- |
| Above Bloodied | 91–180 | No Lessons in Agony bonus |
| Bloodied | 46–90 | Advantage on all attacks |
| Quarter HP | 1–45 | Advantage on all attacks, plus Hasted |

Representative abilities that spend **40 HP** in the supplied statblock:

- **Agony Spike:** DC 18 Dexterity save; 80 acid damage on a failure (half on a success). On a failure, maximum HP is reduced by half the damage dealt until a long rest.
- **Flagellants Lesson:** DC 18 Charisma save or a level-5 curse imposing the custom *Withered (new)* condition; Dispel Magic or Remove Curse may remove it as specified by the ability.
- **Forgotten Purpose:** DC 18 Intelligence save or *Confused (New)* for up to 10 minutes (save ends).

### Mechanical cautions / source limits

- The supplied wording says **"takes 40 damage"** for Blessing and **"Costs 40 HP"** for offensive powers. For rigorous statblocks, specify uniformly whether this self-damage can be prevented or reduced, whether temporary HP can pay, and whether spending the last HP is permitted. **Those details are not stated in the supplied example and are not invented here.**
- **Hasted, Withered (new), and Confused (New)** refer to existing campaign-specific effects; their full text is not supplied here and is therefore not redefined.
- This design's effective durability falls as it repeatedly spends HP, but its offensive threat rises as it approaches the two health thresholds.

---

## 3. Draconians — Favor of the Dragon Empress

### Identity

Draconians draw power from **draconic breath weapons**. A breath attack that would ordinarily injure them instead charges their **Draconic Favor**, powering defense, elemental smites, energy attacks, and some death throes. This is a **different resource model** from the HP expenditure of Shar's servants.

### Ready-to-use feature text (English; based on the supplied statblock)

**Favor of the Dragon Empress.** The draconian begins with **1 Draconic Favor**. When it is hit by a draconic breath weapon, it takes no damage from that breath weapon and gains **1 Draconic Favor**, recording the breath weapon's damage type. Draconic Favor fuels the abilities below.

**Draconic Resistance.** The draconian may spend 1 Draconic Favor to:

- Pass a failed saving throw.
- Prevent damage it was about to take.
- Pass a failed ability check.
- Suppress a spell or effect preventing it from taking a game action.

Against an Epic creature's attack, Epic spell, or Epic ability, the draconian must spend **1 additional Favor** (2 total).

**Draconic Smite (1/Turn; costs 1 Draconic Favor).** Whenever the draconian hits with a melee attack, it can spend 1 Favor to deal an additional **45 (10d8)** damage of the damage type recorded by Favor of the Dragon Empress.

**Energy Bolt (requires 1+ Draconic Favor).** The draconian can use its ranged Energy Bolt while it has at least 1 Favor. In the provided example, the attack deals **35 (10d6)** damage of its recorded type, and **does not itself spend Favor**.

**Death Throes.** When the draconian is reduced to 0 HP, it turns to stone and releases petrifying gas (in the supplied example, each creature within 5 feet makes a DC 18 Constitution save; failure starts a two-stage restraint/petrification sequence). If the draconian still has at least **1 Draconic Favor** when it dies, affected creatures that failed the save additionally take **45 (10d8)** damage of its recorded breath type. The supplied example does **not** say this consumes Favor.

### Resource flow

1. **Start:** 1 Draconic Favor.
2. **Gain:** +1 when affected by a draconic breath weapon, which deals no damage to the draconian.
3. **Spend:** 1 for ordinary Draconic Resistance or Draconic Smite; 2 for Epic Draconic Resistance.
4. **Gate:** Energy Bolt is usable while the pool has 1+ Favor.
5. **Death synergy:** A draconian dying with 1+ Favor empowers Death Throes.

### Mechanical cautions / source limits

- **Maximum Favor is not specified** in the supplied statblock. A universal cap should be established before finalizing this as a tightly tracked resource.
- The ability header in the example reads **"Favor of the Dragon Empress (1/Long Rest)"**, but the body also grants Favor repeatedly from breath weapons. The exact intended long-rest recharge/limit requires clarification; do not interpret the parenthetical as disabling breath-triggered gains.
- The starting Favor is 1, but a **starting recorded damage type is not specified**. Assign a type in each final statblock or explicitly define when the creature first acquires one; otherwise Smite/Energy Bolt may have an undefined damage type before any breath hits it.
- If the breath weapon deals more than one damage type, the supplied text does not specify which type should be recorded.
- Avoid automatically giving this whole package to every dragon ally; it belongs to draconians explicitly possessing the trait.

---

## 4. Three chassis at a glance

| Feature | Corellon | Shar / Agony example | Draconians |
| --- | --- | --- | --- |
| Core fantasy | Divine perfection, pride, transformed form | Agony creates power | Dragonfire creates power |
| Primary resource | Divine Favor (max **2 / 4 / 6**) | Actual Hit Points | Draconic Favor |
| Starts with | Maximum Favor; Perfected | Full HP; no threshold perks | 1 Favor |
| Resource gain | Reclaim once per encounter | None; HP may be healed by other effects | +1 per draconic breath weapon received |
| Defensive cost | 1 Favor; Epic 2 | 40 HP; Epic 80 | 1 Favor; Epic 2 |
| Signature escalation | Perfected Form at **≥ half max Favor** | Bloodied advantage, quarter-HP Hasted | Elemental Smite, Energy Bolt, empowered Death Throes |
| Major tradeoff | Reclaim restores Favor but **permanently disables Protection for the encounter** and imposes **Pompous** | Spending HP increases lethality but reduces durability | Spending Favor lowers access to offensives/death boost |
| Main counterplay | Force early Protection; focus fire during Pompous | Exploit paid HP and threshold timing | Deny breath-generated Favor; exhaust stored Favor |

## 5. Implementation checklist

- [ ] Add **Pompous** as a custom condition in the condition database: advantage on attack rolls against the target; vulnerability to all damage types; no immunity override.
- [ ] Give each Corellon servant a Divine Favor maximum of 2, 4, or 6, a monster-specific Perfected Form, and (if appropriate) Perfected-only Arts.
- [ ] Implement **Reclaim Perfection (1/Encounter)** at the start of its turn, only while Mortal and not Incapacitated, with a permanent-for-this-encounter lockout of Corellon's Protection.
- [ ] For multi-turn Corellon bosses, ensure Pompous lasts through the normal player-response window until the first turn of the next round.
- [ ] For Shar-style monsters, clarify HP expenditure/self-damage interactions when producing the final individual statblock.
- [ ] For draconians, establish maximum Favor and the initial elemental damage type when producing the final individual statblock.

**Project knowledge suggestion (not automatically applied):** Move the finalized Corellon chassis and Pompous definition into `03_Reusable_Chassis.md`, and note Corellon's divine-perfection identity in `04_Setting_and_Factions.md`. The Shar and Draconian sections should remain marked as source-based examples until their unresolved resource details are decided.
