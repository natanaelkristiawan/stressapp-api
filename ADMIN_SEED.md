# CMS admin seed

Run from `stressapp-api` against the intended database. The existing `users` and
`members` tables must exist before seeding. Read [MEMBER_MERGE.md](MEMBER_MERGE.md)
for the fresh-database baseline. Create the identity tables with
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

## Initial schema

The user confirmed an empty database. `npm run migration:run` creates members,
member_otps, member_sessions and users directly and records completion in
typeorm_migrations. The seed creates a dedicated CMS profile with memberAuthEnabled=false.
For compiled deployment run `node dist/database/run-migrations.js`, then `npm run seed:admin`.
See [MEMBER_MERGE.md](MEMBER_MERGE.md) for the current baseline.

Seed errors report the stage (configuration validation, database initialization,
or admin creation) and recognized driver codes/TypeORM categories. Wrapped driver
errors and aggregate connection failures are inspected without printing raw SQL,
credentials or driver messages. If troubleshooting, share only this safe output.
