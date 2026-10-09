# Leavewell

An offline departure planner that works backward from a hard arrival deadline. Edit walking, driving, tasks, and dated transit connections; compare alternatives and see which assumption changes the departure most.

All demo values are synthetic. The airport example resembles a Seattle airport trip, but contains no live flight, rail, traffic, security, booking, or personal data.

## Run

Requires Node.js 22 or later and npm. No API keys, accounts, location permissions, or backend database.

```sh
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:4310**. The local server stays on loopback by default. After the first successful production load, the service worker caches the complete app shell. Reloading, calculating, editing, saving, and exporting continue offline. Exported scenarios are ordinary versioned JSON files, portable between devices through the Import button under Scenarios. New exports use format version 2; existing version 1 files and saved drafts migrate with independent durations and no added cutoffs.

Development: `npm run dev` uses the same URL. Stop the production server first. Offline caching is deliberately enabled only in production builds. Tests run against the production server:

```sh
npm test
# Uses one Chromium worker; install the matching browser once if it is absent.
npx playwright install chromium
npm run test:e2e
```

`npm run test:e2e` starts the local server if none is running. Screenshots and exported sample JSON land in `artifacts/`; they are ignored by Git. `npx prettier --check src tests` checks source formatting.

### Named local URL with Portless

[Portless](https://github.com/vercel-labs/portless/tree/v0.15.7) gives this checkout a
stable local URL. Complete the local setup above, use **Node.js 24 or newer**
(within this project's supported range), then run:

```sh
npm install -g portless@0.15.7
npm run dev:portless
```

Open **https://leavewell-departure-planner.localhost** with the default proxy settings.
Portless starts its shared proxy automatically. Its first HTTPS run creates and
trusts a local certificate authority and may prompt for administrator privileges
to bind port 443 or update local hostname entries. Start it from an interactive
terminal and review those prompts. `portless doctor` diagnoses local setup issues.

Portless supplies Vite with a free port, a loopback host, and `--strictPort`.
This opt-in script omits the usual fixed port; the injected CLI port takes
precedence over any port in `vite.config.ts`.

Linked Git worktrees receive a branch-name prefix, such as
`https://fix-ui.leavewell-departure-planner.localhost`; use the URL Portless prints.
Use `npm run dev` for the existing direct-server workflow.

Browser storage and offline caches belong to each origin. Existing data at a
numbered localhost URL stays there; use the app's export/import flow when available
to move data to the named URL.

## Use

1. Enter the full arrival date/time and IANA time zone. Add an arrival buffer and choose model coverage.
2. Choose or duplicate a plan. Expand steps to enter fastest, typical (mode), and slowest durations, fixed buffers, and boarding margins. Optional finish-by cutoffs enforce bag-drop or appointment closing times before the post-step buffer. Add, remove, or reorder steps.
3. Enter one dated departure per line for transit, e.g. `2026-10-03T06:12`. Those are the only services the model knows. Add explicit UTC offsets to distinguish repeated clock times.
4. Check the recommendation, typical journey, boarding cutoffs, next listed connections, duration sensitivity, and the departure histogram. The what-if slider demonstrates leaving earlier or later.
5. Save named scenarios locally, or export a file to share or back up. The valid draft is saved automatically. Incomplete duration edits do not overwrite the last valid stored draft; restore inputs before reloading to keep that edit.

Optional constraints, linked-delay stress testing, and DST occurrence choices live under **Time settings & assumptions**. Spring-forward times that do not exist are rejected. Repeated fall-back times require a choice. Every step uses the scenario time zone; travel is measured in elapsed minutes across midnight and offset changes.

## Meaning of the output

The engine draws 4,096 seeded triangular durations. At the default 0% linkage, steps are independent. The linked-delay control makes a chosen fraction of runs share a duration percentile across all steps, while the remaining runs stay independent; each step retains its original triangular marginal. This is an explicit dependence stress assumption, not an inferred real-world correlation. It reverses the chain, including discrete transit departures, once per draw. The lower-tail departure quantile keeps at least the chosen fraction of sampled trips feasible; equality is on time. The displayed departure rounds earlier to a whole minute. Impossible samples stay in the denominator.

**Model coverage is not a calibrated forecast or a real-world guarantee.** Input bounds and schedules can be wrong; tails are finite; service cancellations, closures, and actual cutoffs are not inferred. Linked runs can explore shared slowdowns, and entered step cutoffs are enforced alongside the final deadline. Add them as assumptions, steps, schedules, or buffers. The all-slowest result is a bounded-model comparison, separate from 100% of the finite sample.

The sensitivity bars freeze one duration at its mode and reuse all other samples. They show the minutes of later departure recovered, with negative effects clipped to zero. Effects overlap and are not additive. The typical timeline catches the earliest available listed service; missing its cutoff can still leave enough time on a later connection.

## Hosting preparation

- **Railway:** Dockerfile + `railway.json`, static Node server, `PORT` support, `/healthz`, non-root container user.
- **Cloudflare Workers static assets:** `wrangler.jsonc` points to `dist` with SPA fallback. Build before deploying.
- Nothing has been provisioned or deployed. No public release or paid infrastructure was created.

See [research and decisions](docs/RESEARCH.md), [QA evidence](docs/QA.md), [optional APIs](docs/APIS.md), and [handoff/publication status](docs/HANDOFF.md).
