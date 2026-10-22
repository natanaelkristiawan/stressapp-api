# Post, comment and reaction column audit

Date: 2026-10-22. Static source audit only; no application/schema changes or live database inspection. Explicit service/query usage was checked across API source, including admin reports, search, capture, quests, voting, and maintenance. A reference does not prove a route is used in production. Whole-entity ORM reads can load columns without explicit property references; these findings are cleanup candidates, not proof that stored data is disposable.

## PostEntity — backup_post_with_attributes

| Classification | Properties | Evidence / purpose |
| --- | --- | --- |
| Core content and presentation | id, title, description, textContent, image, type | post/post.service.ts createPost/updatePost/list/detail; admin-post and capture-bsi mappings |
| Visibility/publication | status, isHidden, published_at | create sets PUBLISHED; admin/report mappings, visibility filters and publication-date queries. This does not establish a complete draft/publish workflow. |
| Counts | reactionsCount, repliesCount, totalRepliesCount, viewsCount | reaction service updates reaction counts; comment service recalculates reply counts; post detail increments viewsCount; ordering/reporting reads counts |
| Timestamps and soft deletion | created_at, updated_at, deleted_at | TypeORM decorators, CRUD and report/query use |
| Community linkage | spaceId, backup_member_id, backup_space_id | spaceId set during create/update; numeric FKs used in joins and filters. spaceId is not the numeric FK. |
| Tags | tags | JSON written by create/update and parsed by lists/reports; post-tags relations also exist |
| Voting | post_type, vote_start, vote_end, total_vote | post creation/update, vote services/processors and CMS output; keep despite being outside psychoeducation scope |
| Trending | order, is_highlight | admin-post-trending ordering and highlight operations |
| Legacy timestamp still used | createdAt | admin-post-trending selects/sorts/maps it; search sorts it. Distinct from created_at. |
| Legacy fallback still used | shortContent, createdBy | admin-quest/history.service.ts:91 fallback and admin-quest/report.service.ts:317 aggregate |
| Reports still read | sharesCount, image_path | sharesCount exported/reported; card-revision.service.ts selects post.image_path |
| Written, no explicit consuming read found | subscribersCount, hasMoreContent, thumbnail, mediaIds | post create sets first two constants; create/update stores thumbnail and mediaIds. Response media primarily use asset relations. Review contracts before removal. |
| Maintenance dependency | postId, image_backup, image_open_url | cleanAllPost filters postId IS NULL; syncImageToAsset reads image_backup; syncImageToImageOpenUrl filters/writes image_open_url |
| No explicit runtime column use found outside entity | mappingFields, fields, postTypeId, isAnonymous, htmlContent, publishedAt, ownerId, externalId, userId, createdById, locked, is_checked_asset, is_download_asset, relativeUrl, url, reactions, is_check_comment, is_check_reaction, after, curlAt | Strongest source-level cleanup candidates. Same-named fields on other entities, DTOs, local variables and pagination objects are not usage of these Post columns. |

Relations are not ordinary scalar columns: member/space own FK joins; reactionList, medias, comments, reports, questPointDetails and votes support ORM navigation/inverse mappings. quest-point-detail.entity.ts explicitly references questPointDetails. Do not classify them as unused simply because no direct property read exists.

post_view_count is an undecorated property, not a database column. Admin Post and Capture BSI queries use that name as a raw SQL alias for activity-log view counts. This differs from stored viewsCount, which post detail increments.

## CommentEntity — backup_comments

| Classification | Properties | Evidence / purpose |
| --- | --- | --- |
| Core | id, title, description, repliesCount | comment create/update/list/detail: title is shortened text, description is full text, repliesCount tracks replies |
| Lifecycle | created_at, updated_at, deleted_at | ordering, response timestamps, TypeORM lifecycle and soft delete |
| Parent FK | backup_comment_id | reply response parent_id; syncCommentCountToPost distinguishes top-level comments |
| Legacy identifier with consumers | commentId | cleanAllComment filters NULL; capture-bsi response includes it and parent commentId |
| Legacy identity with consumers | externalId | create copies member.externalId; manipulatedComment uses it to resolve members; capture-bsi returns it |

No scalar Comment columns have zero explicit references. Relations parent/comments, post/member, reactions and questPointDetails support replies, ownership, comment reactions and reward mappings. Join columns backup_post_with_attribute_id and backup_member_id are generated through post/member relations even without scalar property declarations.

## ReactionEntity — backup_reactions

| Classification | Properties | Evidence / purpose |
| --- | --- | --- |
| Core | id, reaction | create/update/list/remove and post reaction aggregation |
| Lifecycle | created_at, updated_at, deleted_at | writes, ordering and soft deletion |
| Legacy identifier with consumers | reactionId | cleanAllReaction filters NULL; capture-bsi returns it |
| Legacy presentation with consumer | name | capture-bsi returns i.name. New reaction creation derives response name from member, without writing this column. |

No scalar Reaction columns have zero explicit references. post/member relations own generated FKs; questPointDetails is referenced by the quest-point-detail inverse mapping.

## Cleanup implications

- Best initial review targets are the 20 Post properties with no explicit runtime usage. No deletion authorized by this audit.
- Written-only and legacy/reporting fields require caller/contract changes first. Comment and Reaction are smaller and still have consumers for their legacy fields.
- Clean-all endpoints select NULL external IDs, while current create flows do not assign those external IDs. They can therefore select locally created records; do not run them as cleanup.
- With synchronize:true, removing mapped columns can drop stored data on startup. Review stored values/external integrations before any schema cleanup; neither was inspected here.
- Before psychoeducation work, choose a single authoritative view-count definition and adapt member-owner assumptions for CMS-authored posts. htmlContent currently has no runtime use; existing normal post body flow uses textContent.

Next task: agree which Post fields and dependent legacy/reporting behavior to retain before any removal; psychoeducation implementation remains pending.

## Applied cleanup (2026-10-22)

User approved removing unused fields. Removed exactly the 20 Post columns listed
as having no explicit runtime usage, including their property indexes. The tables
above describe the pre-cleanup audit. All written-only fields, referenced legacy
fields, Comment/Reaction fields and relations remain. API build and compiled
TypeORM metadata assertions passed; diff whitespace check passed. No API startup,
database connection, synchronization, or deployed data change was performed.
On next startup synchronize:true may drop these columns and their stored values.


## Capture BSI removal (2026-10-22)

User confirmed Capture BSI is unused and requested removing it. Its module,
controller, service, DTOs/interfaces, dedicated BasicAuthMiddleware, Swagger page
and app registrations were removed after dependency checks. Earlier tables are
historical: Capture BSI is no longer a consumer of comment/reaction legacy fields
(in particular Reaction.name). No additional entity columns, shared services or
database data were removed in this step.
