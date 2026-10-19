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

Web/iOS and Expo Go skip native registration. Web Firebase configuration/VAPID/
service-worker setup and iOS/APNs setup are still pending; the API accepts those
platform registrations once actual platform clients are added. Build/install a
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
