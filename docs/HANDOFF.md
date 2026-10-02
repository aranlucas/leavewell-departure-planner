# Handoff

Leavewell is complete as a local, usable prototype. Run `npm ci && npm run build && npm start`, then open http://127.0.0.1:4310. A prebuilt `dist` directory is also included in the portable source package; `node server.mjs` runs it without installing runtime dependencies.

## Publication

The new repository [aranlucas/leavewell-departure-planner](https://github.com/aranlucas/leavewell-departure-planner) is verified private through the GitHub connector. Its `main` branch contains an honest bootstrap README; the complete implementation is on `feature/leavewell` for a meaningful draft PR. The final handoff reports the PR URL and exact remote commit after publication.

The built-in browser was unavailable, and the Chrome creation form was not authenticated. After the Mac reconnected, the existing host GitHub CLI session succeeded under normal permission review. No credentials were inspected, copied, configured, or transferred. No existing checkout or published history was rewritten.

## Verification and hosting

Local checks pass: 34 unit tests, 26 real-browser checks across desktop/mobile, and TypeScript/production build. The manually triggered GitHub Actions workflow runs equivalent checks on Node 22/Linux when explicitly invoked. No hosted CI run was started: a free compute budget was not confirmed. The exact reviewed commit receives a clearly labeled local QA status rather than a claim of hosted execution.

Railway and Cloudflare-compatible configurations are included, without provisioning, spending, or a public deployment.

## Deliverables

- React/TypeScript source, deterministic scheduling engine, tests and manual CI workflow.
- Production build, local static server, manifest, versioned offline service worker.
- Research and API briefs, exact local run steps, QA evidence, screenshots and exported scenario JSON.
- Source archive and verified Git bundle in `artifacts/`; final paths and confirmed Library identifiers are reported with the handoff.

Future work with the greatest practical value: optional transit/route imports, correlated-delay stress tests and explicit intermediate cutoffs.
