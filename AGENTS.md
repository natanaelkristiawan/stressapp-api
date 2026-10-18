# API coding instructions

Read ../AGENTS.md, ../docs/rules/shared.md, and ../docs/rules/api.md.
Apply ponytail. Use NestJS DTO validation for every request boundary and retain
server authorization/ownership checks. React Context and Zustand do not belong
in this backend. Work incrementally; broad legacy removal remains a later step.

For new modules, follow the standard module structure in ../docs/rules/api.md,
using src/cms-members/ and src/member-auth/ as references. Adapt authentication, ownership and
business rules to the feature; do not copy CMS-only permissions into mobile APIs.
