# GoodNews Memories — staging verification status

Updated: 2026-10-27  
Scope: isolated staging Supabase project `qjptrkmsfgiwgilkycbd` and feature branch `ios/ios-app-foundation`. Production was not modified.

## Completed in this pass

- Applied the Memories RLS auth-call optimization migration to staging and committed it to the feature branch.
- Normalized a pre-existing policy that had received a nested `(select (select auth.uid()))` wrapper during optimization; the resulting policy now uses a single `(select auth.uid())`.
- Queried the live staging policy catalog to verify the timeline owner/member policy expressions remain intact.
- Re-ran Supabase performance/security advisors. The 20 `auth_rls_initplan` warnings for Memories policies are gone. Remaining performance warnings are unrelated existing multiple-permissive-policy findings on prediction/game tables and unused-index notices in a newly provisioned staging database.
- GitHub workflow run [40465915500](https://github.com/Kapil-monika-baby/Babyprediction/actions/runs/40465915500) passed: ESLint, Deno Edge Function type-check, and production build.

## Security findings retained intentionally

The advisor still flags two callable SECURITY DEFINER functions:

- `public.accept_memory_invitation(p_token_hash text)`: authenticated execution is required by the current invite acceptance RPC flow. The function must continue to validate the caller identity, verified email, matching invited email, token hash, expiry, revocation/acceptance state, and lock the invitation row before accepting.
- `public.is_admin()`: authenticated execution is used by existing authorization policies. Do not revoke or change its execution context without first migrating all dependent policies.

These are not treated as resolved. Review the function definitions and authorization tests before release.

## Manual acceptance tests — NOT YET RUN

The following require three real, isolated staging Auth accounts (owner A, invited contributor B, unrelated user C) and browser/API sessions. Database-advisor checks and successful compilation do not substitute for these tests.

- [ ] Owner can create/read their timeline; unrelated user cannot read it by known UUID.
- [ ] Contributor can read timeline and create private memories; cannot edit timeline ownership/title or create shared-visible memories.
- [ ] Invitation token is single-use, expires after seven days, and rejects revoked tokens, unverified users, and verified users whose email differs from the invite.
- [ ] Unrelated user cannot read timeline rows, memory rows, invitation/share rows, or download private media.
- [ ] Contributor cannot delete another contributor's media; own media access is denied after membership removal.
- [ ] Private Storage signed URLs expire as configured and the bucket remains private.
- [ ] Account deletion removes owned timeline media, authored media on other timelines, game images, database rows and Auth identity. Injected Storage failures must stop deletion before DB/Auth rows are removed; retry must complete safely.
- [ ] Pagination is exercised with more than 500 rows and Storage cleanup with more than 100 paths.
- [ ] Existing game creation, guest submission, parent dashboard and results still work.
- [ ] Public share links remain disabled until a separate scoped resolver is implemented.

## Release decision

**Not ready for production release yet.** CI and schema/policy advisor checks pass the current technical gates, but real-user authorization, invitation lifecycle, Storage and deletion failure-path acceptance tests remain outstanding. No production migrations, function deployments, app deployments, or live-data modifications were performed in this pass.
