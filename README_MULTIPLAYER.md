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

## Tests

```bash
npm.cmd test
npm.cmd run test:e2e
```

The e2e suite uses a separate autosave file under `test-results/`.
