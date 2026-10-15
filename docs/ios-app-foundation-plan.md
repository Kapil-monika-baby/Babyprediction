# Baby Prediction iOS App — Foundation Plan

## Goal

Ship a useful, App Store-ready iOS app while preserving the live Next.js web app and Android release. Reuse the existing Supabase project and database, and keep all production web behavior unchanged during iOS development.

## Current repository findings

- The production platform lives under `platform/` and uses Next.js App Router.
- The platform UI directly uses `@supabase/supabase-js` in browser-side components for auth, game creation, guest submissions, dashboards, and results.
- Important routes include login/signup, create/customize game, dashboard, public game/play/results, account, and delete-account.
- The current Next config has `typescript.ignoreBuildErrors: true`; this belongs to the separate reliability/security workstream and must not be weakened further.
- `platform/package.json` uses `latest` for Supabase JS and Tailwind packages, and no `platform/package-lock.json` appeared in the current platform directory listing.
- The Next app contains dynamic routes such as `/game/[slug]` and `/dashboard/[gameId]`. A static Capacitor bundle cannot simply assume these routes can be exported as-is; Next.js static export has limitations around dynamic routes that are not fully enumerated at build time.

## Architecture recommendation

Create a separate, locally bundled mobile client in the repository (proposed folder: `mobile/`) using React + Vite + Capacitor iOS. Reuse the existing Supabase backend, database contract, and product rules. Keep the current Next.js app deployed independently for web and existing Android use.

Why this route:
- Capacitor expects a local web-asset directory that can be packaged with the native app.
- Avoid depending on a remote-only WebView wrapper, which can provide a weak native experience and create App Review risk.
- Avoid forcing the current Next.js App Router app into static export before verifying every dynamic route and server feature.
- Keep iOS changes isolated from the live production application.

Before implementation, verify the actual App Store Connect record and choose the bundle identifier to match it. Do not guess or change identifiers after app setup.

## Product scope for iOS MVP

1. Public game link: open a game and submit predictions without requiring a parent account.
2. Parent authentication: sign in/sign up and restore the Supabase session.
3. Parent dashboard: list and manage owned games.
4. Game setup: create and configure a game with selected prediction questions.
5. Guest prediction flow: questions, optional follow-up stories, confirmation/thank-you state.
6. Results: parents can enter actual outcomes, calculate/recalculate scores, and see winners; public results remain governed by the existing game status and RLS rules.
7. Account and privacy: account deletion request/flow, privacy policy link, support contact, and sign-out.
8. Native polish: safe-area handling, keyboard behavior, external-link handling, share sheet for invite links, loading/error/empty states, and accessibility.

## Monetization decision

The business model already discussed is:
- India: unlimited games free.
- US and eligible European markets: target price of USD $5/year, with localized regional prices.

Do not implement or expose paid entitlements until the Apple product, StoreKit purchase flow, server-side purchase verification, subscription lifecycle handling, and Supabase entitlement model are designed and tested. Google Play Billing and Apple StoreKit are separate store integrations; entitlement state should be provider-neutral on the backend. Store-specific policy and storefront availability must be checked before release.

## Implementation phases

### Phase 0 — Verify before coding
- Confirm the App Store Connect app record, bundle identifier, team/signing setup, minimum iOS target, and current Xcode version.
- Confirm app display name, support URL/email, privacy policy URL, and App Store Connect privacy answers.
- Review the current Supabase schema, RLS, auth redirect URLs, and public game/prediction access paths.
- Inventory the existing app flows and define parity acceptance tests.

### Phase 1 — Mobile shell and CI
- Add `mobile/` with a pinned dependency set and committed lockfile.
- Add Capacitor iOS project and app metadata; use the selected bundle ID only after confirming it.
- Add build/lint/type-check scripts and a CI job that does not deploy the web production app.
- Build and launch on an iOS Simulator from Xcode.

### Phase 2 — Core MVP
- Implement the flows listed in Product scope.
- Keep Supabase keys limited to the public publishable/anon key; never embed service-role credentials in the app.
- Test auth persistence, deep links, keyboard/safe-area behavior, public guest submissions, RLS-denied cases, and results visibility.

### Phase 3 — Native features and monetization
- Add native share sheet and polished external URL behavior.
- Implement StoreKit subscription only after backend entitlement and receipt/transaction verification design is reviewed.
- Test purchase, renewal, cancellation, expiry, restore, refund/revocation, and entitlement synchronization with Apple's sandbox/TestFlight facilities.

### Phase 4 — TestFlight and submission
- Test on a real iPhone as well as simulators.
- Prepare App Store screenshots, description, age rating, privacy disclosures, support/privacy links, and review notes.
- Submit through App Store Connect after the core user journeys and subscription lifecycle pass.

## Acceptance gates

- No changes to the production web app or live database policies as part of initial scaffolding.
- No service-role secrets in mobile code.
- Existing Android and web flows remain unchanged.
- Build, lint, and TypeScript checks pass for the mobile project.
- Parent and guest flows pass on simulator and real device.
- Supabase RLS blocks unauthorized owner/admin actions and prevents unpublished game data from leaking.
- Subscription access is granted only after trusted verification and removed/updated when subscription status changes.
- App Review compliance and App Store metadata are checked before submission.

## First implementation task

Complete Phase 0 as a read-only audit, then scaffold the separate `mobile/` client and iOS project on a feature branch. Do not change the production app, live schema, billing products, or store listing without a reviewed PR and explicit release approval.
