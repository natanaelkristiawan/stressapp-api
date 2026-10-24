# OpenCode content moderation

## CMS-managed OpenCode credentials (2026-10-24)

Use the existing `/settings/moderation` page → OpenCode provider. Enter a key and
model ID, then Save key and model. An empty key preserves the effective key;
changing only the model is supported. The existing `.env` OPENCODE_API_KEY and
OPENCODE_MODERATION_MODEL remain fallback values until the first CMS save. The
page never displays a saved key; it clears successfully submitted keys. Nothing
is stored in browser storage and no `.env` file is rewritten.

Guarded GET/PUT `/cms-settings/moderation` returns only configured/model/version.
PUT accepts `{apiKey, model, version}` with bounded printable key characters and
model IDs restricted to letters, digits, dot, underscore and hyphen. The endpoint
requires the existing live CMS admin guard, excludes request logging and uses
private/no-store responses. Stale concurrent edits return 409. Model access and
key validity must be checked using the existing Test moderation button; saving
alone does not prove provider access.

The API reuses setting_config under reserved key moderation.private-provider.v1,
encrypting the key/model using AES-256-GCM and a purpose-derived JWT_SECRET key.
JWT_SECRET must be present and consistent across API/worker processes. Keep this
secret with database backups: changing it makes stored settings unreadable; plan
the corresponding re-encryption/reset before server-secret rotation. Generic
settings list/read/write/delete routes exclude this private entry. No schema or
package changes were needed. Each check reads an immutable current snapshot;
configuration versions invalidate old cache entries and obsolete retry jobs.
In-flight checks finish using the snapshot with which they started.

Verification: focused provider/security/HTTP tests, existing moderation boundaries,
standalone real Redis retries and disposable MySQL HTTP integration pass (encrypted
storage, blank-key retention, two-admin conflicts and existing content flows).
API/CMS builds, CMS TypeScript and scoped lint pass. Real OpenCode credentials,
browser interaction and deployment were not exercised.


## Four-type moderation (confirmed and implemented 2026-10-23)

The current policy is `opencode-four-types-v3`. OpenCode returns exactly
`{"type":"safe"}` with one of `self_harm`, `sexual`, `sara`, `bullying`, `safe`,
`uncertain`. Priority is self_harm > sexual > sara > bullying. Profanity and threats
map to bullying; sexual education and neutral/reporting context remain allowed.
Safe publishes; uncertain/provider failure stays pending; the four violation types
reject with the matching message. Self-harm gets supportive wording, no account
penalty. The AI does not write notification text or perform unrelated tasks.

CMS Settings → Content Moderation → Notification messages edits four fixed,
nonblank plain-text messages (maximum 2000 characters each). Configuration reuses
`setting_config` under `moderation.notification-messages.v1`; missing rows initialize
once without overwriting existing edits. GET/PUT `/cms-settings/moderation/messages`
requires a live authorized admin. PUT includes `{messages, version}`; stale edits
return 409. No schema migration or dependency was added. Test results include
`type` and `notificationMessage`; each test reads current configuration even when
the classification is cached. Sanitized provider preview and admin write bypass
remain. Missing/corrupt message configuration fails closed.

Queued psychoeducation comments store the matching message with the exact rejected
revision; only their author sees type/message. Replayed saves retain that snapshot.
Later CMS changes apply to new decisions, not historical snapshots. Mobile shows
inline feedback and one popup per rejected revision in the authenticated provider
session, with a support title for self_harm. Logout/account changes reset that state.
The defaults exclude unverified phone numbers from the source CSV. Push delivery,
account penalties and human escalation are outside this step.

Validation: 97 focused API tests, real disposable MySQL HTTP + BullMQ/Redis worker
integration (including self_harm and bullying messages, private visibility, replay,
concurrent CMS writes and revision retries), standalone Redis lock/cache/rate tests,
CMS boundary tests, mobile adapter/provider tests, API/CMS builds, mobile web export,
TypeScript and scoped lint pass. AI responses are synthetic in tests; live OpenCode
quality, real browser interaction and physical-device popup behavior need acceptance
checks after deployment. Deploy API/worker before CMS/mobile.


The shared `ContentModerationService.assertPublishable(fields, actorId)` moderates
forum post create/edit, comments/replies create/edit (including psychoeducation
comments), and admin re-publication of hidden forum posts. Existing controllers,
authorization and success response contracts remain. No public AI endpoint or
chatbot, manual review queue, frontend dependency, or new npm dependency.

## Policy

Only these text violations reject publication: SARA attacks/discrimination,
harassment/bullying, profanity/insults (including `goblog`), threats/incitement
against others, and pornography/erotic descriptions/sexting/sexual conversation.
Neutral group mentions and sexual education/clinical health discussion are allowed.
The model must consider Indonesian/English slang and context. Uncertain, refused,
truncated, malformed, unavailable or rate-limited classifications never approve.
No OCR/audio/video scanning, private chat/mood scanning, or unrelated classification.
CMS-authored educational article/video content is outside this user-content filter.
Existing manual CMS soft deletion remains available. Server-authorized CMS writes
skip AI as described below.

## Authorized CMS bypass

The post/comment create/edit handlers and admin forum edit/show handlers now use
`CmsMembersGuard`, after the existing CMS JWT middleware. It calls the existing
`AdminAuthService.currentAdmin` lookup to verify the live admin record and active,
nondeleted linked profile. Only those guarded handlers pass the internal bypass
argument; request bodies, query strings and source headers cannot set it.

Authorized CMS writes do not call OpenCode, Redis moderation cache/rate limiting,
or the retry queue. Saved metadata records `cms-admin-bypass-v1`, `model:not-used`,
the CMS profile ID as `approvedByAdmin`, and a UTC timestamp. Existing DTO validation,
post/comment ownership, content visibility and other authorization remain.

Service calls default to moderation unless explicitly authorized by a guarded CMS
handler. The existing legacy post/comment controllers currently accept CMS JWTs;
new member-auth forum integration remains separate. Future member handlers must
use the default moderated call, including when a member also has an admin account.
No decision is based on a mobile/browser user agent or client-supplied role.

## CMS Settings test

Settings → Content Moderation calls admin-only `GET /cms-settings/moderation`
for safe setup presence/model and `POST /cms-settings/moderation/test` with
`{"content":"text to test"}`. The existing CMS JWT middleware and live
`CmsMembersGuard` protect both routes. DTOs reject blank/non-text/over-10000-
character content and unknown body fields. Test bodies are excluded from routine
request logs and responses use `Cache-Control: private, no-store`.

The test deliberately calls `moderateContent` directly, without the CMS publication
bypass. It returns `{ data: { action, categories, model, policy, checkedAt, error? } }`
inside the normal success envelope. Publish/reject/pending are test decisions,
all HTTP 200; invalid input/auth/rate-limit errors retain normal 400/401/429 behavior.
Existing rate limits, caching and pending classification retries apply. No content
is inserted, published, edited or notified. Repeated text may show a cached result
for 15 minutes; pending results can be checked again after a minute. Configuration
presence does not prove connectivity or model/schema compatibility.

## Setup

Set API-only environment variables (never in app/CMS builds):

| Variable | Value |
| --- | --- |
| `OPENCODE_API_KEY` | OpenCode Console inference key, preferably scoped to model requests |
| `OPENCODE_MODERATION_MODEL` | A Chat Completions model ID available to the key (DeepSeek uses JSON mode) |
| `OPENCODE_MODERATION_TIMEOUT_MS` | Default 10000; integer 1000–30000 |
| `OPENCODE_MODERATION_RETRY_ATTEMPTS` | Default 3 background attempts; integer 1–3 |

Both key and model are required for successful checks. Missing key keeps submissions
unpublished; setting a key without a valid model ID fails startup. No secret is
seeded, requested in chat, or exposed in responses/logs. Existing Redis/BullMQ
settings must also work. Restart the API after configuring.

One fixed HTTPS endpoint is used:
`https://opencode.ai/inference/openai/v1/chat/completions`.
OpenCode's API uses the OpenAI-compatible wire format, but this implementation
calls OpenCode using installed Axios, with no OpenAI SDK/key/API request.
See [OpenCode inference](https://opencode.ai/v2/docs/console/api/inference/) and
[model endpoints](https://opencode.ai/v2/docs/console/models/).
Only Chat Completions models work here; GPT Responses/Claude/Gemini endpoints need
a different transport. Model-specific schema/retention support and moderation
quality require live verification with the selected model before deployment.

## Workflow and cost bounds

1. Existing DTO/ownership checks run; the service validates text fields again.
2. Serialize title/body, supplied tags/poll labels, or comment text. Maximum 12000
   serialized characters; DTOs also bound title (500), body (10000), comments
   (5000), tags (10 × 100), poll options (10 × 300).
3. An actor/content/model/policy SHA-256 key reuses the decision for 15 minutes.
   Redis locks deduplicate concurrent identical requests. Fresh requests are
   limited to 10/member/minute and provider calls to 200/API installation/minute,
   shared across API instances using the same Redis. Cached results cost no AI call.
4. Send one system instruction and untrusted content, no history/tools, with a
   schema containing only `categories` and `uncertain`. DeepSeek Chat Completions
   uses documented `json_object` mode with an explicit shape example and
   `thinking: { type: disabled }`; other models retain `json_schema` mode. The
   backend strictly validates the same fields/categories for either format. Output is capped
   at 120 tokens; no generated explanations or model chain. HTTP timeout is bounded,
   redirects disabled, response limited to 16 KiB. Parse and validate JSON locally.
5. For member/default calls, empty categories + certain = publish. Any agreed violation = HTTP 422. Uncertain
   or failed classification = HTTP 503 and no publication/write/notification/points.
6. Pending classifications enqueue bounded exponential retries (15/30/60 seconds,
   subject to queue availability). Jobs older than 15 minutes are ignored; completed
   and exhausted jobs remove their text. Queued text necessarily lives in private
   BullMQ Redis until processed/removed; a stopped worker can retain it longer.
7. Retry jobs only classify. **The member must submit again to publish**, reusing
   the result and rerunning authorization. No stale post can publish in background.
   After exhausted retries the pending decision stays cached until its 15-minute
   expiry; a later submission starts a new bounded cycle. No infinite worker loop.

A rejected/pending edit preserves the previous public version. Pending/rejected
submissions are never inserted into the public Post/Comment tables, so existing
feeds/detail/count queries cannot expose them. The frontend should preserve its
draft on 503 and offer resubmit; existing static/new member forum integration is
separate work. New submissions are not guaranteed duplicate-write idempotency;
this service deduplicates AI requests, not the existing post creation contract.

## Storage and responses

Post and Comment each add one nullable `moderation` JSON column (`select:false`):
action, categories, provider model (or not-used for CMS bypass), policy version,
UTC check timestamp and CMS approver profile ID when applicable.
Existing rows stay null; ordinary reads do not expose the metadata. Current
user-approved `synchronize:true` applies the columns on startup; no migrations or
production/schema startup were run in this task. Pending/rejected decision metadata
and safe error codes live in Redis for 15 minutes, not a permanent audit history.
Post/comment request bodies are excluded from routine request logging.

Existing endpoints and envelopes remain. For example, `POST /post/create`:

```json
{"title":"Diskusi agama","content":"Saya ingin mempelajari perbedaan agama di Indonesia.","spaceId":1}
```

Success returns the existing Post response. `{"title":"goblog","spaceId":1}` is
rejected when the classifier identifies profanity:

```json
{"success":false,"alert":{"code":422,"message":"Konten ditolak: SARA, perundungan, kata kasar, ancaman, atau konten seksual."},"data":null}
```

Pending uses HTTP 503 with the same envelope and a retry message. Abuse limits use
429. No provider response, submitted content, API key or internal error is returned.

## Verification

From `stressapp-api`:

```sh
npm run build
npm test -- --runInBand content-moderation.service.spec.ts
node test/content-moderation-boundary.cjs
node test/content-moderation-redis.cjs
npx eslint src/content-moderation/*.ts
```

The Redis check requires local `redis-server` and permission to create a temporary
UNIX socket; it starts an isolated instance and removes it. AI responses are always
mocked. Unit tests verify policy branches, not real linguistic accuracy. No real
AI call, deployed change, private credential setup or production DB change occurred.
Prompt injection is constrained by instruction/data separation, strict parsing,
fixed categories, no tools and no user-facing generated answer; model mistakes
remain possible and need real Indonesian evaluation before launch.

## DeepSeek compatibility and safe diagnostics (22 October 2026)

A successful plain greeting curl verifies key/endpoint/model access, but not the
classification request's JSON mode, timeout or output budget. DeepSeek documents
JSON mode as `response_format: {type: json_object}` with a JSON example in the
system prompt. For `deepseek-*` models the service now sends that format and
requests reasoning disabled; it omits the unsupported optional storage flag.
The 120-token output limit remains. Parsed classification fields still undergo
the same strict local validation; malformed output cannot publish. See
[JSON output](https://api-docs.deepseek.com/guides/json_mode/) and
[thinking mode](https://api-docs.deepseek.com/guides/thinking_mode/).
OpenCode forwarding/actual model behavior needs live server verification.

Pending/unavailable results now include an optional fixed `diagnostic` code:
not_configured, cache_unavailable, busy, timeout, authentication_failed,
access_denied, rate_limited, request_rejected, provider_unavailable,
output_truncated, provider_refusal, or invalid_response. CMS maps these to fixed
setup guidance. No raw provider errors, submitted text, keys or reasoning are
returned/logged. Member publication errors remain the existing safe 422/503.
`opencode-sara-abuse-sexual-v2` uses a new cache fingerprint so earlier generic
pending decisions do not mask the fix; existing cache keys/jobs expire naturally.
If the diagnostic is timeout, the existing OPENCODE_MODERATION_TIMEOUT_MS can be
set up to 30000; it remains 10000 by default. No automatic budget increase.

## Admin-only provider response preview (22 October 2026)

The CMS test endpoint now calls `testContent`, which wraps the normal classifier
with a request-local response observer. The returned test result has
`providerResponse` containing only bounded HTTP status, response ID/model, finish
reason, content (2048 characters), token counts (including reasoning-token count
when supplied), and provider error type/code/message (1024 characters).
Headers, request config, credentials and reasoning text are never copied. Exact
submitted fields/known key values and recognizable bearer/key strings are redacted.
UI renders the snapshot as escaped plain JSON, with a strict allowlist schema.

The response snapshot is never cached, stored on Post/Comment, put in a retry job,
or logged. Member methods return normal moderation results without the snapshot.
The existing live-admin guard/no-store headers/body-log exclusion protect this
preview. Cached decisions and failures before receiving a provider response return
null; the UI explains that different test text requests a fresh check. Background
retries do not capture previews. No extra provider request or automatic cache bypass.
