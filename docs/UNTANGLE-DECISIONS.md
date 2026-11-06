# Untangle decision log

## Scope and baseline (2026-11-05)

Applied the exact [untangle-codebase skill](https://github.com/caldoai/skills/blob/main/skills/untangle-codebase/SKILL.md), fetched from its raw main URL before inspection. Both optional additions (comments and tests) are authorized. Work is confined to the bound worktree, initially clean at `4c5d9af`; initially no deployment, publication or merge. User subsequently authorized commit, push, PR creation and merge after required checks/reviews pass.

Inventory: 19 application TS/TSX files, stylesheet, three unit suites and one desktop/mobile E2E suite; small static Node server; Vite/PWA, Vitest, Playwright, lint/format and TypeScript config; container/hosting and CI config; README, roadmap and two reference docs. Reviewed all these areas, imports and recent Git history. Recent changes already pruned redundant tests and documentation; retain that direction rather than introduce framework layers.

Baseline: `pnpm check` passes (lint, tooling typecheck, 82 unit tests, application typecheck, production build). Existing build warning: main bundle exceeds 500 kB. Browser baseline pending environment check. No baseline application failures identified.

## Redesign and implementation decisions

1. One domain timing preparation module shared by file imports and engine preparation.
   - Hidden link: both independently split/limit/parse transit dates and resolve optional finish-by dates.
   - Preserve structural-only draft validation, full executable import validation (including inactive plans), sorting/deduplication, explicit offsets and step-specific engine errors. Timing depends on model/time only; neither validation nor engine depends on the other for timing policy.
2. Domain choices and supported limits live with the model; UI display metadata remains in the UI module.
   - Hidden links: step kinds and DST choices repeated in types, guards and Zod; add-step labels/iteration duplicated UI metadata. Numeric/text/cardinality limits repeated between validation, controls, library and file import.
   - Keep schema error messages stable and unknown extension data intact. No new dependency: Zod and Temporal remain the existing boundary/time libraries.
3. A journey summary owns its typical forward trip and both risk summaries, sharing sampled forward trips.
   - Needless link: caller-supplied timeline rows must align with prepared step indices.
   - Surplus: connection and checkpoint risks separately recompute the same sampled trips.
4. Centralize persistence status transitions in one App-local write operation.
   - Hidden link: autosave, named save and retry each coordinate persisted/warning/pause state manually.
   - Preserve corruption pause, incomplete draft protection, storage failure recovery and named-copy behavior. Keep notices and library UI in App.
5. Remove surplus native-dialog Escape handler and stale tooling include globs; reuse MINUTE and SAMPLE_COUNT in presentation.
   - Native cancel already implements Escape dismissal. Existing keyboard regression must remain.
6. Comments and test cleanup last.
   - Keep comments explaining external constraints, compatibility, mathematical contracts and non-obvious domain semantics; remove implementation narration.
   - Initial review found existing tests meaningful after recent cleanup. Do not delete meaningful safety coverage merely to reduce count.

## Special-case audit / deliberate retention

DST gaps and overlaps represent civil-time requirements. Negative infinity represents impossible trips and remains in coverage denominators. Completion cutoffs precede post-step buffers. Sub-millisecond tolerance handles numerical roundoff. Corrupt storage must preserve bytes until explicit recovery. Delayed download URL revocation accommodates browser lifecycle. Server health/SPA/asset routing and PWA lifecycle have distinct external contracts. These are requirements, not candidates for a generic abstraction.

Keep the compact engine/server and current directory layout: splitting by size or introducing adapters would add navigation without isolating independent change. No custom scripts or new dependencies are required.

## Reviews and validation

Initial independent whole-repository subagent review confirmed items above and no worthwhile changes to static serving, demos, hosting, CI or reference docs. Final review rounds and introduced/baseline failures will be recorded below.

Resume: exact skill re-read; existing edits preserved. Browser baseline failed before application execution because the pinned Chromium headless executable was missing; installation was attempted. This is an environment baseline failure, separate from introduced failures. Persistence transitions now use one write operation; a separate hook is unnecessary because App owns the draft and named copies.

Final independent review found no remaining worthwhile production changes or behavior regressions. It caught weakened positive connection-risk coverage during API migration; restored with two explicit duration runs: at 09:18, 10 minutes reaches the inclusive 09:28 boarding cutoff, 11 minutes misses, so risk must be 0.5. The separate +1 ms final-connection assertion remains. This is domain arithmetic, independent of the risk implementation. Test cleanup removed only the redundant body/server-error assertion already covered by visible app headings; all meaningful existing suites remain. Removed narration comments on validation/normalization and zone validation; retained mathematical, migration, browser and compatibility contracts. Introduced lint failures (spacing, non-null assertions and native-dialog keyboard lint) were corrected without weakening behavior tests.

Latest instruction: all further tests/builds run only in CI. No owned test processes remained at restart. Prior recorded unit run passed 82 tests; final build/browser validation is not claimed locally. Existing PR CI runs lint/format, production build, all unit tests and desktop/mobile browser regressions, so no workflow change is needed.

CI run 42255117058: lint/format, production build and 82 unit tests passed; 34/36 browser tests passed. Both desktop/mobile storage retry regressions failed because the consolidated writer no longer emitted the retry failure toast. Restored caller feedback using explicit saved/incomplete/unavailable write outcomes; tests remain unchanged. Further verification is CI-only.
