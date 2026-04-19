# Firebase Setup Checklist (beam-home)

## Required Environment Variables
Create `/Users/ehauga/Desktop/local dev/home.beamthinktank.space/.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=beam-home.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=beam-home
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=beam-home.firebasestorage.app
READYAIMGO_API_BASE_URL=https://www.readyaimgo.biz
READYAIMGO_BEAM_ORGANIZATIONS_ENDPOINT=/api/beam/organizations
READYAIMGO_BEAM_PARTICIPANT_CONTEXTS_URL=
READYAIMGO_BEAM_PARTICIPANT_CONTEXTS_ENDPOINT=/api/beam/participant-contexts
READYAIMGO_CLIENTS_ENDPOINT=/api/clients?limit=1000
READYAIMGO_BEAM_API_KEY=changeme
SLACK_ADMIN_WEBHOOK_URL=https://hooks.slack.com/services/...
# Optional fallback if legacy readyaimgo clients feed adds auth:
# READYAIMGO_API_KEY=...
```

## Data Model (Current App)
- `users/{uid}/profiles/onboarding`
  - `role`
  - role-specific onboarding fields
  - `uid`
  - `email`
  - `completedAt` (ISO string)
  - `updatedAt` (server timestamp)

- `beamWebsiteDirectory/{docId}`
  - `label` (string, required)
  - `title` (string, required)
  - `subtitle` (string)
  - `url` (string, absolute URL, required)
  - `previewImageUrl` (string, absolute URL optional)
  - `sortOrder` (number/int)
  - `isActive` (boolean)
  - `createdAt` (server timestamp)
  - `updatedAt` (server timestamp)
  - `createdBy` (string uid/email)
  - `updatedBy` (string uid/email)

- `devChecklists/{siteSlug}`
  - `items` (array)
  - `lastUpdatedBy` (string)
  - `updatedAt` (server timestamp)

## Admin Access
- Website directory writes require Firebase custom claim `admin: true`.
- Set claim with Firebase Admin SDK (example): `setCustomUserClaims(uid, { admin: true })`.
- Admin UI route: `/admin/website-directory`.
- Seed default entry from the admin page via **Seed Default Entry**.
- Slack test route: `/admin` -> **Slack Webhook Test** card.

## Security Rules
- Firestore rules file: `firestore.rules`
- Storage rules file: `storage.rules`

## Deploy Rules
From `/Users/ehauga/Desktop/local dev/home.beamthinktank.space`:

```bash
firebase login
firebase use beam-home
firebase deploy --only firestore:rules,storage
```

## Verify End-To-End
1. Start app and complete onboarding while signed in.
2. Confirm document written to Firestore path:
   - `users/<uid>/profiles/onboarding`
3. Confirm unauthorized user cannot read/write another user path.
4. Run `npm run build:extension`, load `extension/beam-devtools` in Chrome, and confirm the extension can read/write `devChecklists/home`.
