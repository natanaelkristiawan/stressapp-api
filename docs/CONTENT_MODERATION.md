# OpenCode content moderation

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

## Setup

Set API-only environment variables (never in app/CMS builds):

| Variable | Value |
| --- | --- |
| `OPENCODE_API_KEY` | OpenCode Console inference key, preferably scoped to model requests |
| `OPENCODE_MODERATION_MODEL` | A Chat Completions model ID available to the key, with strict JSON-schema support |
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
   strict schema containing only `categories` and `uncertain`. Output is capped
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
