# QA evidence

## Environment

- Node 26.10.0, React 19.2.8, Vite 6.4.3, TypeScript 5.9.3, Temporal polyfill 0.5.1.
- Production build served at http://127.0.0.1:4310.
- Playwright 1.63.0 Chromium, desktop **1440 × 1000**, mobile **393 × 852**, one worker.
- The built-in browser was attempted first; CUA failed with **Transport closed**, including a reset attempt. The brief permits real-browser fallback. Installed Playwright Chromium provided the verification.

## Outcomes

| Check                                                           | Outcome                            |
| --------------------------------------------------------------- | ---------------------------------- |
| TypeScript + production bundle                                  | Pass                               |
| Scheduling/validation unit tests                                | 34 / 34 pass                       |
| Desktop and mobile end-to-end tests                             | 26 / 26 pass                       |
| Correct page identity and meaningful content                    | Pass                               |
| No framework error overlay                                      | Pass                               |
| App console and uncaught runtime errors                         | None in tested flows               |
| Horizontal overflow at tested sizes                             | None                               |
| Duration, buffer, coverage and plan controls                    | Pass                               |
| Add/reorder/remove steps and alternatives                       | Pass                               |
| Invalid duration, missing service, impossible schedule recovery | Pass                               |
| Earliest allowed departure conflict                             | Pass                               |
| DST overlap, DST gap, overnight date display                    | Pass                               |
| Save, reload, reset, reopen named scenario                      | Pass                               |
| Export/download, invalid import rejection, valid import         | Pass                               |
| Offline production refresh, edit, save and persistence          | Pass with browser network disabled |
| Quota failure, in-memory work, export and retry message         | Pass                               |
| Corrupt storage preserves bytes until explicit retry            | Pass                               |
| Dialog Escape and focus restoration                             | Pass; initial focus defect fixed   |
| Missed final connection remains readable                        | Pass                               |

Unit tests additionally cover cross-zone equivalent instants, elapsed spring/fall DST traversal, overnight transit, explicit offset ambiguity, triangular endpoints, repeatable sampling, non-divisible percentile ranks, impossible sample denominators, inclusive boarding thresholds, schedule sorting/deduplication, forward/backward feasibility equivalence, and import limits.

The final artifact directory contains full-page desktop/mobile images, viewport captures, impossible-state captures, and the exported demo file. Source tests are committed; generated evidence is bundled separately. Playwright's Node color-environment warning is a runner warning, not an app console error.

## Limits

Chromium desktop and mobile emulation were tested. Physical iOS/Android, Safari, Firefox, screen-reader output, multi-tab editing conflicts, and long-lived service-worker upgrades across releases were not tested. The app uses native labeled inputs, focus styles, keyboard buttons, a skip link, native modal focus isolation, reduced-motion support, and text explanations of the charts. This is not a formal accessibility certification.

Docker and provider deployment configurations were prepared but not provisioned or executed. No live travel data accuracy was tested because the model deliberately uses entered assumptions and synthetic demos.

## Hosted verification

The GitHub Actions workflow is manual (`workflow_dispatch`) and has not been run. A free hosted compute budget was not confirmed. Exact-commit local results are reported through a clearly labeled GitHub commit status. The workflow prepares Node 22/Linux validation; those environment results remain unverified.
