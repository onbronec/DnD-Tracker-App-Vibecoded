---
name: monster-knowledge-sync
description: >-
  Audit, validate, and synchronize docs/AI Knowledge Base whenever monster data
  models, parser logic, epic action rules, spellcasting, or combat tracker
  capabilities change in the project.
---

# Monster Knowledge Base Synchronization Skill

This skill defines the mandatory workflow for keeping `docs/AI Knowledge Base/` completely aligned with the codebase.

External AI agents generating monsters for this application **only see the documents in `docs/AI Knowledge Base/`**. If those documents drift out of sync with `src/shared/monsterParser.ts` or the combat engine, imported statblocks will parse incorrectly or miss new application features.

---

## When to Activate This Skill

Run this audit and synchronization whenever you:
1. Modify `src/shared/monsterParser.ts` (e.g. adding new header regexes, changing tracker detection, altering spell parsing, modifying section headings).
2. Modify `src/shared/monsterEpic.ts` (e.g. changing epic action limits, reset types, suboption parsing).
3. Modify `src/shared/types.ts` regarding `Monster`, `MonsterAbilities`, `MonsterEpicAction`, `entityKind`, or `hasHpAc`.
4. Modify `src/pages/MonsterEditorPage.tsx`, `src/pages/MonstersPage.tsx`, or `src/components/MonsterEpicActions.tsx` (new fields, controls, or trackers).
5. Modify server-side combat resolution or autosave schema regarding monsters or non-monster objects.
6. Alter encounter balance assumptions (encounter point multipliers, DC/attack calibration, cosmological damage rules).

---

## Audit Checklist

When any of the above code changes occur, verify and update the corresponding documents:

### 1. Header Fields & Metadata (`01_Statblock_Template.md` & `06_Non_Monster_Entities.md`)
Compare `parseMonsterMarkdown()` header regexes against the markdown template:
- `Size:`, `Type:`, `Group:`, `Entity Type:` (`Monster` | `Non-Monster`)
- `Encounter Points:` (or `(N points)` fallback)
- `Expected DPR:`
- `Armor Class:`, `Hit Points:` (including multiple health bars format: `450 per health bar (4 bars; 1,800 total)`)
- `Speed:`, `Saving Throws:`, `Skills:`, `Senses:`, `Languages:`, `Challenge:`, `Proficiency:`
- `Max Reactions:` (multi-reaction support for elites and bosses)
- `Lair Action Initiative:`, `Mythic Action Initiative:`, `Fixed Initiative:`, `Has HP/AC:`
- Image URLs (`![Alt](url)`)

### 2. Usage Tracker Inference (`01_Statblock_Template.md`)
Verify `extractResourceFeatures()` in `src/shared/monsterParser.ts`:
- Recharge syntax: `(Recharge 5-6)` or `(Recharge 6)`
- Reset types: `(N/Day)`, `(N/Rest)`, `(N/Round)`
- Power cost phrasing: `costs 1 favor`, `costs 2 power`, `spend 1 divine favor`, `costs 3 crystallization points`
- Spell slot cost phrasing: `expends a 3rd-level spell slot`, `costs a 1st-level spell slot`

### 3. Spellcasting Block Syntax (`01_Statblock_Template.md`)
Verify `parseMonsterSpellcasting()`:
- `Cantrips (at will):`
- `[N]st/nd/rd/th level ([N] slots):` and `(at will)`
- `Epic Tier [1-3] ([N] slots):`
- `At will:`, `3/day each:`
- `Counterspells:` (dedicated line for counterspells)
- Ensure the comma-separated spell names rule is emphasized so names match `spellDatabase`.

### 4. Epic Actions & Suboptions Hierarchy (`01_Statblock_Template.md`)
Verify `src/shared/monsterEpic.ts`:
- Heading: `## Epic Actions`
- Section intro preserved as `Epic Action Rules`
- Action title with limit: `**Action Name (N/Round).**` or unlimited
- Suboptions using `### Option Name — Cost (Limit)` syntax
- Cost tables inside epic action descriptions

### 5. Interactive Database References (`@` and `@[]`)
Verify that documentation instructs the AI to use:
- Single-word conditions: `@Stunned`, `@Poisoned`, `@Prone`, `@Paralyzed`, `@Charmed`, `@Frightened`, `@Blinded`, `@Exhaustion`
- Multi-word conditions: `@[Ability Score Set]`, `@[Armor Class Reduced]`, `@[Burning 2d4 fire]`
- Spells: `@[Spell Name]` (e.g. `@[Fireball]`, `@[Antimagic Ray]`)
- Monsters: `@[Monster Name]` (e.g. `@[Zealot]`)

### 6. Non-Monster Entities (`06_Non_Monster_Entities.md`)
Verify that:
- `**Entity Type:** Non-Monster`
- `**Fixed Initiative:** 20`
- `**Has HP/AC:** no` (or `yes` with AC/HP for destructible objectives)
- Archetypes remain accurate (Warband Controllers, Hazards, Rituals, Boss Anchors).
- Reference statblocks (`Gruumsh Warband`, `Soul Pylon`, `Infernal Crucible`) parse cleanly.

### 7. Numerical Calibration & Rules (`00_Epic_System_Rules.md`)
If encounter points or damage rules change:
- Update 1 pt ≈ 150 HP, 80–100 DPR targets.
- Update DC benchmarks (19 / 24 / 27+), attack benchmarks (+12 / +16 / +20).
- Update Cosmological Traits (Creation-Bound, Imateria-Tainted) and Epic Damage types (Arcane, Righteous, Vile).
- Update Epic Spell Tier Catalogue if new Epic spells are added.

---

## Verification Runbook

After making any changes to `docs/AI Knowledge Base/` or the monster parser, execute:

```powershell
# 1. Run the Knowledge Base validation test
npm.cmd test -- tests/unit/knowledgeBase.test.ts

# 2. Run all unit tests
npm.cmd test -- tests/unit

# 3. Verify the frontend builds cleanly
npm.cmd run build
```

All template and reference statblocks in `docs/AI Knowledge Base/` must pass validation with 100% success.
