import { ArrowRight, Flag, TrainFront } from "lucide-react";
import type { Analysis } from "../engine";
import { checkpointRisks, connectionRisks, forward } from "../engine";
import { localDate, timeLabel } from "../time";
import type { Scenario } from "../model";
import { icons } from "./StepEditor";
export default function Timeline({
  analysis,
  scenario,
  leave,
}: {
  analysis: Analysis;
  scenario: Scenario;
  leave: number | null;
}) {
  if (!analysis.prepared || leave === null) return null;
  const p = analysis.prepared;
  const trip = forward(
    p,
    leave,
    p.steps.map((s) => s.mode),
  );
  const risks = connectionRisks(analysis, leave, trip.rows);
  const checkpoints = checkpointRisks(analysis, leave);
  return (
    <section className="timeline-section" aria-labelledby="timeline-title">
      <div className="section-heading">
        <div>
          <h2 id="timeline-title">Your journey, at a glance</h2>
          <p>Typical durations from your chosen departure.</p>
        </div>
        <span className="subtle-label">
          All times · {scenario.timeZone.split("/").pop()?.replaceAll("_", " ")}
        </span>
      </div>
      <div className="timeline-start">
        <span className="timeline-dot" />
        <strong>Leave at {timeLabel(leave, scenario.timeZone)}</strong>
        <span>{timeLabel(leave, scenario.timeZone, true)}</span>
      </div>
      <ol className="timeline-list">
        {trip.rows.map((row) => {
          const Icon = icons[row.step.kind];
          const risk = risks.find((r) => r.id === row.step.id);
          return (
            <li key={row.step.id}>
              <span className={`timeline-marker ${row.step.kind}`}>
                <Icon size={16} />
              </span>
              <div className="timeline-content">
                <div className="timeline-row">
                  <strong>{row.step.label}</strong>
                  <span>
                    {timeLabel(row.start, scenario.timeZone)}{" "}
                    <ArrowRight size={12} />{" "}
                    {timeLabel(row.end, scenario.timeZone)}
                  </span>
                </div>
                <div className="timeline-detail">
                  {row.step.mode} min typical
                  {row.step.buffer ? ` + ${row.step.buffer} min buffer` : ""}
                  {Number.isFinite(row.start) &&
                  localDate(row.start, scenario.timeZone) !==
                    localDate(leave, scenario.timeZone)
                    ? ` · ${localDate(row.start, scenario.timeZone)}`
                    : ""}
                </div>
                {risk && (
                  <div className="connection-note">
                    <TrainFront size={15} />
                    <div>
                      <strong>
                        Ready by {timeLabel(risk.cutoff, scenario.timeZone)} to
                        catch {timeLabel(row.departure, scenario.timeZone)}
                      </strong>
                      <span>
                        {Math.round(row.wait)} min waiting / boarding ·{" "}
                        {Math.round(risk.miss * 100)}% of model runs miss this
                        cutoff
                        {risk.next
                          ? ` · next: ${timeLabel(risk.next, scenario.timeZone)}`
                          : " · no later departure listed"}
                      </span>
                    </div>
                  </div>
                )}
                {row.finishBy !== null && (
                  <div
                    className={`checkpoint-note ${trip.missedCutoffs.includes(row.step.id) ? "missed" : ""}`}
                  >
                    <Flag size={15} />
                    <div>
                      <strong>
                        Finish by {timeLabel(row.finishBy, scenario.timeZone)} ·{" "}
                        {localDate(row.finishBy, scenario.timeZone)}
                      </strong>
                      <span>
                        {trip.missedCutoffs.includes(row.step.id)
                          ? "Typical trip misses this cutoff"
                          : `Typical completion: ${timeLabel(row.completed, scenario.timeZone)}`}{" "}
                        ·{" "}
                        {Math.round(
                          (checkpoints.find((c) => c.id === row.step.id)
                            ?.miss ?? 0) * 100,
                        )}
                        % of model runs miss this cutoff
                      </span>
                    </div>
                  </div>
                )}
                {row.departure === Infinity && (
                  <div className="inline-error">
                    No listed departure remains after you reach this connection.
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <div
        className={`arrival-line ${trip.arrival > p.deadline || trip.missedCutoffs.length > 0 ? "late" : ""}`}
      >
        <Flag size={18} />
        <div>
          <strong>
            {Number.isFinite(trip.arrival)
              ? `${timeLabel(trip.arrival, scenario.timeZone)} · arrive`
              : "This connection is missed"}
          </strong>
          <span>
            {trip.missedCutoffs.length > 0
              ? "A step finish-by cutoff is missed, even if the final arrival fits. Try leaving earlier."
              : Number.isFinite(trip.arrival)
                ? trip.arrival <= p.arrival
                  ? `${Math.floor((p.arrival - trip.arrival) / 60000)} min before the hard deadline · ${scenario.finalBuffer} min reserved arrival buffer`
                  : `${Math.ceil((trip.arrival - p.arrival) / 60000)} min after the hard deadline`
                : "Try leaving earlier or adding a later departure."}
          </span>
        </div>
      </div>
    </section>
  );
}
