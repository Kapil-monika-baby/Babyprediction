# GoodNews Baby iOS App — Implementation Plan

## Goal
Ship GoodNews Baby through the Linkcards Apple Developer account while reusing the existing production product and Supabase backend.

## Constraints
- Keep the existing web/PWA and Android TWA release working.
- Keep the bundle identifier aligned with the existing product identity where available: `com.linkcards.babyprediction`.
- Do not introduce a second production database or duplicate game/scoring logic.
- Do not commit signing certificates, private keys, passwords, Supabase service-role keys, or other secrets.
- Keep the first iOS build focused on core game flows; do not add paid features or subscriptions in the first pass.

## Architecture decision to validate
The web app is a Next.js application with dynamic routes and server-dependent functionality. Do not assume it can be exported as a static site and bundled directly into an iOS app.

Preferred first spike: a dedicated Capacitor iOS client that reuses the existing web experience where compatible, while keeping production APIs/backend authoritative. Before committing to the wrapper, inspect routes, server actions/API routes, auth redirects, deep links, and file/plugin needs. If the wrapper is not robust or App Review risk is too high, consider a native SwiftUI client against the same backend instead.

## Phase 0 — Repository and environment audit
- Inspect `platform/package.json`, `platform/next.config.ts`, route structure, Supabase client setup, auth callback URLs, and environment variables.
- Confirm the deployed production URL and current main branch are the source of truth.
- Confirm the Mac has a supported Xcode version and CocoaPods/Node requirements.
- Check Apple Developer team/bundle identifier/App Store Connect app record before signing.

## Phase 1 — Compatibility spike
- Create an isolated iOS branch/project; do not modify production deployment configuration.
- Validate login/signup and auth persistence on iOS.
- Validate create game, share link, guest join, submit predictions, parent dashboard, results, and scoring.
- Test external links, share sheet, safe areas, keyboard behavior, loading/error states, and offline/network failures.
- Verify Universal Links or a safe fallback so shared game URLs open correctly.
- Record unsupported web features before selecting wrapper vs native.

## Phase 2 — iOS experience
- Add iOS app icon, launch/splash presentation, status-bar/safe-area styling, navigation/back behavior, and native share integration.
- Ensure the guest prediction flow works without forcing guests to create accounts if the current product permits that.
- Preserve accessibility, privacy disclosures, and account deletion/support paths.

## Phase 3 — QA and App Store submission
- Test on a real iPhone and current iOS simulator.
- Validate production and test environments separately.
- Review App Privacy answers against actual data collection and Supabase/Vercel processing.
- Complete screenshots, description, support URL, privacy policy URL, age rating, and review notes.
- Confirm App Review compliance: a thin website wrapper can be rejected if it provides insufficient app-specific value. The app must offer a reliable, useful experience beyond merely loading a website.
- Archive/sign using the Linkcards Apple Developer team; never commit signing assets or secrets.

## Definition of done for first TestFlight build
- A signed build installs on a real iPhone.
- Sign-in/session persistence works.
- Parent can create a game and share an invite.
- Guest can open the invite, submit predictions, and retry safely after errors.
- Parent dashboard and published results match backend state.
- No regression to web/Android production.
- Privacy and App Store metadata are ready for review.

## Open technical questions to resolve during audit
- Does the Next.js app rely on server components/actions that cannot run in a bundled client?
- Are all relevant auth redirects and deep links configured for an iOS bundle?
- Which app flows require a native plugin versus a normal web implementation?
- Is the iOS wrapper sufficiently differentiated and useful for App Review, or should core screens be native SwiftUI?
