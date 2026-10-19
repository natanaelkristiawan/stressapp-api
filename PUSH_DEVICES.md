# Member push registrations

Implemented 19 October 2026. New `member_push_devices` table is synchronized by
existing development TypeORM startup and discovered by the standalone datasource.
Each row belongs to an existing login session through a cascading session FK.
No hardware device identifiers are collected; the independent login session
identifies this app/browser login installation.

## Routes

Member-only bearer JWT, live session and eligible account required. Member/session
identity comes from the guard, never body fields. Existing success/error envelope;
no token/session IDs are returned. Registration request bodies are excluded from
request logging. Public auth identity responses remain unchanged.

- `PUT /me/push-devices`: `{ platform, provider, token }`. Platforms: `android`,
  `web`, `ios`. Android/web use `fcm`; current Expo-native iOS uses `apns`. Tokens
  must be 20–4096 characters in the approved opaque token alphabet; APNs tokens
  must be 64 hex characters and are normalized lowercase. Unknown fields, blank/
  malformed tokens and mismatched providers get 400. Returns
  `{registered:true, platform, provider, updatedAt}` with server UTC timestamp.
- `DELETE /me/push-devices/:platform`: removes only the requesting session's
  selected platform registration. Idempotent response `{registered:false,platform}`.
  No endpoint lists tokens or lets members/admins read or change other sessions.

Unique session+platform permits independent registrations on multiple login
sessions. Unique SHA-256(provider+token) prevents the same physical push token
remaining subscribed to multiple accounts/sessions. A newer login of that same
installation takes ownership of its token; other devices remain registered.
Upserts/rotation and account-switch reassignment are transactional, using auth's
member-first locking order. Conflicting token registration races return safe 409
for retry. Raw tokens are stored for delivery but excluded from default entity
selection and all public output. The current authenticated client is trusted to
supply its provider-issued token; syntax validation does not prove provider
ownership or verify deliverability.

JWT refresh retains the session key, so refreshing does not duplicate a device.
Successful logout, password-reset and CMS revocation delete affected session rows;
the FK automatically deletes their push registrations, including if the client
cannot make a separate unregister call. Other live sessions/devices remain.
Expired sessions may retain inactive rows until session cleanup; internal
`PushDevicesService.recipients(memberId)` excludes expired/revoked, suspended,
deleted or unverified/ineligible recipients and returns all eligible installations
for a future delivery worker. No notification sending or Firebase Admin credentials
are implemented by this step.

## App integration

The root's PushRegistration component runs after password login, successful
registration OTP verification and native session restoration. It rechecks on
foreground and subscribes to Android native token changes. Uses existing
Zustand/HTTP refresh generation checks; no duplicate session store or persistent
push-token cache. Android creates its default channel, requests permission only
when permitted, and submits a native FCM token using the protected endpoint.
Denied permission unregisters this session's Android slot. Errors preserve login
and show a token-free Android toast, with retry on foreground/token/session changes.
Requests that finish after account changes/unmount cannot schedule more work.

Web and Expo Go skip native registration. Web now has Firebase configuration,
VAPID, permission and service-worker integration through the separate web root
component. Native iOS/APNs setup remains pending. Build/install a
new native Android app before testing FCM. Private assessment data is never sent
in these registration requests.

## Verification

- API build/scoped lint; existing auth/scoring unit tests.
- `PUSH_TEST_PORT=<isolated-local-mysql-port> node test/push-devices.integration.cjs`
  creates/drops a unique synthetic schema. Real HTTP/DTO/JWT/SQL checks cover
  repeat-sync, multiple devices, same-token updates, rotation, refresh, account
  switching, cascading logout, deny/invalid input and recipient exclusion. Queue/
  Redis transport are mocked; no application .env or deployed database is used.
- App: `node test/push-registration.cjs`, `node test/member-auth-refresh.cjs`,
  scoped Expo lint, TypeScript check and static web export. Native/HTTP boundary
  mocks cover permissions, token refresh, stale cleanup and unsupported platforms.
  No physical-device push delivery was verified.

## CMS dummy notification test (19 October 2026)

CMS **Settings → Push Notifications** (`/settings/push-notifications`) offers one
member-email form and Send test notification button. Reuses existing Settings
layout, CMS session, admin guard and member device registrations. No broadcast,
free-text message editor, token viewer or new database table.

Admin-only routes, behind existing CMS JWT middleware and live CmsMembersGuard:

- GET `/cms-settings/push`: `{configured, projectId}` configuration presence only.
  True means environment settings exist; it does not verify credentials or delivery.
- POST `/cms-settings/push/test`: `{email}` (trimmed/lowercased, valid email,
  max 254; unknown fields rejected). Resolves an active verified mobile member,
  reuses live eligible session recipients and sends fixed Indonesian test text
  to every registered FCM Android/web device. APNs-only iOS devices are skipped.
  Returns `{attempted, accepted, failed, skipped, failures:[{code,count}]}` in the
  existing data envelope. No member/device tokens or provider error messages.

Redis limits: five test requests per admin per minute and five per target email
per minute. Firebase batches are bounded to 500 recipients. Send requests are not
replayed automatically; ambiguous errors count as unconfirmed failures because
retries can produce duplicates. The UI prevents concurrent submits, retains input
on failure, names the last recipient and shows accepted/failed/skipped counts.
Accepted means Firebase accepted a message, not that a device displayed it.
Invalid/expired registrations are reported without deleting database records.
Settings/test responses are private/no-store and excluded from request-body logs.

### Private server setup

The API uses Firebase Admin SDK (Node.js 24). It initializes lazily, so missing
credentials do not prevent unrelated API startup. In Firebase Console, select
`temu-sobat` → Project settings → Service accounts → Firebase Admin SDK, and
create a private service-account key for an identity allowed to send FCM messages.
Install the JSON **outside the repository/web root**, readable only by the API
process user. Never place it in app/notification or CMS/public; the existing
Android google-services.json and web VAPID key cannot authorize server sending.

Configure the API environment privately, then restart/reload PM2:

```dotenv
FIREBASE_PROJECT_ID=temu-sobat
GOOGLE_APPLICATION_CREDENTIALS=/etc/temu-sobat/firebase-admin.json
```

Use the actual private server file path. The key must belong to the same Firebase
project as client registrations; the FCM API must be enabled. `configured:false`
means an environment value is missing/invalid. A 503 or all-failed result requires
checking file access, key validity, project permissions and outbound access.
Do not paste private keys into the CMS or chat. See Firebase Admin setup:
https://firebase.google.com/docs/admin/setup

### End-to-end manual check

1. Deploy API and CMS together and configure server credentials above.
2. Log into the member app/web, allow notifications and verify its device
   registration succeeds. Keep this member session active.
3. In CMS Settings → Push Notifications, enter that member's login email and click
   Send test notification. No real test is sent until this explicit action.
4. Check acceptance counts and the member device. Keep Android in the background;
   foreground Android display handling is separate from registration. On web,
   switch tabs for a system notification or remain foreground for the app notice.
5. Test the same member on two devices to confirm both eligible registrations
   receive the notification. Logout/revoked/expired sessions are excluded.

Verification: seven isolated Nest HTTP/DTO/admin-guard/service tests use mocked
Firebase/database/Redis boundaries; CMS schema/API boundary script and browser
empty/error/success/navigation checks use synthetic data. API/CMS builds and
scoped lint pass. Browser preview: /tmp/cms-push-notifications-preview.png (mock
acceptance counts, not evidence of real Firebase delivery). No private server key
was provided/configured and no live FCM send was attempted. Assessment reminder
scheduling and native iOS delivery remain separate work.
