# Admin auth routing

The admin portal can route sign-in based on an `admin_users` Firestore record.

## Firestore shape

Each `admin_users` document should include:

- `email`: lowercase admin email.
- `fullName`: display name for the admin.
- `active`: boolean to allow or block access.
- `loginProvider`: `"password"` or `"beam_google"`.
- `tenantId`: tenant slug, such as `paynepros`.
- `adminRole`: role label returned with the admin record.

## BEAM-managed staff

Use `loginProvider: "beam_google"` for staff who should use BEAM / Google sign-in instead of a temporary password.

In local and mock-friendly environments, the app seeds the following users as BEAM-managed:

- `nija@paynepros.com`
- `ezra@paynepros.com`

## Flow

1. `/admin` looks up the admin record by email.
2. If `loginProvider` is `beam_google`, the portal starts Google sign-in with that email as `login_hint`.
3. Server-side admin checks resolve the same email against `admin_users` and require an active admin record.
4. Password-managed users are still identifiable in the UI, but this Firebase-only portal does not yet implement a password prompt.
