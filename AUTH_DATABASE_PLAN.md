# API database and authentication plan

Status: initial source audit, 2026-10-13; updated 2026-10-14.
Member auth now uses additive tables in the isolated database; see [MEMBER_AUTH.md](MEMBER_AUTH.md).
Update 2026-10-14: the mmid connection and external identity/vehicle queries are
removed. CMS resolves local IDs; no tables/data were dropped. The inventory below
is historical. Member profile/social integration remains pending.

User decisions: create a new database, leave old databases intact; email-only OTP.
Assumption communicated: OTP verifies registration and password recovery.

## Existing structure

- mimate connection: social content and backup_members (UserMimateEntity),
  plus users (UserAdmin, CMS password accounts).
- mmid connection: users (UserEntity, external identity/profile), user vehicles,
  and cars. AuthService copies external identity data into backup_members.
- Profiles, admin users/dashboard, quests, and member votes depend on mmid too.
- Existing member auth has no public controller. Admin login issues tokens using
  external user IDs; global middleware resolves those through mmid.

## Step 1: consolidate and clean the schema

Use a fresh schema, without importing legacy records. Inspect references before
removing legacy entities from the runtime; never apply cleanup to old databases.

Proposed target: one MySQL database; local member identity with password hashes
and verification state; separate admin credentials with an explicit table name.
Preserve member primary keys and social relationships if existing data is retained.
Remove the external identity synchronization path and update all its callers.
Do not register the two conflicting users entities in one datasource.

Classify fields as required, replace, or remove using service, DTO, raw SQL, and
client references. Candidate legacy features include vehicle/dealer data, external
MMID profile copies, quests, campaigns, and leaderboard data. These are candidates,
not approved column deletions; several still have active code dependencies.
Keep social data, moderation state, and required profile fields.

Use explicit migrations with synchronize disabled. Review removal statements and
the migration/import approach before applying them to a database containing data.

## Step 2: local authentication

Implement login and registration against local accounts using existing bcrypt,
JWT, validation, and mail capabilities where appropriate. Enforce token expiry
before cache reads and load members by local IDs. Adapt CMS authentication to the
same database without granting member accounts admin access.

## Source cleanup inventory

The source scan found no references outside entity/migration files for these
external UserEntity field groups: loyalty (ponta_id, ponta_point), Salesforce
(salesforce_id, sf_status, sf_message, sf_response), identity images (sim_image,
qrcode_image, ktp_image, ktp_no), social-provider copies (sosmed_id, sosmed_type,
sosmed_picture, sosmed_name, email_gmail), and several old registration/referral
flags. These should not be carried into the fresh authentication schema.

This is lexical evidence only; it does not prove columns are unused by external
systems. Most UserMimateEntity fields still appear in API source, so deleting
them requires updating or excluding their consumers first.

Clean local authentication needs: member ID, email with a unique constraint,
password hash excluded from default reads, display name, email verification time,
account suspension/deletion state, timestamps, and a token/session version for
password reset invalidation. Preserve profile fields required by social features.
OTP records need purpose, member/account reference, code hash, expiry, attempts,
consumed state, and delivery/request timing. Do not store plaintext codes.

## Step 3: OTP and password recovery

Resolve delivery channel and OTP purposes. Use cryptographically generated codes,
hashed storage, expiry, single use, attempt limits, and resend/request limits.
Recovery responses must avoid exposing whether an email exists. Successful reset
must invalidate prior sessions/tokens. Never log passwords or OTP values.

## Verification

Build API and add focused authentication checks for successful flows, wrong
credentials, expired tokens/codes, replayed codes, rate limits, and admin access.
Verify migration against a disposable database before touching retained data.
Do not claim live database cleanup or email delivery without testing them.
