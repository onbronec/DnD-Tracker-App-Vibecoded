# DnD Combat Tracker

Local Wi-Fi D&D tracker for DM and player devices. The app is now a
server-authoritative React/TypeScript frontend with a Node/Express/Socket.io
backend.

## Quick start

```bash
npm.cmd install
npm.cmd run build
npm.cmd start
```

The server prints:

- DM URL with a local token
- Player URL for other devices on the same Wi-Fi

Use `npm.cmd run dev` while developing.

## What changed in v2

- DM access is protected by a local token.
- Player permissions are enforced on the server.
- Clients submit small validated actions instead of full-state snapshots.
- Draft fields stay local until submitted, so another device cannot wipe a
  half-written heal, damage or item form.
- History is visible in a side panel. The log is global, but undo/redo is scoped
  to the current page.
- Monster and item databases live in server state and autosave.

## Tests

```bash
npm.cmd test
npm.cmd run test:e2e
```

See `README_MULTIPLAYER.md` for more operational details.
