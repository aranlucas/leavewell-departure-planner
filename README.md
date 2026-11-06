# Leavewell

An offline departure planner that works backward from a hard arrival deadline. Edit walking, driving, tasks, and dated transit connections; compare alternatives and see which assumption changes the departure most.

All demo values are synthetic. The airport example resembles a Seattle airport trip, but contains no live flight, rail, traffic, security, booking, or personal data.

## Run

Use the Node.js version in `.node-version` and the pnpm version pinned in `package.json`. No API keys, accounts, location permissions, or backend database.

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm start
```

Open **http://127.0.0.1:4310**. The local server stays on loopback by default. Wait for **Available offline**, then reload once while online before relying on the cached app. Reloading, calculating, editing, saving, and exporting continue offline. Exported scenarios are ordinary versioned JSON files, portable between devices through the Import button under Scenarios. New exports use format version 2; existing version 1 files and saved drafts migrate with independent durations and no added cutoffs.

Development: `pnpm run dev` uses **https://leavewell.localhost**, served through [Portless](https://github.com/vercel-labs/portless) (a dev dependency); its first run may ask for `sudo` to bind port 443 and trust a local certificate. Offline caching is deliberately enabled only in production builds. Browser tests need a production build:

```sh
pnpm test
# Uses one Chromium worker; install the matching browser once if it is absent.
pnpm exec playwright install chromium
pnpm run build
pnpm run test:e2e
```

`pnpm run test:e2e` starts the local server if none is running. Screenshots and exported sample JSON land in `artifacts/`; they are ignored by Git. `pnpm format:check` checks formatting with the repository’s Oxfmt configuration; `pnpm format` applies it.

Browser tests use Chromium desktop/mobile emulation. Physical devices, other browser engines, screen-reader output, multi-tab conflicts, and service-worker upgrades across releases need separate validation.

## Use

1. Enter the full arrival date/time and IANA time zone. Add an arrival buffer and choose model coverage.
2. Choose or duplicate a plan. Expand steps to enter fastest, typical (mode), and slowest durations, fixed buffers, and boarding margins. Optional finish-by cutoffs enforce bag-drop or appointment closing times before the post-step buffer. Add, remove, or reorder steps.
3. Enter one dated departure per line for transit, e.g. `2026-10-03T06:12`. Those are the only services the model knows. Add explicit UTC offsets to distinguish repeated clock times.
4. Check the recommendation, typical journey, boarding cutoffs, next listed connections, duration sensitivity, and the departure histogram. The what-if slider demonstrates leaving earlier or later.
5. Save named scenarios locally, or export a file to share or back up. The valid draft is saved automatically. Incomplete duration edits do not overwrite the last valid stored draft; restore inputs before reloading to keep that edit.

Optional constraints, linked-delay stress testing, and DST occurrence choices live under **Time settings & assumptions**. Spring-forward times that do not exist are rejected. Repeated fall-back times require a choice. Every step uses the scenario time zone; travel is measured in elapsed minutes across midnight and offset changes.

## Storage and offline recovery

- If device storage is unavailable or full, changes stay in memory. Resolve input errors and export each scenario you need before closing the tab, then use **Retry device saving**.
- If stored data cannot be read, the demo opens with automatic saving paused and the existing bytes preserved. Back up the browser's `leavewell.v1` localStorage value before retrying if you need to recover that data; retrying writes the current workspace over it.
- If offline caching fails, keep the tab open or reload online to retry. Development mode does not prepare an offline cache.

## Meaning of the output

The engine draws 4,096 seeded triangular durations. At the default 0% linkage, steps are independent. The linked-delay control makes a chosen fraction of runs share a duration percentile across all steps, while the remaining runs stay independent; each step retains its original triangular marginal. This is an explicit dependence stress assumption, not an inferred real-world correlation. It reverses the chain, including discrete transit departures, once per draw. The lower-tail departure quantile keeps at least the chosen fraction of sampled trips feasible; equality is on time. The displayed departure rounds earlier to a whole minute. Impossible samples stay in the denominator.

**Model coverage is not a calibrated forecast or a real-world guarantee.** Input bounds and schedules can be wrong; tails are finite; service cancellations, closures, and actual cutoffs are not inferred. Linked runs can explore shared slowdowns, and entered step cutoffs are enforced alongside the final deadline. Add them as assumptions, steps, schedules, or buffers. The all-slowest result is a bounded-model comparison, separate from 100% of the finite sample.

The sensitivity bars freeze one duration at its mode and reuse all other samples. They show the minutes of later departure recovered, with negative effects clipped to zero. Effects overlap and are not additive. The typical timeline catches the earliest available listed service; missing its cutoff can still leave enough time on a later connection.

## Hosting preparation

- **Railway:** Dockerfile + `railway.json`, static Node server, `PORT` support, `/healthz`, non-root container user.
- **Cloudflare Workers static assets:** `wrangler.jsonc` points to `dist` with SPA fallback. Build before deploying.
- The Node server binds to `127.0.0.1` by default; the container sets `HOST=0.0.0.0` so the platform can reach it.

See [research and decisions](docs/RESEARCH.md), [optional APIs](docs/APIS.md), and the [proposed feature roadmap](ROADMAP.md).

The deterministic [tester-army/e2e](https://github.com/tester-army/e2e) workspace journey runs in CI with `pnpm run test:journeys` against the production build. It uses exact locators and assertions and requires no model credentials. Existing Playwright tests cover the wider offline/import/checkpoint flows. See [the reliability audit](docs/reliability-audit.md) for findings and pre-fix reproduction gates.
