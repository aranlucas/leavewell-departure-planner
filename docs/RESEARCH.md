# Research and decisions

The model propagates whole-journey uncertainty rather than adding a separate worst-case percentile to every step. [JCGM 101:2008, published by BIPM](https://www.bipm.org/en/committees/jc/jcgm/publications), provides the Monte Carlo precedent. Leavewell uses it as an educational product technique; it does not claim metrological compliance, calibrated travel probabilities, or convergence at a specified tolerance. See the [output interpretation and limits](../README.md#meaning-of-the-output).

## Why these assumptions

- Triangular fastest/mode/slowest bounds are inputs users can understand and edit. Seeded draws give stable comparisons at a bounded interactive cost; rerendering should not randomly change the recommendation.
- Backward inversion preserves the whole-connection jumps that summing travel intervals misses. A separate forward traversal checks the typical journey and missed cutoffs.
- Linked delays are a stress assumption: a mixture of independent draws and draws sharing one percentile across steps. Each duration keeps its triangular marginal; full linkage makes every step share a percentile. The mixture fraction is not a measured correlation coefficient. Separate seeded streams and common random numbers keep comparisons repeatable.
- Sensitivity holds one step at its mode while reusing all other samples. It answers how much later departure that change permits, rather than attributing variance; effects overlap and cannot be added.
- [Temporal's time-zone model](https://tc39.es/proposal-temporal/docs/timezone.html) separates civil readings from exact instants. Resolving inputs once and then using elapsed time keeps travel durations consistent across midnight and DST. Rejected gaps and explicit overlap choices prevent silent shifts of the user's intended time.
- Local storage and a local-only app shell allow planning without accounts, remote fonts, analytics, or data services. Versioned scenario exports provide a portable backup; provider imports must not make offline planning depend on a network connection.
- CSS/SVG graphics support a deterministic offline interface. Pale neutral surfaces and dark teal decisions keep attention on departure, with sage for timing spread and ochre for risk; mobile places the departure card before journey editing.

## Further experiments

The [feature roadmap](../ROADMAP.md) sets product priorities and acceptance criteria. Additional model questions worth testing are connection-specific time zones and sensitivity to adding a service or shifting a timetable. [Optional data sources](APIS.md) are candidates only if manual schedule entry proves to be the limiting problem.
