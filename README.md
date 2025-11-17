SVT Play – Electron Wrapper
===========================

A minimal Electron desktop app that opens `svtplay.se` in a native window.

Features
- Loads `https://www.svtplay.se/` in a single window
- Adds keyboard navigation for a leanback experience
  - Arrow keys navigate to closest focusable element geometrically
  - Keypad 1, 3 performs Shift-Tab, Tab for original focus behaviour
  - Keypad 2, 4, 6, 8 maintains original arrow keys behaviour
  - Q quits unless a text field has focus
- Keeps navigation within SVT domains; opens external links in your browser
- Strips the `Electron/` token from the user agent for better compatibility
- Restrictive permissions by default

Build
- Designed for Nix, use provided flake.nix
  
Project Structure
- `src/main.js` – Electron main process (creates the window)
- `src/preload.js` – Isolated preload (exposes a tiny API if needed)
- `package.json` – App metadata and scripts

