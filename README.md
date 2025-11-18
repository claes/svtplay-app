SVT Play – Electron Wrapper
===========================

A minimal Electron desktop app that opens `svtplay.se` in a native window.

Features
- Loads `https://www.svtplay.se/` in a single window
- Adds keyboard navigation for a leanback experience
  - Arrow keys navigate to closest focusable element geometrically
  - Keypad 1, 3 performs Shift-Tab, Tab for original focus behaviour
  - Keypad 2, 4, 6, 8 maintains original arrow keys behaviour
  - Keypad 5 brings up player controls
  - Keypad 7, 9 moves position while in player mode
  - Q quits unless a text field has focus
- Keeps navigation within SVT domains; opens external links in your browser
- Strips the `Electron/` token from the user agent for better compatibility
- Restrictive permissions by default

Build
- Designed for Nix, use provided flake.nix
  
Run
- npm: `npm install && npm start`
- Nix: `nix run`

HTTP Control API (local)
- The app starts a local control server on `127.0.0.1:18492`.
- Endpoints:
  - `GET /health` → `{ ok: true }`
  - `GET /status` → `{ ok: true, url: "…" }`
  - `GET /play?url=<encoded>` → navigates to the given SVT URL
- Only `svtplay.se` and `svt.se` URLs are accepted.
- Env:
  - `SVTPLAY_CTL_PORT` to change the port (default `18492`). If the port is unavailable, the app exits and does not start.

Examples
- `curl 'http://127.0.0.1:18492/play?url=https%3A%2F%2Fwww.svtplay.se%2Fvideo%2F...'`

Project Structure
- `src/main.js` – Electron main process (creates the window)
- `src/preload.js` – Isolated preload (exposes a tiny API if needed)
- `package.json` – App metadata and scripts

