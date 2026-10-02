import { ArrowUpRight, CircleHelp, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { coverageAt, histogram, SAMPLE_COUNT } from "../engine";
import type { Analysis } from "../engine";
import type { Scenario } from "../model";
import { MINUTE, offsetLabel, timeLabel } from "../time";
export default function Result({
  analysis,
  scenario,
  offset,
  setOffset,
}: {
  analysis: Analysis;
  scenario: Scenario;
  offset: number;
  setOffset: (n: number) => void;
}) {
  const leave =
    analysis.recommendation === null
      ? null
      : analysis.recommendation + offset * MINUTE;
  const coverage = coverageAt(analysis.samples, leave);
  const chart = useMemo(() => histogram(analysis.samples), [analysis.samples]);
  const dominant = analysis.sensitivities[0];
  const maxSensitivity = Math.max(
    1,
    ...analysis.sensitivities.map((s) => s.minutes),
  );
  const valid = analysis.status === "ready";
  return (
    <aside className="result-column" aria-label="Departure recommendation">
      <section
        className={`departure-card ${!valid ? "problem" : ""}`}
        aria-live="polite"
      >
        <div className="recommendation-label">
          <ShieldCheck size={18} />
          <span>
            {valid
              ? "Latest departure for your target"
              : "Plan needs attention"}
          </span>
        </div>
        <div className="departure-time" data-testid="recommendation">
          {timeLabel(analysis.recommendation, scenario.timeZone)}
        </div>
        <p>
          {analysis.recommendation !== null
            ? timeLabel(analysis.recommendation, scenario.timeZone, true)
            : "No usable departure yet"}
        </p>
        {valid && (
          <div className="coverage-line">
            <strong>{Math.round(analysis.coverage * 100)}%</strong>
            <span>
              of modeled trips meet every cutoff
              <br />
              and your {scenario.finalBuffer} min arrival buffer
            </span>
          </div>
        )}
        {analysis.status === "invalid" && (
          <div className="result-error" role="alert">
            {analysis.error}
          </div>
        )}
        {analysis.status === "impossible" && (
          <div className="result-error" role="alert">
            The listed connections cannot meet{" "}
            {Math.round(scenario.confidence * 100)}% model coverage. Add earlier
            departures, reduce durations, or move the deadline.
          </div>
        )}
        {analysis.status === "constraint" && (
          <div className="result-error" role="alert">
            Your earliest allowed departure is too late for this target.
            Coverage at that time:{" "}
            {Math.round((analysis.earliestCoverage ?? 0) * 100)}%. Change the
            constraint or choose another plan.
          </div>
        )}
        <div className="recommendation-footnote">
          {SAMPLE_COUNT.toLocaleString()} repeatable model runs · rounded
          earlier to the minute
        </div>
      </section>
      {analysis.prepared && analysis.recommendation !== null && (
        <>
          <section className="what-if">
            <div className="section-heading">
              <h2>What if you leave later?</h2>
              <span>
                {offset > 0 ? "+" : ""}
                {offset} min
              </span>
            </div>
            <label className="sr-only" htmlFor="departure-offset">
              Explore departure offset in minutes
            </label>
            <input
              id="departure-offset"
              type="range"
              min={-30}
              max={60}
              step={1}
              value={offset}
              onChange={(e) => setOffset(Number(e.target.value))}
            />
            <div className="what-if-result">
              <strong>{timeLabel(leave, scenario.timeZone)}</strong>
              <span
                className={coverage < scenario.confidence ? "risk-text" : ""}
              >
                {Math.round(coverage * 100)}% on time in model
              </span>
            </div>
            {analysis.prepared.earliest !== null &&
              leave! < analysis.prepared.earliest && (
                <p className="risk-text">
                  This departure is before your earliest allowed time.
                </p>
              )}
            <button
              className="text-button"
              disabled={offset === 0}
              onClick={() => setOffset(0)}
            >
              Back to recommended departure
            </button>
          </section>
          {chart && (
            <section className="distribution">
              <h2>Why this departure?</h2>
              <p>
                Each bar is a latest workable departure from the model. Your
                target keeps at least {Math.round(scenario.confidence * 100)}%
                of all runs at or after the recommendation.
              </p>
              <div
                className="histogram"
                role="img"
                aria-label="Distribution of latest workable departures; orange bars require an earlier departure than the recommendation."
              >
                {chart.counts.map((n, i) => {
                  const boundary =
                    chart.min +
                    ((i + 0.5) / chart.counts.length) * (chart.max - chart.min);
                  return (
                    <div
                      key={i}
                      className={
                        boundary < analysis.recommendation! ? "risk-bar" : ""
                      }
                      style={{
                        height: `${Math.max(2, (n / Math.max(...chart.counts)) * 100)}%`,
                      }}
                    />
                  );
                })}
                <span
                  className="recommendation-marker"
                  style={{
                    left: `${Math.max(0, Math.min(100, ((analysis.recommendation! - chart.min) / (chart.max - chart.min)) * 100))}%`,
                  }}
                />
              </div>
              <div className="chart-axis">
                <span>{timeLabel(chart.min, scenario.timeZone)}</span>
                <span>{timeLabel(chart.max, scenario.timeZone)}</span>
              </div>
              <div className="model-bounds">
                <div>
                  <span>Typical durations</span>
                  <strong>
                    {timeLabel(analysis.typical, scenario.timeZone)}
                  </strong>
                </div>
                <div>
                  <span>All slowest bounds</span>
                  <strong>
                    {timeLabel(analysis.bounded, scenario.timeZone)}
                  </strong>
                </div>
              </div>
              {analysis.impossibleFraction > 0 && (
                <p>
                  {Math.round(analysis.impossibleFraction * 100)}% of runs have
                  no feasible listed connection and are counted as failures.
                </p>
              )}
            </section>
          )}
          <section className="uncertainty">
            <div className="section-heading">
              <h2>Where the uncertainty lives</h2>
              <ArrowUpRight size={18} />
            </div>
            <p>
              {dominant && dominant.minutes > 0 ? (
                <>
                  <strong>{dominant.label}</strong> is the biggest lever. If it
                  always took its typical time, you could leave about{" "}
                  <strong>{dominant.minutes} min later.</strong>
                </>
              ) : (
                <>
                  No single step changes the minute-level recommendation.
                  Timetable jumps can hide smaller effects.
                </>
              )}
            </p>
            <div className="sensitivity-list">
              {analysis.sensitivities.map((s) => (
                <div key={s.id}>
                  <div>
                    <span>{s.label}</span>
                    <strong>+{s.minutes} min</strong>
                  </div>
                  <div className="sensitivity-track">
                    <span
                      style={{
                        width: `${(s.minutes / maxSensitivity) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <details>
              <summary>
                <CircleHelp size={14} />
                How to read this
              </summary>
              <p>
                One step at a time is frozen at its typical duration; all other
                sampled durations stay the same. Bars show how much later the
                recommendation becomes. Effects overlap and do not add up.
                Timetable gaps can amplify an effect. Zero does not mean a step
                has no uncertainty.
              </p>
            </details>
          </section>
        </>
      )}
      <section className="assumptions">
        <h2>A model, with assumptions</h2>
        <p>{scenario.assumption}</p>
        <p>
          Durations use triangular distributions.{" "}
          {scenario.linkedDelays
            ? `${Math.round(scenario.linkedDelays * 100)}% of runs share a duration percentile across all steps; other runs are independent.`
            : "All steps are independent."}{" "}
          Buffers are fixed. Services follow only the schedule you entered.
          Enter any check-in or appointment closing time as a step finish-by
          cutoff. Cancellations and closures are outside this model.
        </p>
        <p>
          <strong>
            {Math.round(scenario.confidence * 100)}% is model coverage, not a
            calibrated chance or a guarantee.
          </strong>{" "}
          Slowest-bound departure only protects against the stated bounds and
          listed schedule.
        </p>
        {analysis.recommendation !== null && (
          <p>
            Time zone: {scenario.timeZone} · UTC
            {offsetLabel(analysis.recommendation, scenario.timeZone)} at
            departure. All steps share this time zone.
          </p>
        )}
      </section>
    </aside>
  );
}
