# Reliability audit — 2026-11-06

Base: remote main `7389ea68dbca5ce177daa047ba3d711f7219390f` (merged untangle pass). Clean isolated worktree. Tests/builds run in CI only.

## Inventory and boundaries (before implementation)

- `model.ts`, `validation.ts`: public Scenario/Plan/Step interfaces; version 1/2 portable JSON, size/count/numeric limits, extension preservation, legacy normalization. Imports validate every plan and executable civil time before replacing the draft.
- `time.ts`, `prepare.ts`, `engine.ts`: Temporal civil-time resolution; elapsed-minute arithmetic, dated transit, boarding buffers, per-step completion cutoffs, final buffer, earliest departure constraint, seeded duration samples, quantiles, what-if timeline and coverage. Success and impossible/invalid/constraint paths inspected.
- `app.tsx`, components: edit/compare/duplicate/reorder plans, save/load/delete named scenarios, async import/export, input errors, storage warnings and explicit retry. No authentication, tenancy, remote mutation, or retrying network API exists.
- `storage.ts`: untrusted localStorage JSON; whole-workspace recovery with original bytes preserved on read failure. Writes are synchronous and atomic per localStorage call. Multiple tabs have last-writer behavior, already documented as unvalidated; no collaborative semantics are promised.
- `main.tsx`, Vite PWA: production service-worker registration, shell caching failure notice, offline readiness. Existing browser coverage checks offline reload, editing and recovery.
- `server.mjs`, Docker/Railway/Workers config: static assets, SPA fallback, path containment, methods, health, CSP, stream resource lifecycle. No production changes authorized.
- Existing Vitest and Playwright suites, CI, tooling and history reviewed. Preserve meaningful coverage. Add the actual tester-army e2e runner alongside Playwright, not as a substitute.

## Findings under review

1. **Storage write accepts an unreadable saved collection** (`storage.ts:persistWorkspace`, high confidence, medium impact). Only draft is validated. A JavaScript caller supplying an invalid saved entry or more than 20 entries gets a successful write, then `readWorkspace` rejects the entire workspace on reload. Expected: reject before replacing good stored bytes. Use the existing zod workspace schema; preserve the boolean incomplete-input contract.
2. **Static file stream can crash the server** (`server.mjs:createReadStream`, high confidence, medium impact). File disappearance/permission failure between stat and open emits an unhandled stream error; the enclosing async catch cannot catch event-emitter errors. Expected: close the affected response and keep serving requests. Add stream error and disconnect cleanup with Node native stream lifecycle support.

## Rejected hypotheses / existing protections

- DST gaps/folds, finite durations, duplicate plan/step IDs, missing selected plan and malformed JSON already have explicit validation and coverage; no replacement implementation needed.
- Impossible transit draws stay in the coverage denominator; quantile rounds earlier. No evidence to change the model or seeded stream.
- Incomplete date text in device drafts is intentional; executable-time validation belongs to file import and analysis. Do not start rejecting recoverable editor drafts.
- Model estimates are expressly not forecasts. No live service/traffic/authentication requirements inferred.

## Validation plan

Before each regression, expected behavior follows an external contract: a workspace accepted for writing must be readable on reload; a failed static asset read must not terminate other requests. Run new regression tests against the base source in CI and require the specific failures, then run the fixed suites/build. Deterministic e2e will exercise edit/save/reload/load and input-error recovery on the real production app, without model calls or secrets. Keep all existing Playwright journeys. Independent review and CI evidence pending.

## Framework evidence

Read published quickstart and GitHub Actions docs on 2026-11-06. npm metadata confirms `e2e@0.23.0` (tester-army), Node `^22.22.3 || >=24.8.0`; web engine `@e2e-dev/web@0.15.5`. Existing Node 22.23.4 is compatible. Dependencies will be pinned in pnpm lockfile; install hooks suppressed locally. Web is a supported target; mobile is inapplicable.

## Additional findings from independent review

3. **Offset constraints disappear in controls** (`app.tsx`, high confidence, medium impact). Versioned imports accept exact offset-bearing arrival/earliest strings, but datetime-local sanitizes those values to empty. Keep native date controls for canonical local values; use editable text for other values, including partial offsets while editing. Regression imports offsets, backspaces an offset, edits and reloads.
4. **Consumed buffer claimed as reserved** (`components/timeline.tsx`, high confidence, medium impact). With hard deadline 08:00, 15-minute arrival buffer and fixed 10-minute step, recommendation is 07:35. Leaving ten minutes later arrives 07:55; previously the timeline still claimed 15 minutes reserved. Now explicitly reports buffer unmet. Regression independently asserts five minutes remaining and buffer unmet.
5. **Oversized portable exports cannot be reimported** (`validation.ts:exportScenario`, high confidence, low likelihood). Multiple long schedules or retained extension data can exceed the import byte limit. Reject oversized UTF-8 exports before claiming successful portable output. Regression uses multibyte text to distinguish bytes from UTF-16 length.
6. **Deletion claims durable success when persistence cannot succeed** (`app.tsx:saved-row`, high confidence, medium impact). Deleting a saved copy with an incomplete draft or unavailable/paused storage previously claimed it was removed even though it reappeared on reload. Retain the in-memory deletion, attempt synchronous persistence when allowed, and explicitly disclose pending durability otherwise. Regression completes the draft and verifies deletion becomes durable on reload.

Finding 1 is a caller-facing public write-contract asymmetry, not a proven ordinary UI path to corrupt saved entries. The current UI validates saved snapshots and enforces capacity. Its fix hardens the same boundary that read already enforces without changing draft date recovery.

## Implementation and evidence

- Native Node stream error/response-close handlers handle asynchronous read failures and disconnect cleanup; no general-purpose helper or new script introduced.
- Existing zod workspace schema validates writes. Temporal arithmetic and seeded calculation behavior unchanged.
- Added exact published `e2e@0.23.0` and `@e2e-dev/web@0.15.5` for the explicitly requested framework, chosen for supported deterministic web fixtures and compatibility with existing Playwright 1.64.1. Read the installed e2e skill/setup/writing guides. Local dependency install used `--ignore-scripts`; no tests/builds/browser runs locally.
- CI has ordinary lint, tooling types, unit tests, production build, existing desktop/mobile Playwright, and the real e2e workspace journey. Failure reports/traces are uploaded. A separate pre-fix job restores the five defective source files from the fixed audit base and requires exactly four failing unit cases and three failing desktop UI cases; infrastructure errors cannot count as success.
- Independent same-provider review challenged findings and implementation. It identified the partial-offset editing trap; the implementation and regression were corrected before submission. Final review/CI results will be recorded in portfolio status and PR.

The original immutable portfolio queue contains no entry for this added project. Do not infer or launch a cross-lane successor from another project; coordinator must supply lane ownership for any continuation.
