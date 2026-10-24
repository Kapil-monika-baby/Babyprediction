# GoodNews Memories — RLS and release test matrix

Status: test plan only; no production migration or tests have been run.

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
| A removes B from membership | B's subsequent DB/storage reads denied |
| C queries invitation/share tables | Deny / zero rows |
| Invalid, expired or revoked share token | Deny |
| Valid share token | Only the intended item/media; no timeline or member list |
| Owner deletes memory | Rows cascade; Storage object cleanup separately verified |
| Account deletion | Rows, links and private Storage objects removed |
| Existing game create, guest submission, dashboard and results | No regression |

## Required before production
1. Implement server-side invitation acceptance and public-share resolution. Never expose token hashes or add broad anonymous SELECT policies.
2. Storage object deletion is not handled by SQL cascades. Add a secure cleanup flow/Edge Function and test retry behaviour.
3. Inspect/update the account-deletion Edge Function to clean up memory-media objects and rows before enabling Memories.
4. Apply migration only to a disposable/staging Supabase project first; it has not been run.
5. Confirm child ownership conventions before linking timelines to existing babies.
6. Validate 50 MiB video limit, playback support and storage cost before enabling video.

Do not merge to production or apply in production until all denial tests pass and existing prediction flows pass regression checks.
