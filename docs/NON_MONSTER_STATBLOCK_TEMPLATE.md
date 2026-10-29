# DnD Companion Non-Monster Statblock Template

Use this for an encounter object such as a warband, battlefield hazard, lair
controller, ritual, or other initiative entry that is not a creature.

```markdown
# [Object Name]

**Entity Type:** Non-Monster
**Fixed Initiative:** [20]
**Has HP/AC:** [no]
**Encounter Points:** [0.1]
**Expected DPR:** [0]
**Type:** [encounter object]

## Protective Traits

**Object Rule.** Describe any persistent rule.

## Regular Traits

**Object Rule.** Describe the object and when it stops functioning.

## Actions

**Tracked Ability (1/Round).** Describe an action that can be tracked.
```

## Optional destructible object

Only add these fields if the object can actually be attacked or damaged:

```markdown
**Has HP/AC:** yes
**Armor Class:** [15]
**Hit Points:** [60]
```

## Import notes

- Non-monsters never roll initiative. `Fixed Initiative` defaults to 20.
- They appear in the initiative line, take turns, and their tracked abilities
  work like monster ability uses.
- `(1/Round)`, `(3/Day)`, `(Recharge 5-6)`, and resource-cost wording create
  usage trackers during import.
- Use the normal Monster Editor and select **Non-monster object** as Entry type.
