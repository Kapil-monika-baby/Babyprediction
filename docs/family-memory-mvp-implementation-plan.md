# GoodNews Baby — Family Memories MVP Implementation Plan

Status: discovery/audit complete; implementation not yet started.
Target branch: `ios/ios-app-foundation`
Production impact: none intended by this document.

## Product decision

Build a private-by-default family memory timeline. A parent owns each child's timeline and can invite relatives to contribute. Public sharing is optional, explicit, scoped to one memory or album, and revocable. Public viewers must never gain access to the full timeline or family membership.

## Repository and backend audit findings

- Existing app is a Next.js 16 / React 19 web app under `platform/`.
- Supabase browser client is in `platform/lib/supabase-browser.ts`; it uses environment variables with a fallback project URL and publishable key.
- Existing public schema currently includes: `profiles`, `babies`, `games`, `game_questions`, `predictions`, `game_results`, and `account_deletion_requests`.
- Existing `babies` table has an `owner_id` referencing `profiles.id`; do not assume extended family access exists.
- Existing tables have RLS enabled. Policies are designed around owners, published/completed game access, public guest predictions, and admin access. These policies should not be loosened for Memories.
- Existing Storage has a public `game-images` bucket limited to JPEG/PNG/WebP at 5 MiB. Its public-read policy is unsuitable for private family photos. Do not reuse this bucket for memories.
- Current account deletion request table exists. Its relationship to actual Auth-user deletion and media deletion must be checked before Memories ships.
- Current migration history has core game schema, game image storage, customization, public results, admin policies, and account-deletion requests; no Memories schema exists.
- Existing app routes and game flows must remain unchanged while the feature is developed.
- No database DDL, bucket changes, or production application changes were made during the audit.

## Proposed MVP scope

1. Timeline per child, owned by a parent.
2. Memories with caption/story, occurred-at date, milestone/type, visibility, author, timestamps and deletion state.
3. Photo uploads in a new private Storage bucket; video support only after limits, transcoding/preview and storage cost are decided.
4. Family membership and secure, expiring invitations.
5. Owner moderation and member removal.
6. Per-item or per-album public share links, with unguessable tokens, expiry/revocation and narrowly scoped read access.
7. Responsive timeline, add/edit/delete memory, basic filters and accessible upload/error states.
8. Account deletion, memory/media deletion and retention behaviour.

## Proposed data model (subject to schema review)

- `memory_timelines`: UUID, owner user ID, optional link to existing `babies.id` after confirming semantics, timestamps/deletion marker.
- `memory_items`: timeline ID, creator ID, type, caption/story, occurred-at date, milestone type, visibility, timestamps/deletion marker.
- `memory_media`: memory ID, private storage path, MIME type, byte size, dimensions/duration and creation time.
- `memory_members`: timeline ID, user ID, role, invitation/acceptance metadata.
- `memory_invitations`: timeline ID, invited email, role, token hash, expiry, accepted/revoked timestamps.
- `memory_share_links`: memory or album ID, token hash, creator, expiry/revocation metadata.

Use foreign keys, appropriate indexes, constraints for valid roles/visibility/media types, and a unique constraint preventing duplicate active memberships. Exact SQL is deferred until the code and existing ownership model are reviewed.

## Security requirements

- RLS on every new public table. Enforce owner and accepted-member permissions server-side in Postgres policies, not only in the UI.
- Keep the Memories Storage bucket private; never make child media public by default and never store permanent public media URLs.
- Validate MIME type, size, and upload path. Use signed URLs only after authorization; keep public-share access separate from normal authenticated membership.
- A public link grants access only to its explicitly shared memory/album; it must not enable listing a timeline, querying membership, or guessing related IDs.
- Generate cryptographically random tokens; store token hashes where feasible; support expiry and immediate revocation; rate-limit token/invitation endpoints.
- Public sharing requires a deliberate confirmation explaining that anyone with the link can view the content. Do not index child content by default.
- Parent controls membership; contributors cannot change ownership, visibility defaults, invite permissions, or public sharing.
- Account deletion and content deletion must handle media objects and shared links; define retention and ownership transfer before launch.
- Never expose service-role keys in browser code. Keep secrets out of Git.

## Routes / UI proposal

- `/memories`: timelines available to the signed-in user.
- `/memories/[timelineId]`: chronological timeline.
- `/memories/[timelineId]/add`: create memory.
- `/memories/[timelineId]/settings`: members, privacy, deletion.
- `/memories/invite/[token]`: accept invite.
- `/share/[token]`: render only the specifically shared item/album.
- Add a Memories entry point to the parent dashboard; preserve guest game routes.

Route names may be adapted to the existing app conventions during implementation.

## Delivery stages

1. Audit current route/auth conventions, child ownership, deletion workflow, and existing RLS helper functions.
2. Prepare migration files in Git first; review SQL and policies before applying to any database.
3. Implement private timeline and photo memories.
4. Implement invitation and membership lifecycle.
5. Implement public share links and revocation.
6. Run RLS isolation tests, upload/deletion tests, mobile-browser tests, and regression tests for games/predictions.
7. Release to a small cohort only after backup/rollback and privacy checks.

## Acceptance criteria

- Parent can create, edit, view, and delete a memory.
- Accepted contributor can add content but cannot alter ownership or privacy controls.
- Uninvited users cannot read private metadata or media, even with known UUIDs.
- Removing a member revokes future access.
- Public share link reveals only the intended memory/album; revocation blocks subsequent access.
- Upload failure does not leave orphan records or broken timeline items.
- Account deletion and memory deletion remove or appropriately retain associated media under the documented policy.
- Existing game creation, guest prediction submission, dashboard and results continue to pass regression tests.
- All schema changes are migrated and tested in an isolated environment before production rollout.

## Not in MVP

Public searchable profiles, open social feeds, stranger messaging, AI face recognition, bulk phone-gallery import, printed books/subscriptions, and a separate native iOS implementation for Memories.

## Immediate next steps

- Inspect the full `babies` schema/policies and account deletion implementation.
- Inspect auth/session handling and app route conventions.
- Draft exact SQL migrations and an RLS test matrix.
- Do not apply migrations to production or change existing Storage bucket policies as part of the initial feature branch.
