# Leavewell feature roadmap

Updated 2026-10-26. Proposed work after the higher-priority Digits/MCP workflows.
The value to test is less effort deciding when to leave, not a claim that the
model guarantees an on-time arrival.

## Starting point

Baseline: `98a6534003e28b33a2894ea089eec5abdcaef1bd`, described in the
[README](README.md). The offline planner already handles dated transit,
step cutoffs, time zones, linked-delay assumptions, saved scenarios, imports and
exports. It uses entered bounds and schedules, not live traffic or transit.

Target user: a traveler or commuter planning a journey with a hard arrival time
and several steps that can go slowly.

## Priorities

### 1. Reuse a journey on a new date

Create a reusable template from a saved scenario. Ask for the new arrival date,
time zone and schedule confirmation rather than copying dated departures as if
they were valid on any day.

Acceptance: stale transit times are explicitly unresolved; the user sees which
assumptions were retained; midnight and daylight-saving boundaries remain
unambiguous. A template cannot silently produce a recommendation from missing
required schedules.

### 2. A day-of-travel view

Show the chosen plan as a compact checklist: leave-by time, next step, boarding
cutoff and entered backup connection. Let the user mark actual progress and
recalculate the remainder after an explicit update.

Acceptance: observed times and original assumptions stay distinguishable; a
missed final connection shows no feasible listed route; offline reload restores
the journey. Display model coverage as a model property, not a success forecast.

### 3. Learn from completed journeys

Optionally record actual step durations and compare them with the user's entered
bounds. Suggest edits for the next journey, with the observation count visible.

Acceptance: an out-of-range duration remains visible, the user approves every
change, and a small sample is not presented as calibrated prediction. All
observations remain local and removable.

### 4. Share a concise departure plan

Add a printable/shareable summary and optional calendar export for the chosen
departure. Include the date, time zone, key cutoffs and assumptions; the existing
scenario JSON remains the editable transfer format.

Acceptance: exported events match the selected scenario and handle offset
changes; recipients can distinguish a snapshot from a live update; private
locations are excluded unless deliberately included. Do not promise background
alarms from a static offline app.

## First release and evidence

Start with templates. Observe five repeat-journey planning sessions and compare
setup time, schedule corrections and misunderstood assumptions with duplicating
a saved scenario today. Ask whether users return for a second actual journey.
Measure the complete planning task, not the number of simulations executed.

Keep live provider integrations behind evidence that manual schedule entry is
the limiting problem. Any integration must show source, fetch time and stale
state while preserving useful offline behavior. Reuse Temporal, Zod and the
existing test runners for date boundaries and complete template-to-plan flows.
