# Family Memories invitations

## Current implementation status

The branch contains source for owner-created family invitation links, an authenticated acceptance Edge Function, an atomic PostgreSQL acceptance RPC, and the `/memories/invite` page. These are **not deployed**. The Memories migrations have not been applied to production, and no invitation email provider is configured.

The owner creates a link for a specific email address and shares it manually. The raw 256-bit token is returned once to the owner; only its SHA-256 hash is stored. Links expire after seven days and are accepted once. Acceptance requires a signed-in account with a confirmed email that matches the invited address. Public memory links are not part of this feature.

## Server-side checks

- Invitation creation requires a valid authenticated user and verifies that the caller owns the timeline.
- The server fixes the role to `contributor`; the client cannot request elevated access.
- Invitation tokens are generated with Web Crypto and never stored in plaintext.
- Acceptance hashes the presented token and calls `accept_memory_invitation` with the caller's JWT.
- The database function locks the invitation row, checks expiry/revocation/previous acceptance and verified-email match, then creates membership and marks the invitation accepted in one transaction.
- RLS remains enabled on the invitation and membership tables. Token resolution is server-side only.

## Required staging tests before deployment

1. Owner can create an invitation; a non-owner cannot.
2. Stored `token_hash` is not equal to the raw token, and the raw token is not persisted.
3. Correct verified email accepts the invitation and gains contributor access.
4. Different email, unverified email, expired link, revoked link, malformed token and already-used link are rejected.
5. Concurrent acceptance attempts produce at most one successful acceptance.
6. A member cannot invite another person or promote their role.
7. Invitation acceptance does not grant access to other timelines or public sharing.
8. Missing function/migration errors are understandable in the UI; no raw token or sensitive database detail is logged.
9. Manual sharing is clearly explained because email delivery is not configured.
10. Verify the accepted membership and timeline access with two real test accounts before enabling this in production.

Do not deploy the Edge Functions or apply this migration to production until the staging checks pass.
