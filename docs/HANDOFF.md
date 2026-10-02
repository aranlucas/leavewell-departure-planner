# Handoff

Leavewell is complete as a local, usable prototype. Run `npm ci && npm run build && npm start`, then open http://127.0.0.1:4310. A prebuilt `dist` directory is also included in the portable source package; `node server.mjs` runs it without installing runtime dependencies.

## Publication

The new repository [aranlucas/leavewell-departure-planner](https://github.com/aranlucas/leavewell-departure-planner) is verified private through the GitHub connector. Its `main` branch contains an honest bootstrap README; the complete implementation is on `feature/leavewell` for a meaningful draft PR. The core draft PR is [#1](https://github.com/aranlucas/leavewell-departure-planner/pull/1). Overnight refinements live on `feature/checkpoints-and-linked-delays`, based on that implementation branch, so their follow-up PR shows only the new feature diff. The final receipt reports both PRs and exact remote commits.

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

## Merge approval

No merge occurred. Automatic approval review rejected merging because this task's original delegation prohibited existing-PR merges and it did not accept the later permission retrieved from the parent thread as trusted authorization. Direct approval was requested in this task; the PRs remain open unless that approval arrives. No paid GitHub upgrade, protection bypass, hosted run, or deployment was attempted.
