# GoodNews Memories — RLS and release test matrix

Status: staging security migration `20261030085822_memory_private_visibility_and_grants` is applied to isolated staging project `qjptrkmsfgiwgilkycbd` and committed on PR #10's branch. The migration limits private memories/media to the owner and author, permits accepted contributors to see shared items, removes anon privileges, and revokes authenticated TRUNCATE/REFERENCES/TRIGGER. Production has not been modified.

## Test setup

Three staging Auth identities were used only through isolated SQL transactions:

- **A — owner:** `47c3…`
- **B — accepted contributor:** `7141…`
- **C — unrelated account:** `fe31…`

No passwords, access tokens, service-role keys, private media URLs, or memory captions were copied into this report. Temporary write tests were rolled back.

## Acceptance matrix

| Scenario | Expected result | Status |
|---|---|---|
| A views own timeline and private items | Allow | PASS — 1 timeline, 5 private items |
| B reads timeline after accepted membership | Allow | PASS — 1 timeline |
| C reads A's timeline by known UUID | Deny / zero rows | PASS — 0 rows |
| B reads own private memories | Allow | PASS — 2 authored private items |
| B reads A's private memories | Deny | PASS — 0 owner-authored private items exposed |
| B reads A's memory after owner changes it to shared | Allow | PASS — temporary transaction exposed shared row and its media metadata/object |
| B attempts to update timeline owner | Deny | PASS — 0 rows changed |
| B attempts to change own private memory to shared | Deny | PASS — RLS rejected update |
| B inserts own private memory | Allow | PASS — temporary insert succeeded, then rolled back |
| B inserts a shared memory directly | Deny | PASS — RLS rejected insert |
| C reads memory by known UUID | Deny / zero rows | PASS — 0 rows |
| B reads A's private media metadata/object | Deny | PASS — 0 media rows / 0 Storage objects |
| C reads private Storage object metadata | Deny | PASS — 0 Storage objects |
| B deletes own memory while accepted | Allow | PASS — temporary delete affected 1 row, then rolled back |
| B deletes A's memory | Deny | PASS — 0 rows deleted |
| A removes B from membership | Membership removed | PASS — temporary removal changed B's helper to false and subsequent timeline/items/storage reads to zero; rolled back |
| C queries invitation/member/share-link/media metadata | Deny / zero rows | PASS — all four counts zero |
| Expired invitation token | Reject | PASS — P0002 |
| Revoked invitation token | Reject | PASS — P0002 |
| Already-used invitation token | Reject | PASS — P0002 |
| Valid invitation used by matching verified email | Accept once | PASS — accepted once; replay returned P0002; transaction rolled back |
| Valid token used by a different email | Reject | PASS — 42501 |
| Unverified email invitation acceptance | Reject | NOT RUN — no disposable unverified staging account available |
| Owner deletes memory | Related metadata cascades | PASS — memory deletion removed its memory_media row in a rolled-back transaction; Storage object removal is separate |
| Anonymous role table access | Deny | PASS — no SELECT or TRUNCATE privileges on Memories tables |
| Authenticated TRUNCATE/REFERENCES/TRIGGER | Deny | PASS — privileges absent on all six Memories tables |
| Account deletion succeeds end-to-end | Rows and private objects removed | NOT RUN — no disposable account authorized for destructive deletion |
| Storage cleanup failure / retry | Safe, idempotent retry | NOT RUN — needs a disposable account and controlled Storage failure |
| Account deletion pagination at scale | No skipped pages | NOT RUN — code paginates in 500-row pages, not load-tested |
| Existing baby prediction game regression | No regression | NOT RUN on this latest branch — platform package has no test script or E2E suite; build CI is running |

## Security findings and remediation

- **Fixed on staging and PR #10 branch:** contributors previously saw all private items/media on a shared timeline. The updated policies now allow the owner to see all items, the author to see their own private items, and accepted members to see shared items only.
- **Fixed on staging and PR #10 branch:** `anon` had broad table privileges and both `anon` and `authenticated` had TRUNCATE. Anonymous access was revoked; authenticated users retain only SELECT/INSERT/UPDATE/DELETE, with RLS still authoritative.
- The `memory-media` bucket remains private with a 50 MB limit and the configured image/video MIME allowlist.
- Supabase security advisor still reports callable SECURITY DEFINER functions: `accept_memory_invitation`, `create_memory_timeline`, `is_memory_timeline_member`, `is_memory_timeline_owner`, and existing `is_admin`. These have intentional authenticated/policy call paths; do not revoke them blindly. Review their definitions and grants before production approval.
- Supabase Auth leaked-password protection is disabled; this is a project-level warning, not changed as part of this PR.
- Performance advisor still reports existing multiple-permissive-policy warnings on Baby Prediction tables and unused indexes on the fresh staging database.

## Release gate

**Do not release to production yet.** The confirmed private-memory and privilege issues are fixed in staging and committed to PR #10, but end-to-end account deletion failure/retry, unverified-email acceptance, direct Storage delete/download API checks, and latest-branch game regression remain unverified. The account-deletion function also needs a session-revocation/retry design review: Supabase documents that deleting a user does not immediately invalidate already-issued JWT access tokens. Production schema, data, functions and app deployment remain untouched.

Related staging report: [family-memory-staging-status-2026-10-27.md](family-memory-staging-status-2026-10-27.md)
