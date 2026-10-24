# Memories media cleanup and account deletion

## Scope and safety
The account-deletion Edge Function source is mirrored at `platform/supabase/functions/delete-account/index.ts` for review and version control. The deployed function in Supabase has **not** been changed by this commit. Do not deploy this source until staging checks pass.

## Deletion order
1. Authenticate the caller using the access token; never accept a user ID from request JSON.
2. Find timelines owned by the user and memories authored by them, including authored memories in another family member's timeline.
3. Remove every associated object from the private `memory-media` bucket. If Storage reports an error, stop before deleting database rows so the caller can retry.
4. Delete the user's authored items from timelines owned by others, then delete owned timelines and memberships.
5. Continue the existing game-image cleanup, profile deletion, and Auth user deletion.

Postgres cascades do not delete Storage objects. Storage removal is therefore an explicit step before the rows that identify the objects are deleted.

## Idempotency and partial failures
- Storage removal is attempted before DB deletion. A retry after a successful removal should be safe if the object is already absent; verify Supabase Storage's behavior for missing objects in staging.
- If some objects are removed and a later object removal fails, the request stops before deleting the rows. Retrying should continue cleanup, but this must be tested with partial failures.
- If the Memories tables are not installed yet, the function tolerates the known missing-relation responses and continues the pre-existing account-deletion path.
- This function does not create a durable cleanup queue. For high reliability, add an outbox/job table and scheduled retry worker before treating cleanup as production-grade.

## Required staging tests
1. User with no Memories can delete an account before and after the Memories migration.
2. Owner with photos and videos: all objects disappear and timeline rows cascade.
3. Contributor with authored items in another owner's timeline: only their authored items/media and membership are removed; the other owner's timeline remains.
4. Storage error during cleanup: account/profile rows remain, an actionable error is returned, and retry succeeds.
5. Partial Storage success followed by failure: retry leaves no objects or database rows.
6. Existing game-image cleanup still works.
7. Invalid/expired JWT cannot trigger cleanup; request body cannot select another user.
8. Verify no memory-media objects remain under any timeline owned by the deleted user, and no orphaned media rows remain for authored items.
9. Test schema-not-installed compatibility and both missing-relation error shapes.
