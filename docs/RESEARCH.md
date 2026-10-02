# Research and decisions

Research checked on 2026-10-01 during the delegated prototype session.

The useful precedent is distribution propagation rather than adding a separate worst-case percentile to every step. [JCGM 101:2008, published by BIPM](https://www.bipm.org/en/committees/jc/jcgm/publications) describes propagating input distributions with Monte Carlo, coverage intervals, triangular inputs, and joint distributions when inputs are dependent. Its numerical guidance also warns that finite simulations have uncertainty, particularly in interval endpoints. Leavewell adopts propagation as an educational product technique; it does not claim metrological compliance, calibrated travel probabilities, or convergence at a specified tolerance.

[TC39's Temporal time-zone documentation](https://tc39.es/proposal-temporal/docs/timezone.html) distinguishes civil clock readings from exact instants and explains DST skipped/repeated times. [The maintained Temporal polyfill](https://github.com/js-temporal/temporal-polyfill) supplies those conversions consistently. Leavewell resolves dated inputs once, then subtracts elapsed milliseconds. Missing civil times fail; ambiguous ones require an explicit occurrence or offset. It uses the runtime's IANA time-zone data.

## Deliberate choices

- Seeded 4,096-run simulation gives stable interaction and a small bounded workload. A rerender does not randomly change the recommendation.
- Each duration uses fastest/mode/slowest triangular bounds, which users can understand and edit. Independence is explicitly disclosed.
- Backward inversion handles discrete departures directly, preserving the whole-connection jumps that interval sums miss. An independent forward traversal verifies the rendered typical journey and missed-connection cutoffs.
- The confidence control is labeled **model coverage**. Impossible samples count as failures. Inclusive order statistics and rounding toward earlier departure are tested.
- Sensitivity reuses the same samples with one step frozen at its typical value. This is a practical marginal experiment, not a variance attribution or additive decomposition.
- LocalStorage keeps a versioned draft and up to 20 named scenarios. Import validates bounds and schema before entering the model. The production service worker caches only local assets; no remote fonts, analytics, AI APIs, personal accounts, or data sources are required.
- CSS/SVG graphics keep the implementation deterministic and offline. The visual system uses pale neutral surfaces, dark teal decisions, sage timing spread, and ochre risk. An editorial heading contrasts with concise, labeled controls. Mobile puts the departure card before journey editing.

## Next useful experiments

1. Compare independent assumptions against a user-controlled shared-delay factor; show how correlation changes the departure.
2. Let users enter observed durations locally, then compare triangular assumptions with empirical distributions without uploading data.
3. Add explicit intermediate deadlines such as bag-drop close times and appointment document cutoffs.
4. Add connection-specific time zones for cross-zone travel while retaining elapsed-duration semantics.
5. Allow sensitivity to timetables themselves: add one service or shift a schedule, then inspect the gained margin.
