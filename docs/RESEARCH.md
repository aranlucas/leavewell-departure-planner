# Research and decisions

Research checked on 2026-10-01 during the delegated prototype session.

The useful precedent is distribution propagation rather than adding a separate worst-case percentile to every step. [JCGM 101:2008, published by BIPM](https://www.bipm.org/en/committees/jc/jcgm/publications) describes propagating input distributions with Monte Carlo, coverage intervals, triangular inputs, and joint distributions when inputs are dependent. Its numerical guidance also warns that finite simulations have uncertainty, particularly in interval endpoints. Leavewell adopts propagation as an educational product technique; it does not claim metrological compliance, calibrated travel probabilities, or convergence at a specified tolerance.

[TC39's Temporal time-zone documentation](https://tc39.es/proposal-temporal/docs/timezone.html) distinguishes civil clock readings from exact instants and explains DST skipped/repeated times. [The maintained Temporal polyfill](https://github.com/js-temporal/temporal-polyfill) supplies those conversions consistently. Leavewell resolves dated inputs once, then subtracts elapsed milliseconds. Missing civil times fail; ambiguous ones require an explicit occurrence or offset. It uses the runtime's IANA time-zone data.

## Deliberate choices

- Seeded 4,096-run simulation gives stable interaction and a small bounded workload. A rerender does not randomly change the recommendation.
- Each duration uses fastest/mode/slowest triangular bounds, which users can understand and edit. Independence is the default and explicitly disclosed.
- Backward inversion handles discrete departures directly, preserving the whole-connection jumps that interval sums miss. An independent forward traversal verifies the rendered typical journey and missed-connection cutoffs.
- The confidence control is labeled **model coverage**. Impossible samples count as failures. Inclusive order statistics and rounding toward earlier departure are tested.
- Sensitivity reuses the same samples with one step frozen at its typical value. This is a practical marginal experiment, not a variance attribution or additive decomposition.
- LocalStorage keeps a versioned draft and up to 20 named scenarios. Import validates bounds and schema before entering the model. The production service worker caches only local assets; no remote fonts, analytics, AI APIs, personal accounts, or data sources are required.
- CSS/SVG graphics keep the implementation deterministic and offline. The visual system uses pale neutral surfaces, dark teal decisions, sage timing spread, and ochre risk. An editorial heading contrasts with concise, labeled controls. Mobile puts the departure card before journey editing.

## Verified overnight refinements

Intermediate finish-by cutoffs now constrain the completion of any step, before its post-step buffer. Backward inversion intersects that cutoff with the downstream deadline; the forward timeline separately reports missed checkpoints even when the final arrival would fit. Dates, DST resolution, inclusive equality, transit arrival limits, and impossible connections have dedicated tests.

The optional linked-delay stress control implements a mixture of independent joint draws and shared-percentile draws. In the chosen fraction of runs, every duration uses one common uniform quantile through its own triangular inverse CDF. Every marginal remains triangular. At 100%, steps are comonotonic; at 0%, the original independent seed stream is unchanged. The mixture fraction is not a measured correlation coefficient. A separate seeded linkage stream and common random numbers make slider comparisons repeatable. This is an implementation choice informed by JCGM's distinction between marginal and joint input distributions, not a claim that it reproduces actual traffic/security dependence.

Version 2 portable files preserve these assumptions. Version 1 files and existing device storage gain empty checkpoints and 0% linkage without mutating imported inputs or altering their original departure samples.

## Next useful experiments

1. Let users enter observed durations locally, then compare triangular assumptions with empirical distributions without uploading data.
2. Add connection-specific time zones for cross-zone travel while retaining elapsed-duration semantics.
3. Allow sensitivity to timetables themselves: add one service or shift a schedule, then inspect the gained margin.
