# GoodNews Memories — RLS and release test matrix

Status: implementation is on the isolated branch. The linked Supabase project currently has no Memories tables, so these are still staging acceptance tests; no production migration or live data tests have been run.

Use three isolated test users: parent A, accepted contributor B, unrelated user C. Create A's timeline, a private memory and a media object in a disposable Supabase project.

| Scenario | Expected result |
|---|---|
| A creates and reads own timeline | Allow |
| B reads timeline after membership accepted | Allow |
| C reads A's timeline by known UUID | Deny / zero rows |
| B attempts to update timeline owner/title | Deny |
| B adds a private memory | Allow |
| B creates a memory with shared visibility | Deny |
| C reads memory by known UUID | Deny / zero rows |
| B reads timeline media | Allow |
| C downloads from private memory-media bucket | Deny |
| B deletes another contributor's media | Deny |
| B deletes their own memory/media while an accepted member | Allow |
| B tries to delete their own memory/media after A removes membership | Deny |
| A removes B from membership | B's subsequent DB/storage reads denied |
| C queries invitation/share tables | Deny / zero rows |
| Invalid, expired or revoked share token | Deny |
| Valid share token | Only the intended item/media; no timeline or member list |
| Owner deletes memory | Rows cascade; Storage object cleanup separately verified |
| Account deletion | Rows, links and private Storage objects removed |
| Existing game create, guest submission, dashboard and results | No regression |

## Required before production
1. Verify server-side invitation acceptance: email must be confirmed and match the invitation, token must be one-time, unrevoked and unexpired; confirm token hashes are never exposed.
2. Verify the private Storage bucket and signed URL behavior, including contributor deletion of their own media and denial of unrelated users.
3. Test account-deletion cleanup, including partial Storage failures, retries, missing schema compatibility and pagination. The branch contains the cleanup logic, but the deployed function has not been updated.
4. Apply migrations only to a disposable/staging Supabase project first; the linked project checked for this review has no Memories tables and has not been migrated.
5. Confirm child ownership conventions before linking timelines to existing babies.
6. Validate 50 MiB video limit, playback support and storage cost before enabling video.
7. Test the full sign-up/login invitation journey in a browser, including unverified email and invited email mismatch.
8. Keep public share links disabled until a separate server-side share-token resolver and scoped item/media access are implemented.

Do not merge to production or apply in production until all denial tests pass and existing prediction flows pass regression checks.
