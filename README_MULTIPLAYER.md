# D&D Tracker - Multiplayer Setup

This app is now server-only. Run the Node server and open the DM/player URLs on
the same local Wi-Fi network.

## Install

```bash
npm.cmd install
```

PowerShell may block the `npm` wrapper, so use `npm.cmd` on Windows.

## Development

```bash
npm.cmd run dev
```

- Vite frontend: `http://localhost:5173?mode=dm&token=<token>`
- Backend/socket server: `http://localhost:3000`

The server prints the current DM token URL when it starts.

## Production-style local run

```bash
npm.cmd run build
npm.cmd start
```

Open:

- DM: `http://localhost:3000?mode=dm&token=<token>`
- Player: `http://<dm-local-ip>:3000?mode=player`

## Roles

- DM requires the local token printed by the server.
- Player mode can edit player character HP, effects, spells/abilities and
  inventory.
- Player mode cannot control combat flow, hidden monsters, monster abilities,
  databases, autosave, import or export.
- Players still see initiative and revealed monsters. Monsters reveal when
  their turn is reached.

## History

The app has one visible chronological action log, but undo/redo is scoped to
the currently active page. Undo on Inventory will not roll back a Combat action.
History keeps the last 30 days and at most 500 entries. Undo snapshots for the
most recent actions have a shared 16 MiB budget; older entries remain readable
until they expire, but cannot be undone once their snapshots are discarded.
The sequence number is a lifetime action counter, not the number of saved entries.
DM can use **Clear history** to remove the log and undo/redo without changing the
current campaign data.
The History sidebar starts collapsed. Open it from the navigation bar and use
**Collapse history** to give the full width back to the tracker. Keyboard
undo/redo works while history is collapsed too.

Routine autosaves serialize and write in a worker after a short debounce. Saves
run in order and replace the autosave through a temporary file. The manual
Autosave button waits for completion. Restart the server and reload connected
browsers after updating, because state patches now contain only changed fields.

Party Checks includes Stealth, manual totals, individual rolls, Roll all and
Roll empty. Results are saved per check in the DM toolbelt. Enter manual totals
before global aura / Pass without Trace bonuses; these toggles update the final
result dynamically. Automatic rolls retain the natural d20 for automatic 1/20
failure/success and show the individual dice, including inspiration.

## Combat setup and AOE

Combat uses one labeled **Add character / monster / object** form. Non-monster
objects have fixed initiative and optional HP/AC. **Add monster / object from
database** can filter monsters and objects separately.

Combat cards start with their **input** menu collapsed. Quick HP buttons,
conditions and reactions stay visible. Click a name in the sticky initiative
order to jump to that combatant's card without advancing the turn.
The DM's monster input menu includes **Monster number** (0 removes the instance
suffix). Renumbering preserves IDs, initiative and resources, updates the second
turn of a multi-turn monster, and supports Combat undo/redo.

Monster Abilities keeps current/effective maximum HP, temp HP and active
conditions in its sticky header. Conditions can be managed from there. Reaction
usage is also shown beside reaction Use buttons as **R used/max used**.

The DM toolbelt includes **AOE Resolver** for saving throws against players,
enemies, or both. Monster save bonuses come from their statblock, with ability
modifiers as the fallback. Enter save totals or roll them in the resolver.
Choose damage and conditions, exclude individual creatures, and inspect the
preview before using the single global **Apply** button. Successful saves take
half damage by default (or none using the selector) and receive no conditions.
The per-target **Half damage** checkbox halves damage again, rounding down.
Leveled conditions increase the existing level up to the database maximum;
simple conditions are not duplicated. Temp HP absorbs damage normally.

Only Apply changes campaign state. The whole AOE is one Combat history action
that the DM can undo/redo. Multi-turn monsters appear once and share the applied
HP/effects across their initiative entries. **New resolution** enables another
application after Apply.

## Condition duration and character resources

Conditions can optionally carry a number of rounds. Open **Duration** when
adding or editing a condition (also available in AOE); leave it empty or use
zero in the editor for no timer. Only the remaining number appears on the
condition badge. Timers decrease at the end of a complete combat round and
conditions disappear when they reach zero. Undo restores both the round and
the expired conditions.

Character Sheets show usable casting resources above Spells Known, within
spell groups and in spell details. **Cast** spends the resource for the selected
cast level; **Use** spends a resource directly. Preparation rules still apply
to Cast. The resource controls stay visible while scrolling a spell description.

The collapsed character setup includes **Casting type**. Standard casting uses
normal spellslots. Warlock casting links levels 1–5 to one custom feature and
can link levels 6–9 to separate features or native slots. All those resources
recover on short and long rests. Epic slots retain their normal recovery.
Existing Nif data defaults to Warlock Spells for levels 1–5, then Asuryan
Blessing, Force Cage, Storm of Light-Lings and Foresight for levels 6–9.
These are the same counters shown in Custom Features.

Divine Spark casting spends the active configured condition first, then one
use of the linked custom feature for each epic cast. It does not spend epic
spellslots or recreate the consumed condition. Existing Anir data defaults to
this profile. Both profiles can be changed in character setup.

Custom Features support Markdown descriptions and **Show in Actions / Attacks**.
A checked feature appears in both sections with the same usage counter, text
and editor. Ordinary descriptive Actions / Attacks entries remain available.
For resources such as Channel Divinity, edit the feature and open **Actions
sharing this resource**. Add as many named actions and individual Markdown
descriptions as needed. Each action's **Use** button spends one use from the
parent feature; all actions share its maximum, remaining uses and rest recovery.
The history entry names the action used. Editing or removing an action does not
reset the resource counter.

Features and their individual actions can be classified as **Action**, **Bonus
action** or **Reaction**. The ordinary action editor supports these categories
too, including reactions without a feature resource. Reactions default to
**Spend a reaction when used**; disable this for an exception. **Use + R** spends
one feature use and one character reaction atomically; standalone **Use R**
spends only a reaction. Either missing resource blocks the whole operation.
Manual usage boxes still adjust only the feature counter. Undo restores both
costs together, and reactions recover at the start of the character's turn.

The search above each character sheet searches known spells, custom features,
individual actions and ability notes by name and description, as well as
section names. Select a result to jump to its description or open its detail.
Quoted queries search names only. Arrow keys and Enter select results; Escape
clears the search. On narrow screens the section index uses a compact dropdown.

## Tests

```bash
npm.cmd test
npm.cmd run test:e2e
```

The e2e suite uses a separate autosave file under `test-results/`.
