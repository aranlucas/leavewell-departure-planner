# Handoff

Leavewell is complete as a local, usable prototype. Run `npm ci && npm run build && npm start`, then open http://127.0.0.1:4310. A prebuilt `dist` directory is also included in the portable source package; `node server.mjs` runs it without installing runtime dependencies.

## Publication

The repository [aranlucas/leavewell-departure-planner](https://github.com/aranlucas/leavewell-departure-planner) is verified private. The core implementation was merged through [PR #1](https://github.com/aranlucas/leavewell-departure-planner/pull/1). [PR #2](https://github.com/aranlucas/leavewell-departure-planner/pull/2) contains the checkpoint/linkage refinements on `feature/checkpoints-and-linked-delays`, refreshed against the merged main branch without rewriting published history. Final merge outcomes and exact commit IDs are recorded in the artifact receipt.

The built-in browser was unavailable, and the Chrome creation form was not authenticated. After the Mac reconnected, the existing host GitHub CLI session succeeded under normal permission review. No credentials were inspected, copied, configured, or transferred. No existing checkout or published history was rewritten.

## Verification and hosting

Local checks pass: 47 unit tests, 34 real-browser checks across desktop/mobile, and TypeScript/production build. The manually triggered GitHub Actions workflow runs equivalent checks on Node 22/Linux when explicitly invoked. No hosted CI run was started: a free compute budget was not confirmed. The exact reviewed commit receives a clearly labeled local QA status rather than a claim of hosted execution.

Railway and Cloudflare-compatible configurations are included, without provisioning, spending, or a public deployment.

## Deliverables

- React/TypeScript source, deterministic scheduling engine, tests and manual CI workflow.
- Production build, local static server, manifest, versioned offline service worker.
- Research and API briefs, exact local run steps, QA evidence, screenshots and exported scenario JSON.
- Source archive and verified Git bundle in `artifacts/`; final paths and confirmed Library identifiers are reported with the handoff.

The refinements deliver explicit intermediate cutoffs, a user-controlled linked-delay stress test, version 1 migration, and clearer accessible field descriptions. Original artifacts are preserved separately from v2 captures/bundles.

Future work with the greatest practical value: explicit transit/route imports, local observed-duration distributions, and connection-specific time zones.

## Merge authorization

The user later explicitly authorized merging verified project PRs. Earlier automatic-review denials changed no remote state; retrying after verbatim permission was supplied directly in the task was accepted. No paid GitHub upgrade, protection bypass, hosted run, or deployment was attempted.
