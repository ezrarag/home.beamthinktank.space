# Sky + Map Setup

This document covers what you need to gather/configure for the homepage Sky/Map entry.

## Current status
- Sky mode works now with canvas rendering + iOS motion permission flow.
- Map mode auto-switches:
  - If `mapbox-gl` package + `NEXT_PUBLIC_MAPBOX_TOKEN` are available, it uses Mapbox.
  - Otherwise it uses the fallback map-like UI.
- `@react-three/fiber`, `@react-three/drei`, and `mapbox-gl` are not installed in this environment yet due network access issues.

## Required variables
Add these to `.env.local`:

- `NEXT_PUBLIC_MAPBOX_TOKEN`
  - Needed for real Mapbox rendering once `mapbox-gl` is installed.
  - Get from your Mapbox account dashboard.

- `NEXT_PUBLIC_BEAM_SKY_STAR_COUNT` (optional)
  - Number of stars rendered in Sky mode.
  - Default: `220`.

- `NEXT_PUBLIC_BEAM_SKY_DRAG_SENSITIVITY` (optional)
  - Desktop/touch drag sensitivity multiplier for camera movement.
  - Default: `1`.

- `NEXT_PUBLIC_BEAM_SKY_PITCH_LIMIT_DEG` (optional)
  - Motion/drag vertical clamp in degrees.
  - Default: `60`.

## Existing server-side variables still used
- `READYAIMGO_BEAM_ROLES_URL`
- `READYAIMGO_BEAM_API_KEY`
- `SLACK_ADMIN_WEBHOOK_URL`
- `OPENAI_API_KEY` (for action AI generation)

## Dependency install (when network is available)
```bash
pnpm add @react-three/fiber @react-three/drei mapbox-gl
```

## Upgrade targets after install
- `src/components/SkyExperience.tsx`
  - Complete R3F adapter path (packages are runtime-detected already).
- `src/components/MapExperience.tsx`
  - Mapbox path is already wired and auto-activates once package + token are available.
