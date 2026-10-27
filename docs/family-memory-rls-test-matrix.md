# GoodNews Memories — RLS and release test matrix

Status: implementation and staging schema are present on `ios/ios-app-foundation`. Staging project: `qjptrkmsfgiwgilkycbd`. Production has not been modified. Automated lint/type-check/build passed, and staging policy optimization was verified; these do not replace authenticated end-to-end tests.

## Test setup

Use three disposable, email-verified Auth accounts in the **staging app/project only**:

- **A — owner:** creates a timeline and private memory/media.
- **B — contributor:** invited by A, accepts the invitation using the invited email.
- **C — unrelated:** has no membership or invitation.

Use separate browser profiles or clean sessions so each API request is made with the correct user's access token. Never paste passwords, access tokens, service-role keys, or private media URLs into a shared issue or chat. Do not use production accounts or production data.

Record for every test: date, account role, action, HTTP status/result, and pass/fail. For denied reads, verify that no private row or object data is returned (not merely that the UI hides it).

## Acceptance matrix

| Scenario | Expected result | Status |
|---|---|---|
| A creates and reads own timeline | Allow | Not yet run |
| B reads timeline after membership accepted | Allow | Not yet run |
| C reads A's timeline by known UUID | Deny / zero rows | Not yet run |
| B attempts to update timeline owner or protected fields | Deny / protected fields unchanged | Not yet run |
| B adds a private memory to a shared timeline | Allow | Not yet run |
| B attempts to create a memory with owner-only/shared visibility outside allowed rules | Deny | Not yet run |
| C reads memory by known UUID | Deny / zero rows | Not yet run |
| B reads an authorized timeline media object | Allow | Not yet run |
| C downloads a known object path from private `memory-media` bucket | Deny | Not yet run |
| B deletes media uploaded by another contributor | Deny | Not yet run |
| B deletes their own memory/media while still an accepted member | Allow, within policy | Not yet run |
| A removes B from membership | Membership removed; subsequent B reads denied | Not yet run |
| B tries to access the timeline after removal | Deny / zero rows and Storage denial | Not yet run |
| C queries invitation/member tables | Deny / zero rows | Not yet run |
| Invalid, expired, revoked, or already-used invitation token | Reject; no membership created | Not yet run |
| Valid invitation token used by the matching verified email | Accept once; membership created | Not yet run |
| Valid token used by a different or unverified email | Reject; no membership created | Not yet run |
| Invitation token hash / raw token leakage through list/read APIs | No token material exposed | Not yet run |
| Owner deletes a memory | Related rows follow intended FK behavior; Storage cleanup separately verified | Not yet run |
| Account deletion succeeds | User's Memories rows, invitations/memberships and private objects are removed per retention policy | Not yet run |
| Storage cleanup fails partway through account deletion | Deletion fails safely or reports a retryable state; no false success; retry is safe/idempotent | Not yet run |
| Account deletion handles many objects / pagination | All eligible objects processed; no skipped pages | Not yet run |
| Existing baby prediction game, guest submission, dashboard and results | No regression | Not yet run |

## Run order

1. Create A, B and C in staging; verify emails for A and B.
2. As A, create a timeline and private memory; record IDs and a test-only media object path.
3. Invite B. Verify the invited address, expiry, and one-time acceptance behavior.
4. Run owner/member/unrelated-user database access tests with each account's own session.
5. Run Storage download/delete checks using the private bucket; do not make the bucket public to simplify testing.
6. Test membership removal and verify both database and Storage access are denied afterward.
7. Test invalid, expired, revoked, mismatched-email and replayed invitation tokens.
8. Test account deletion with a small account first, then a disposable account with enough test objects to exercise pagination. Simulate a Storage removal failure only in staging and confirm retry behavior.
9. Run existing game regression tests.
10. Attach sanitized results (no credentials, tokens, private media URLs or personal data) and update each status above.

## Known advisor findings

- The Memories `auth_rls_initplan` performance warnings were removed by the staging policy optimization and verified in the staging policy catalog.
- Two security-advisor warnings remain for callable SECURITY DEFINER functions: `public.accept_memory_invitation(text)` and `public.is_admin()`. The former is part of the invitation RPC flow; the latter is used by existing authorization policies. Do not revoke either blindly. Review function definitions, grants, dependent policies and the authorization tests before release.
- Other staging advisor findings include multiple-permissive-policy warnings on existing prediction/game tables and unused-index notices on the newly provisioned staging database.

## Release gate

**Do not release to production yet.** Authenticated acceptance tests above are not recorded as passed. Review the remaining SECURITY DEFINER findings, confirm account-deletion failure/retry semantics, and complete the matrix before production approval. Production schema, data, functions and app deployment must remain untouched until explicitly approved.

Related staging report: [family-memory-staging-status-2026-10-27.md](family-memory-staging-status-2026-10-27.md)
