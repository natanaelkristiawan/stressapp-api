# One-to-one chat

Updated 27 October 2026. User authorized private outgoing-message AI moderation,
superseding the earlier forum-only classification scope.

## Sending and moderation

Both `POST /me/chats/:conversationId/messages` and the retained legacy
`POST /direct-message/:conversationId` accept:

```json
{"content":"Halo, apa kabar?","requestId":"stable-message-request-1"}
```

Content is trimmed, required, and bounded to 2000 characters. requestId is required,
16–100 ASCII letters/digits/underscores/hyphens. Keep it when retrying the same
message. A different message needs a new identity. Unknown body properties are
rejected by the existing global validation pipe; clients cannot supply approvals.

The shared send service verifies active participants and accepted friendship before
sending the single outgoing text to ContentModerationService. It uses the existing
CMS/environment-configured OpenCode provider, classifier policy and category
notifications. SARA, profanity, bullying/harassment and threats are covered by that
policy; its sexual/self-harm categories retain their existing behavior, including
supportive self-harm messaging. There is no account penalty added here.

This private-message path calls the bounded classifier directly: no conversation
history, forum moderation cache, background text retry job, provider-response
observer, or new raw-text logging. Private chat remains excluded from request_logs.
The old legacy notification enqueue was removed because it copied private text to
a queue and targeted the sender. No new push delivery feature is introduced.

- Approved: transactionally save the message and update conversation activity.
- Rejected: 422 with the existing configured category notification; no message row.
- Uncertain/unavailable: 503 with a retry notice; no message row or delayed delivery.
- Invalid input: 400; unauthorized/not friends: 403; missing chat: 404.
- Reusing a request identity for different text: 409.

The transaction rechecks authorization after AI latency. A conversation write lock
serializes commit, read receipts and deletion. A nullable unique Message.requestKey
stores SHA-256 of conversation, sender and request identity. Existing history keeps
NULL keys; replay returns the original message without reclassifying or reinserting
it, but still requires current authorization. Retries across different senders or
conversations do not collide. No plaintext request identifier needs storage.

## Client behavior

RHF/Yup owns the draft. The composer is unavailable until room loading succeeds and
the friend is eligible; it is locked while sending so later text cannot be erased.
Rejections/network failures show an inline error and keep the draft. The composer
states that AI checks outgoing messages. Successful sends clear the submitted text.

The session provider retains failed message identities for same-text retries within
that mounted session. Auth token refresh preserves provider state; a new login/logout
generation resets private caches. Identities are deliberately not persisted across
app restarts or leaving/unmounting the entire chat stack: server deduplication works
whenever the caller retains requestId, but automatic retry recovery across those
boundaries is not implemented.

Room synchronization uses one request at a time every 10 seconds after completion,
only on the focused room in an active app. It aborts on blur and backs off to one
minute after 429; other read failures retry after 15 seconds. The member-wide room
limit is 900/hour. Request revisions ignore snapshots predating successful sends or
newer room loads. Thread lists refresh on focus and every 20 seconds while focused,
with pull-to-refresh/error retry. Server search includes username; the client does
not discard those matches. Search text is bounded to 100 characters.

Shared read-receipt mutation now checks participation before writing, including the
legacy endpoint. Read updates use the conversation lock, avoiding competing inserts
for the same read receipt. The read lock is a correctness measure; large histories
still require future pagination/batched receipts. Lists and room history remain
unpaginated. Deletion remains the existing global conversation soft delete; the
30-minute reminder remains a mount-based soft reminder. Their product semantics
are separate open decisions.

## Deployment and validation

Deploy API/schema before the updated app. TypeORM development synchronize policy
adds nullable unique Message.requestKey; no existing message/data deletion or new
migration command is introduced. Old clients without requestId receive 400 and must
be updated. An operational configured AI provider and Redis are required to send;
missing credentials, outages or uncertain results keep messages unsent.

Run:

- API: `npm test -- --runInBand direct-message.spec.ts direct-message.module.spec.ts content-moderation.service.spec.ts content-moderation.module.spec.ts`
- API: `npm run build` and scoped ESLint.
- Mobile: `node test/chat-provider.cjs`, `npx tsc --noEmit`, scoped ESLint.

Automated classifier tests mock provider responses; they do not establish live AI
classification accuracy. Transaction rollback tests use a repository harness.
Real MySQL synchronization/concurrent send/read/delete verification and device/live
provider acceptance remain required. Docker daemon was unavailable during this work.
