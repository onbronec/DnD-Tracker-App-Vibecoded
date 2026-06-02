# DnD Tracker Functionality Notes

This file documents restored table workflows in the React/server version. The
runtime source of truth is server state, so buttons should submit actions rather
than mutating client state directly.

## Combat Page

- Add character / monster and Add monster from database share one horizontal
  expandable menu. Only one setup menu is open at a time.
- Add character / monster: DM-only form submits `character.add`.
- Add monster from database: DM-only database picker submits `character.add`
  for one or more monster copies using saved monster stats.
- Start / Previous / Next / End / Close combat: DM-only combat actions.
- Close combat removes monsters and resets initiative. This replaces the old
  destructive "remove everything" workflow.
- Short Rest All / Long Rest All: DM-only buttons submit `spell.rest.all`.
- Save combat downloads the current `characters` plus `combatState` as JSON.
- Load combat reads a JSON file and submits `combat.import`; the server
  normalizes characters, broadcasts the loaded state and stores it in autosave.
- DM topbar has an Autosave button that manually calls server autosave for the
  current authoritative state.
- Character name click opens the conditions modal. Player can edit player
  characters; DM can edit everyone.
- Player cards have Spells and Inventory buttons that navigate to the selected
  character instead of resetting to the first character.
- Monster cards have Abilities, Duplicate and Remove buttons for DM.
- HP, temp HP, initiative, effects and monster power are submitted as scoped
  actions. Draft damage/heal/effect inputs stay local until submitted.

## Conditions

- Conditions are edited from the modal opened by clicking a character name.
- Predefined DnD conditions plus custom effects are supported.
- Combat effect tags are colored by condition kind: buff, debuff or neutral.
- Hovering a known condition tag shows the saved condition details.
- Exhaustion and Insanity-style effects can carry a level.
- Clicking an effect tag opens the condition modal. Levelled effects can be
  increased, decreased or removed; level changes submit `effect.level.set`.
- Removing an effect submits `effect.remove` and is undoable in combat history.

## Spells And Abilities

- Character selection is controlled by `selectedCharacterId` from app state and
  falls back only when the selected character no longer exists.
- Setup is collapsed by default and saves spellcaster level and hit dice with
  `spell.character.update`.
- Add custom feature is collapsed by default and submits `spell.feature.add`.
- Edit custom feature submits `spell.feature.update`.
- Remove custom feature submits `spell.feature.remove`.
- Use counters submit `spell.feature.uses`.
- Features with 10 or fewer uses render as clickable boxes. Larger pools render
  as a progress bar with -1/+1 controls and a numeric value.
- Feature rows show used/maximum, available uses, rest recovery and optional
  status effect.
- Short Rest / Long Rest for one character submit `spell.rest.character`.
- Long rest restores HP, clears temp HP, refreshes spell slots, refreshes long
  rest features and restores half of max hit dice, matching the legacy behavior.

## Inventory

- Character selection uses the same selected-character state as spells.
- Manual dropdown changes update the app-level selected character, so incoming
  state patches do not snap the page back to the last combat-card shortcut.
- Currency editing and Add item/database picker share one horizontal expandable
  menu. Only one is open at a time.
- Add custom item supports general note records, potion, scroll and magic item
  shapes through `inventory.item.add`.
- Add from item database uses saved item metadata and infers potion/scroll/magic
  type for the server action.
- Currency fields keep local drafts and commit on blur through
  `inventory.currency.set`.
- Inventory rows are compact summaries. Clicking a row opens a detail modal.
- Inventory rows do not repeat category labels; the section heading already
  provides the category.
- Item detail modals are large centered overlays intended for long notes and
  descriptions.
- Item detail modals include Edit. Saving submits `inventory.item.update`, so
  item text changes sync through the server and remain undoable.
- Quantity, transfer, remove and attunement live in the item detail modal; they
  are server actions and appear in inventory history.
- General items are intentionally free-form note records for clues, books,
  diaries and other campaign notes.

## Databases

- Databases are server state and autosave state in schema v3.
- Migration populates Magic Items and Potions databases from saved player
  inventories when matching entries are not already present.
- Databases page has Magic Items, Potions, Conditions, Player Characters and
  DM-only Monsters.
- Players can view/search/add/edit Magic Items, Potions and Conditions. Monster
  database and destructive imports/removals are DM-only.
- Magic Items, Potions, Conditions and Monsters have searchable cards, modal
  editors, per-database export and DM-only import.
- Database search and tabs stay visible. Add/import/export controls are grouped
  inside a collapsed Database actions panel.
- DM can export visible databases together and import all databases from one
  backup.
- Conditions are seeded with official 5e conditions plus legacy homebrew
  effects. The combat condition modal searches `conditionDatabase`.
- Player characters persist as saved sheets. Removing a player from Combat sets
  `activeInCombat: false` and keeps Spells/Inventory available.
- DM-only permanent player character delete requires browser confirmation and
  is undoable from database history.

## History And Concurrency

- Every confirmed action is ordered by the server and written into `actionLog`.
- Undo/redo stays page-scoped. Combat undo does not undo inventory work.
- Client drafts are local. Incoming server patches should not clear an
  unfinished damage, heal, item or feature form.
- Keyboard shortcuts are restored outside inputs and modals:
  Space/PageUp for next turn, PageDown for previous turn, Backspace for
  page-scoped undo and Shift+Backspace for page-scoped redo.

## Visual And Markdown

- The React UI uses a tactical dark dashboard style: dark panels, subtle
  borders, dense information and semantic action colors.
- Secondary tools are collapsed by default. Related tools should use horizontal
  expandable menus, with only one open at a time.
- Long descriptive text fields should use Markdown by default: inventory items,
  potions, conditions, monsters, statblocks, ability notes and future sheet
  notes.
- Markdown text is stored as plain Markdown-compatible strings and rendered
  through React nodes, not `innerHTML`.
- Markdown editors use a lightweight textarea toolbar with readable labels,
  preview and visually separated pop-out editing for longer notes.
