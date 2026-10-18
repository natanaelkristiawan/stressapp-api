# CMS mobile-member management

All active authenticated CMS admins may manage mobile members through `/cms-members`.
CMS-linked profiles, legacy accounts without member auth, and soft-deleted members
are excluded. There is no create-member endpoint. Login email is read-only;
profile verification changes `member_verified`, never email OTP verification.

| Method | Path | Input |
| --- | --- | --- |
| GET | `/cms-members` | `page` (default 1), `pageSize` (default 20, max 100), optional name/email substrings, `startDate`/`endDate`, `sortBy` and `sortOrder` |
| GET | `/cms-members/:id` | Positive member ID |
| PUT | `/cms-members/:id` | `updatedAt`, name, optional nullable username/photoUrl |
| PATCH | `/cms-members/:id/suspension` | `updatedAt`, boolean suspended, required reason when suspending |
| PATCH | `/cms-members/:id/verification` | `updatedAt`, boolean verified |
| DELETE | `/cms-members/:id` | JSON body containing `updatedAt` |

Dates use inclusive UTC calendar days (`YYYY-MM-DD`). Name/email filters are
case-insensitive literal substrings. Sort keys are `name`, `username`, `email`, and `createdAt`; direction is `asc`
or `desc`. Defaults are `createdAt` descending, with ID descending as a stable
tie-breaker for every sort. Unknown sort keys/directions are rejected. List data contains items, total, page, pageSize; detail data
contains safe profile/status fields. Authentication secrets are never returned.

Writes require the latest returned updatedAt; stale or concurrent edits receive
409 and must reload. Each successful write creates a transactional audit event
without profile values. Suspension and soft deletion revoke sessions and OTPs;
unsuspension requires a new login. Deletion retains related content and excludes
the account from normal queries; no CMS restore workflow is provided.

CMS uses TanStack Table with manual server pagination/filtering/sorting, a
route-scoped Context provider, URL filters/page/sort state, and React Hook
Form + Yup. It edits name, username and a hosted HTTPS photo URL. City, bio and
preferences are displayed read-only. File upload awaits verified MinIO setup.

## Disposable integration check

Against a disposable local MySQL instance with an empty root password:

```sh
CMS_MEMBERS_TEST_PORT=<local-mysql-port> node test/cms-members.integration.cjs
```

The check creates/drops its own uniquely named database, uses synthetic data,
and exercises real HTTP validation, CMS/member authorization, filtering, remote sorting/pagination, UTC
boundaries, concurrent edits, audit, badge isolation and auth revocation. Redis
and email delivery are stubbed; external SMTP/MinIO and deployment are not tested.
Do not point this fixture at a shared or deployed database.
