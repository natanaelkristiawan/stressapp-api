# Member authentication

Member/profile identity is unified. TypeORM synchronize:true manages schema during
development; migration commands have been removed. See [MEMBER_MERGE.md](MEMBER_MERGE.md).
Profile writes remain separate work.

Implemented 2026-10-14. Email/password member authentication is separate from
CMS `admin-auth`. No Google sign-in in this step.
See the [maintenance guide](../docs/auth/README.md) and [implementation history](../docs/auth/HISTORY.md).

## API contract

Base path: `/member-auth`. Responses use the existing `{ success, alert, data }`
envelope. Requests reject unknown fields; email is trimmed and lowercased.

| Method/path | Body or authorization | Result |
| --- | --- | --- |
| POST `/register` | `name`, `email`, `password`, `agreeTerms: true` | Generic OTP notice; pending account, no session |
| POST `/login` | `email`, `password`, optional boolean `rememberMe` | `token`, `expiresAt`, `refreshToken`, `refreshExpiresAt`, `member` |
| POST `/refresh` | `refreshToken` | Rotated access/refresh pair; old refresh is rejected |
| POST `/forgot-password` | `email` | Generic recovery notice |
| POST `/otp/send` | `email`, `purpose: registration` or `recovery` | Generic OTP notice |
| POST `/otp/verify` | `email`, `purpose`, four-digit string `code`, plus `password` for registration | JWT/refresh session for registration or recovery `resetToken` |
| POST `/reset-password` | `resetToken`, `password` | Password updated; all old sessions revoked |
| GET `/me` | `Authorization: Bearer <access JWT>` | Current member identity |
| POST `/logout` | Same authorization | Current session revoked |

Registration verification creates a session and logs the member in directly. Pending users can request
another verification code from login after entering the correct password.
Re-registering can replace pending credentials only while the account is unverified.
Registration verification requires both the current pending password and its OTP,
preventing a pre-registered email from becoming an attacker-owned verified account.
Verified accounts are never changed by registration requests.

Implementation defaults preserve the mobile form: 8–72 character passwords with
letters, digits and symbols; maximum 72 UTF-8 bytes to avoid bcrypt truncation.
Passwords are not trimmed. Four-digit cryptographic OTPs expire after 5 minutes,
with at most 5 attempts per code; resend cooldown 60 seconds and 5 sends/email/hour.
Verification is additionally limited to 10 attempts/email/hour, login to
10 attempts/email/15 minutes, and public auth operations to 60/IP/15 minutes.
Redis limits fail closed. Behind a proxy, configure trusted proxy/IP handling
before relying on per-client IP limits; the current server does not trust forwarded headers.
Reset proof expires after 10 minutes and is single-use. JWT access expires after
exactly one day (86,400 seconds), as requested. Refresh sessions expire after
seven days, or thirty days with rememberMe. Refresh lifetime is an implementation
default; rotation does not extend that absolute expiry.

Passwords use bcrypt; OTPs use keyed SHA-256 with purpose/member binding;
random 256-bit refresh/reset credentials are stored only as SHA-256 hashes.
JWTs use HS256 with issuer temu-sobat, audience member, a session ID and member
subject. The member signing key is MEMBER_JWT_SECRET when configured; otherwise
it is derived from JWT_SECRET with a member-specific HMAC context. This isolates
member JWTs from legacy/admin authentication. A JWT never replaces database
session/account checks.
Member auth requests bypass legacy activity/request-body logging.
Account status/verification/session expiry are checked in the database for `/me`.
CMS middleware verifies expiry/scope before looking up a local profile; no external
identity synchronization or second database connection remains.
Unexpected server errors use a generic message.

## Database and local run

API startup and standalone seeds synchronize the configured mimate database from
entities. OTP/session foreign keys and uniqueness are declared in entity metadata.
The physical tokenHash primary-key column is retained for compatibility; for new
JWT sessions it stores the random session ID referenced by the JWT sid claim.


From `stressapp-api`, with the existing private server .env configured:

```sh
yarn install --frozen-lockfile --production=false
yarn build
```

The API runs with PM2. MySQL/Redis containers are installed and managed separately;
this repository no longer supplies their Compose setup. See [server connections](SERVER_INFRA.md)
and [GitHub PM2 deployment](GITHUB_DEPLOY.md). Production email uses Resend SMTP.
Preserve the existing JWT secret, database data and server credentials.

## Mobile

Existing layouts are preserved. All five auth screens now use the API;
forgot-password uses React Hook Form/Yup, matching registration/login/reset.
Registration passwords stay in scoped form memory through OTP verification and
are cleared after verification. Reset proof lives only in Zustand memory, never
URL parameters or persisted storage.
Native access/refresh credentials share one existing Expo SecureStore entry.
Web access tokens stay in memory; the API stores the refresh token in a host-only
HttpOnly cookie and restores authentication after reload. No auth token is written
to localStorage or sessionStorage.
App launch validates saved native sessions with `/member-auth/me`. A protected
401 triggers refresh and one retry; concurrent requests share one refresh.
Invalid/expired refresh clears the session; account-version checks prevent an old
request from using a newer account. Native writes are serialized to protect logout.
Invalid sessions are removed; temporary network failures retain the saved native
credentials for a subsequent retry/restart, while withholding authenticated UI state.
Login does not mark onboarding complete. Existing post-login routing still opens
the implemented home screen; server onboarding/profile persistence is a later feature.
Member changes reset forum interests and remount the scoped mood provider.

Copy `stressapp/.env.example` into local Expo configuration as appropriate.
Default/deployed URL is `https://api.temusobat.tech`. For local testing, explicitly
set `http://localhost:3111` for web/iOS simulator or `http://10.0.2.2:3111` for Android. A physical phone needs a reachable API
URL in `EXPO_PUBLIC_API_URL`; the Docker port currently binds to host loopback.
Restart Metro after changing Expo environment variables. Use HTTPS outside local testing.
CORS defaults allow the web preview on localhost/127.0.0.1 port 8081;
set comma-separated `CORS_ORIGINS` for other authorized web origins.

Google button explains that Google login is a later step. Other mobile feature
screens still contain mocks, and new member sessions intentionally do not
authenticate legacy member endpoints or CMS routes. Member profile/social integration remains a separate step. The external datasource
has been removed; CMS uses local profile IDs and requires a fresh login.
Expo package.json declares SDK 57; AGENTS.md's SDK 54 instruction was read,
but no Expo dependencies were changed. SDK 57 hosted SecureStore docs were
unavailable during implementation; existing installed APIs were reused and type-checked.

## Verification

The runnable integration check is restricted to the local Docker database. It
creates and cleans synthetic test members, reads their OTP emails from Mailpit,
and exercises success, password-bound pending registration, cached JWT expiry,
invalid input/credentials, normalization, expired codes,
purpose separation, attempt/cooldown limits, replay, concurrent consumption,
reset-proof expiry, session expiry/revocation, suspended accounts and admin isolation.
Test emails remain in Mailpit. Each local test run uses a distinct loopback
client address while preserving the configured rate limits. Counters expire automatically.

The API integration script requires a separately provisioned disposable MySQL,
Redis and Mailpit environment, with DB_HOST=mysql. It intentionally refuses the
host PM2 production database. Historical Docker verification remains recorded
in the auth journey; removed Compose files are not current setup instructions.


Local checks: `npm run build` in API; `npx tsc --noEmit` and targeted ESLint in mobile.
Physical-device/native runtime behavior and production email delivery require
verification in their deployment environments.

Mobile web smoke checks passed for empty login/registration validation, API login
errors, recovery navigation and invalid OTP, successful login displaying API
identity, and logout returning to login. Registration errors use an explicit
useFormState subscription, verified with the enabled React Compiler.

Run `node test/member-auth-refresh.cjs` from stressapp for adapter/store refresh
checks with HTTP and native keychain boundaries mocked. No native runtime claim
is implied by this check. Function comments explain purposes, results and errors.

## Single database (2026-10-14)

Only the mimate datasource remains, configured by DB_DATABASE_MIMATE.
DB_DATABASE_MMID is no longer read and can be removed from the server .env.
No database/table/data deletion or schema synchronization was executed.
CMS tokens now carry local profile IDs in the unified members table and explicit CMS scope; old
external-ID tokens are rejected, so existing CMS sessions must log in again.

Removed external vehicle enrichment from profile/admin/vote exports and external
phone lookup from CSV exports; legacy fields remain empty for compatibility.
Admin profile updates no longer write external users. Quest profile-completion
checks use the local name/bio/hobby. Historical external entity definitions remain
in source but are not registered in runtime or datasource metadata.

Normal startup excludes the standalone seeder. After building, run
`node test/single-database.cjs` to inspect datasource/providers/entity relations
without connecting to a database. Local identity tests are in auth.local.spec.ts.

OTP delivery runs asynchronously in the `member-otp-email` BullMQ queue using
BULL_HOST/BULL_PORT/BULL_PASSWORD. The existing API PM2 process hosts the worker.
Registration/resend/recovery await queue acceptance, not SMTP delivery. Three
attempts retry after 5 and 10 seconds; expired/replaced/consumed codes are skipped.
Completed and failed jobs are removed to avoid retaining OTP payloads. See
../docs/auth/README.md for queue failure/resend limitations.

## Browser cookie sessions (19 October 2026)

Native endpoint contracts remain unchanged. The app selects these web-specific
routes for browser authentication, reusing the same member service/session table:

| POST route | Body | Result |
| --- | --- | --- |
| `/member-auth/web/login` | Existing LoginDto | Access token, expiry timestamps, public member; refresh cookie |
| `/member-auth/web/otp/verify` | Existing VerifyOtpDto | Registration session + cookie, or recovery proof without a cookie |
| `/member-auth/web/refresh` | `{}` | Rotated cookie and fresh access session |
| `/member-auth/web/logout` | `{}` | Revokes the cookie session and clears its cookie |

Web JSON never contains the refresh token. `member_refresh` is HttpOnly,
host-only (no Domain), SameSite=Lax, Path=/member-auth/web, and expires at the
existing fixed session expiry (7 days, or 30 with remember-me). Rotation never
extends this expiry. Secure is enabled for HTTPS frontend origins or NODE_ENV
production; development HTTP origins allow local HTTP cookies.

All web cookie routes require an exact configured CORS Origin and the custom
`X-Member-Web: 1` header; native clients keep their original bearer/body-token
routes. Refresh/logout reject nonempty bodies. Missing/malformed/duplicate cookies
are rejected. Cookie responses use Cache-Control private, no-store. Web auth is
excluded from request-body logging. Failed refresh leaves the cookie intact to
avoid deleting a newer cookie another tab may have set; invalid refresh still
clears the requesting page's in-memory session. Logout works without a live access
JWT and deletes only the matching refresh-hash session, retaining other devices.

The browser adapter uses credentials:include and serializes cookie changes with
Web Locks when supported. The Zustand store continues to own session state,
shares concurrent expired-token refresh within the page, and rejects stale account
responses. Browser tabs share one cookie login; native installations remain separate.
If another tab logs into a different account, the old page rejects refresh rather
than retrying an old account's request under the new identity; the newer cookie is
retained. Logout uses member-first locking and the stable session ID to coordinate
with simultaneous refresh.
No periodic timer is required: refresh runs on page startup and after protected
401 responses, followed by one retry. Network failure retains the browser cookie
for a later reload/retry; it does not bypass authentication.

Deploy API and app together, then log in again to establish the first cookie.
Production frontend/API must use the same HTTPS site (temusobat.tech and
api.temusobat.tech). Local frontend/API must use the same hostname: e.g.
http://localhost:8081 and http://localhost:3111, with EXPO_PUBLIC_API_URL set before
starting/exporting Expo. Do not mix localhost with 127.0.0.1 or a local frontend
with the remote production API for this SameSite=Lax setup. Add any alternate
frontend origin to CORS_ORIGINS. Restart Metro after URL changes.

Manual browser check: log in, inspect the cookie under the API host in DevTools,
reload a protected page, and confirm POST /member-auth/web/refresh succeeds.
The cookie is intentionally unavailable through document.cookie. Logout and
reload must stay logged out. Automated boundary coverage:
`npm test -- --runInBand member-auth.web` (temporary localhost HTTP server;
service/repository boundaries mocked) and `node test/member-auth-web.cjs` from
the app (actual adapter/store, simulated page reload/cookies and HTTP).
Real production browser/device verification remains pending.
