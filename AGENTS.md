AGENTS.md
=========

Purpose
- This file guides automated agents (and humans) working in this repo.
- Keep the app minimal: an Electron wrapper around `https://www.svtplay.se/`.

Scope
- Applies to the entire repository unless a more specific AGENTS.md is added deeper in the tree.

How to Run
- Node: `npm install` then `npm start`.
- Nix (recommended):
  - Dev shell: `nix develop` then `npm start` or `electron .`
  - Build package: `nix build` → run with `./result/bin/svtplay-app`
  - Run directly: `nix run`

Project Layout
- `src/main.js` — Electron main process only.
- `src/preload.js` — Isolated preload; do not add Node globals to the page.
- `assets/icon.png` — Optional app icon (PNG). Keep 512×512.
- `flake.nix` — Wraps the app using system Electron; no bundling.

Conventions
- JavaScript ESM (`"type": "module"`); target recent Electron.
- Keep dependencies at zero unless absolutely necessary.
- Prefer small, focused changes; avoid broad refactors.
- Match existing style: concise, no inline comments unless clarifying a non-obvious choice.

Security Defaults (do not relax without reason)
- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true` in `BrowserWindow`.
- Keep navigation within SVT domains; open external links with `shell.openExternal`.
- Restrictive `permissionRequestHandler`; only allow if explicitly justified.
- Keep `webSecurity: true`.

Electron Notes
- Autoplay: `autoplay-policy` is set to allow autoplay
- User-Agent: we strip the `Electron/` token
- Menu: keep menu hidden; if adding shortcuts, use a minimal application menu.

Nix Guidelines
- Use the existing `flake.nix`; prefer wrapping system Electron over bundling.
- If adding new files needed at runtime, ensure `flake.nix` copies them to `$out/lib/svtplay-app`.
- Keep `meta.mainProgram = "svtplay-app"` and avoid unfree metadata flags.

Packaging (optional, only on request)
- If installers are requested, propose `electron-builder` or `electron-forge`. Keep configuration minimal and platform-neutral.
- Do not introduce network-based build steps in Nix; prefer wrapping.

Versioning
- When making a user-visible change, bump `version` in `package.json`. Keep `flake.nix` version in sync if changed.

Testing / QA
- No automated tests. Perform manual smoke tests:
  - App launches; homepage loads
  - Video playback works
  - External links open in system browser
  - Back/Forward and reload via standard shortcuts work (Cmd/Ctrl+R, etc.)

Do Not
- Add preload bridges that expose Node primitives or FS access to the page.
- Disable `webSecurity` or enable remote modules.
- Add heavy dependencies or UI scaffolding; this is a wrapper app.

