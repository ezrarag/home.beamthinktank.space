# Website Directory Admin Notes

## Collection
- Firestore collection: `beamWebsiteDirectory`

## Document Fields
- `label`: string (short dropdown label)
- `title`: string (card title)
- `subtitle`: string (card subtitle)
- `url`: string (absolute URL)
- `previewImageUrl`: string (thumbnail/screenshot URL, optional)
- `sortOrder`: number (ascending order)
- `isActive`: boolean
- `createdAt`: server timestamp
- `updatedAt`: server timestamp
- `createdBy`: string (uid/email when available)
- `updatedBy`: string (uid/email when available)

## Who Can Edit
- Read: public.
- Create/update/delete: only Firebase-authenticated users with custom claim `admin: true`.
- Admin writes are routed through Next API endpoints under `src/app/api/admin/website-directory`.
- In development mode, admin restrictions may be temporarily relaxed.

## How To Add / Update Entries
1. Sign in with a Firebase account that has `admin: true`.
2. Open `/admin/website-directory`.
3. Create or edit entries using the form.
4. Toggle active status or delete entries from the list.
5. Use **Seed Default Entry** to upsert the default BEAM Home Site entry.

## Expected Consumer Behavior (External Apps)
1. Prefer reading merged entries from `GET /api/website-directory` (includes internal + readyaimgo external entries).
2. Filter/consume only active entries (already filtered by the API route).
3. Display `title`, `subtitle`, and `previewImageUrl` in cards/modals.
4. Use `url` as the final destination link.
5. Use `label` for compact dropdown/menu labels.
6. Respect `source` to label rows/cards (`internal` vs `external`) where relevant.

## Preview Images (Microlink)
- External readyaimgo entries use Microlink screenshot URLs derived from each site URL.
- Internal entries follow the same pattern when `previewImageUrl` is blank.
- Admin form allows an optional `previewImageUrl` override; otherwise Microlink URL is auto-generated.
