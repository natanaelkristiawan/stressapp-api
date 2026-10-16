# CMS admin seed

Run from `stressapp-api` against the intended database. The existing `users` and
`backup_members` tables must exist before seeding. Create missing tables with
`npm run migration:run`; the seed itself does not migrate schema,
seed quests, start the API, or modify member-auth accounts.

Set these values in the private server `.env` (never commit credentials):

```dotenv
ADMIN_SEED_EMAIL=your-admin@example.com
ADMIN_SEED_NAME=CMS Admin
ADMIN_SEED_PASSWORD=<choose-a-private-password>
```

Replace the placeholders. Passwords require at least eight characters and at most
72 UTF-8 bytes; whitespace is preserved. Email is trimmed and lowercased.
The seed uses existing `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and
`DB_DATABASE_MIMATE` settings.

```sh
npm run migration:run
npm run seed:admin
```

Success prints `CMS admin created.` or `CMS admin already exists; credentials
unchanged.` Use the configured email/password on the CMS login page. Remove the
`ADMIN_SEED_*` values from `.env` after creation if no longer needed.

The seed stores a bcrypt password hash and creates a dedicated active local admin
profile (`member_role=1`). Existing admin credentials are never reset. It refuses
suspended/deleted/unlinked admin profiles or an email already used by a profile;
it does not silently reactivate accounts or promote members. A database lock
serializes concurrent admin seed runs, and a transaction rolls back partial writes.
Do not run this concurrently with other staff account provisioning tools.
Failures return a nonzero exit code without printing database parameters/secrets.

Verification: `npm run build` and
`npx jest src/database/seeds/admin.seed.spec.ts --runInBand`.
The focused tests use database mocks; actual database creation/login still needs
verification in the intended environment.

## Missing CMS tables

`npm run migration:run` runs the active member and CMS migrations from
`src/database/migrations`. Original `member_auth_migrations` and
`cms_auth_migrations` history tables are retained so applied migrations are skipped.
The CMS baseline creates `backup_members` before `users`, including all mapped
scalar columns, profile indexes, a unique admin/profile link and its foreign key.
Legacy migration source files have been removed. Existing tables
are preserved by CREATE TABLE IF NOT EXISTS; this baseline does not repair partial
or incompatible old schemas. Check schema compatibility separately if tables
already exist. MySQL DDL can commit before a later statement fails; rerunning can
create any remaining missing table. Automatic rollback deliberately refuses to
drop these shared tables.

After deploying source, run migration then seed from the API folder as shown above.
For a compiled checkout, build first and run:

```sh
node dist/database/run-migrations.js
npm run seed:admin
```

PM2 deployment uses the same central runner for member and CMS migrations. No server schema was modified locally.
