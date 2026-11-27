# Conversation cards

CMS-managed conversation-card catalog (27 November 2026). CMS:
**Forum → Conversation Cards** at `/forum/chat-cards` (list, `/new`, `/:id`),
API routes `/cms-chat-cards`. Each card may reference one interest category (or
none); cards without a category are the general fallback shown when a member has
no matching preferences.

All endpoints use existing CMS JWT middleware and live `CmsMembersGuard` checks.
Member tokens do not grant access to `/cms-chat-cards`. Responses use the existing
success envelope with `data`.

| Method | Path | Input / result |
| --- | --- | --- |
| GET | `/cms-chat-cards` | `search`, `categoryId`, `status`, `sortBy`, `sortOrder`, `page`, `pageSize`; returns `{items,total,page,pageSize}` |
| GET | `/cms-chat-cards/options` | Active cards ordered by category display order then `sortOrder` then `id`; returns card fields without revision/timestamps |
| GET | `/cms-chat-cards/:id` | Returns an active or inactive card with its category reference |
| POST | `/cms-chat-cards` | Required `title`, `prompt`, `color`, `textColor`, `visual`, `sortOrder`, `isActive`; optional `subPrompt`, nullable `categoryId`; returns created card (201) |
| PUT | `/cms-chat-cards/:id` | Full form fields plus required reviewed `revision`; returns updated card |
| DELETE | `/cms-chat-cards/:id` | JSON `{revision}`; deactivates and returns retained card |

Cards contain `id`, `title`, `prompt`, `subPrompt`, `color`, `textColor`,
`visual` (`kuliner | hobi | film | keseharian`), `categoryId`, `category`
(`{id,name}` or null), `sortOrder`, `isActive`, `revision`, `createdAt`,
`updatedAt` (ISO dates). IDs/revisions are positive integers.

Validation: title required, max 100 characters, NFKC normalized and whitespace
collapsed. Prompt required, max 500 characters. `subPrompt` optional, max 500,
normalized to null when blank. `color`/`textColor` required, max 20 characters
each. `visual` must be one of the four allowed values. `categoryId` is optional
and must reference an existing `interest_categories.id`; unknown IDs are rejected
with 400. `sortOrder` is an integer 0–100000; `isActive` must be a JSON boolean.
Unknown body/query fields and explicit nulls fail validation.

List defaults: empty search, status `all` (`active`/`inactive` supported),
`sortBy=sortOrder` (`title`/`category`/`createdAt` supported), `sortOrder=asc`
(`desc` supported), page 1, pageSize 20. Search is a literal case-insensitive
title substring. `categoryId` filters to exactly one category; omitted means all.
Ordering uses a fixed column allowlist and stable ID tie-breaker.

400: invalid input; 401/403: denied identity/access; 404: missing card; 409:
stale revision. Updates/deactivation lock the row and compare revision inside a
transaction, incrementing it on change. Already-inactive deactivation with the
current revision is idempotent. Audit metadata (`cms-chat-cards` source) is
committed atomically; raw card text is excluded from activity middleware. There
is no physical delete endpoint.

The `conversation_cards` entity is registered in the `mimate` datasource;
standalone entity discovery also includes it. Production runs with synchronize
disabled, so apply the hand-written migration before deploying:

```bash
npm run typeorm:ds -- migration:run
```

- `1793918000002-ConversationCards.ts` creates `conversation_cards` with a
  **signed** `categoryId` (`ON DELETE SET NULL`) referencing
  `interest_categories.id`, and an index on `categoryId`.

A standalone seeder (`npm run seed:conversation-cards`) inserts the four default
cards (kuliner, hobi, film, keseharian) as uncategorized, preserving the existing
mobile picker until categories are assigned through the CMS. Re-running skips
cards already present per `visual`.

Checks: `npm run build`, scoped ESLint, and `node test/conversation-cards.cjs`.
Docker/MySQL integration and CMS browser acceptance remain unverified.
