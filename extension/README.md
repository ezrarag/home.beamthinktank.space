# BEAM Home DevTools Extension

This repo includes a Chrome side-panel extension at `extension/beam-devtools`.

## What It Does

- groups checklist items by the active Home route
- captures page context for Claude handoff
- captures page warnings and errors from the active tab
- stores shared Home checklist items in Firestore
- saves Google Drive folder shortcuts and lets you switch folders from the side panel

## Setup

1. Make sure this repo has `.env.local`.
2. Run `npm run build:extension` to auto-detect the public Firebase keys from `.env.local`.
3. Run the site locally with `npm run dev`, or open `https://beamthinktank.space` / `https://home.beamthinktank.space`.
4. In Chrome, open `chrome://extensions`.
5. Enable Developer mode.
6. Choose Load unpacked and select `extension/beam-devtools`.
7. Open the Home site, click the extension icon, and open the side panel.

If the build script finds `.env.local`, the extension will prefill the Firebase setup automatically. If not, it can still load the same config from the active Home tab when the app exposes it. Manual entry remains as a fallback.

## Notes

- The extension uses `devChecklists/home` by default.
- Localhost defaults to the `home` site slug in this repo.
- If `NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_*` is missing, the extension build falls back to `NEXT_PUBLIC_FIREBASE_*`.
- The Drive tab assumes “Google folders” means Google Drive folders and accepts either a full folder URL or a raw folder ID.
