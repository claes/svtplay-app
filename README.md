SVT Play – Electron Wrapper
===========================

A minimal Electron desktop app that opens `svtplay.se` in a native window.

Features
- Loads `https://www.svtplay.se/` in a single window
- Keeps navigation within SVT domains; opens external links in your browser
- Strips the `Electron/` token from the user agent for better compatibility
- Restrictive permissions by default

Requirements
- Node.js 18+ recommended

Install
1. Install dependencies:
   - npm: `npm install`
   - pnpm: `pnpm install`
   - yarn: `yarn`

Run
- Development: `npm start`

Notes
- This is a thin wrapper; it doesn’t modify or intercept SVT Play content.
- If videos don’t autoplay, they should start after interaction. We enable a permissive autoplay policy, but sites can still enforce their own rules.
- Packaging is not configured; if you want installers, consider adding `electron-builder` or `electron-forge`.

Project Structure
- `src/main.js` – Electron main process (creates the window)
- `src/preload.js` – Isolated preload (exposes a tiny API if needed)
- `package.json` – App metadata and scripts

