import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  CornerUpRight,
  Download,
  HardDrive,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  WifiOff,
} from "lucide-react";
import { airportDemo, appointmentDemo } from "./demo";
import { analyze } from "./engine";
import { newStep, uid } from "./model";
import type { Disambiguation, Plan, Scenario, StepKind } from "./model";
import { persistWorkspace, readWorkspace } from "./storage";
import { exportScenario, parseScenarioFile } from "./validation";
import { MINUTE, timeLabel } from "./time";
import { Field, NumberField } from "./components/Field";
import StepEditor from "./components/StepEditor";
import Timeline from "./components/Timeline";
import Result from "./components/Result";
import Dialog from "./components/Dialog";

export default function App() {
  const [initial] = useState(readWorkspace);
  const [scenario, setScenario] = useState(initial.draft);
  const [saved, setSaved] = useState(initial.saved);
  const [storageWarning, setStorageWarning] = useState(initial.warning);
  const [pauseSaving, setPauseSaving] = useState(!!initial.warning);
  const [persisted, setPersisted] = useState(true);
  const [library, setLibrary] = useState(false);
  const [reset, setReset] = useState(false);
  const [notice, setNotice] = useState("");
  const [offset, setOffset] = useState(0);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [offlineReady, setOfflineReady] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const analyses = useMemo(
    () => scenario.plans.map((p) => analyze(scenario, p)),
    [scenario],
  );
  const active = scenario.plans.find((p) => p.id === scenario.activePlanId)!;
  const analysis = analyses.find((p) => p.planId === active.id)!;
  const leave =
    analysis.recommendation === null
      ? null
      : analysis.recommendation + offset * MINUTE;

  useEffect(() => {
    if (pauseSaving) return;
    try {
      setPersisted(persistWorkspace(scenario, saved));
      setStorageWarning("");
    } catch {
      setStorageWarning(
        "Device storage is unavailable or full. Your changes are in memory. Export a scenario file, then retry saving.",
      );
      setPersisted(false);
    }
  }, [scenario, saved, pauseSaving]);
  useEffect(() => {
    const change = () => setOffline(!navigator.onLine);
    const cacheFailure = () =>
      setNotice(
        "Offline caching failed. Keep this tab open, or reload online to retry.",
      );
    window.addEventListener("online", change);
    window.addEventListener("offline", change);
    window.addEventListener("offline-cache-error", cacheFailure);
    if (import.meta.env.PROD && "serviceWorker" in navigator)
      navigator.serviceWorker.ready.then(() => setOfflineReady(true));
    return () => {
      window.removeEventListener("online", change);
      window.removeEventListener("offline", change);
      window.removeEventListener("offline-cache-error", cacheFailure);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 8000);
    return () => clearTimeout(timer);
  }, [notice]);
  const update = (patch: Partial<Scenario>) => {
    setScenario((s) => ({ ...s, ...patch }));
    setOffset(0);
  };
  const updatePlan = (plan: Plan) =>
    update({ plans: scenario.plans.map((p) => (p.id === plan.id ? plan : p)) });
  const load = (s: Scenario) => {
    setScenario(structuredClone(s));
    setOffset(0);
    setLibrary(false);
    setNotice(`Opened “${s.name}”.`);
  };
  const save = () => {
    try {
      exportScenario(scenario);
      if (analyses.some((a) => a.error))
        throw new Error(
          "Resolve the highlighted model inputs before saving a named scenario.",
        );
      if (saved.length >= 20 && !saved.some((s) => s.id === scenario.id))
        throw new Error(
          "You have 20 saved scenarios. Export or remove one before saving another.",
        );
      const next = [
        ...saved.filter((s) => s.id !== scenario.id),
        structuredClone(scenario),
      ];
      setSaved(next);
      try {
        persistWorkspace(scenario, next);
        setPauseSaving(false);
        setStorageWarning("");
        setNotice("Scenario saved on this device.");
      } catch {
        setStorageWarning(
          "Device saving failed. Your scenario is still in memory; export a file and retry.",
        );
      }
    } catch (error) {
      setNotice((error as Error).message);
    }
  };
  const download = () => {
    try {
      const raw = exportScenario(scenario);
      if (analyses.some((a) => a.error))
        throw new Error(
          "Resolve the model input errors before exporting a portable scenario.",
        );
      const url = URL.createObjectURL(
        new Blob([raw], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `leavewell-${
        scenario.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "scenario"
      }.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        "Portable scenario exported. It includes your inputs, not personal location data.",
      );
    } catch (error) {
      setNotice((error as Error).message);
    }
  };
  const duplicate = () => {
    const plan = {
      ...structuredClone(active),
      id: uid(),
      name: `${active.name} copy`.slice(0, 100),
      steps: active.steps.map((s) => ({ ...s, id: uid() })),
    };
    update({ plans: [...scenario.plans, plan], activePlanId: plan.id });
  };
  const move = (index: number, direction: number) => {
    const steps = [...active.steps];
    [steps[index], steps[index + direction]] = [
      steps[index + direction],
      steps[index],
    ];
    updatePlan({ ...active, steps });
  };
  return (
    <>
      <a className="skip-link" href="#planner">
        Skip to planner
      </a>
      <header className="app-header">
        <a href="#planner" className="brand" aria-label="Leavewell home">
          <span>
            <CornerUpRight size={22} />
          </span>
          leavewell<span className="brand-dot">.</span>
        </a>
        <nav aria-label="Workspace">
          <button className="text-button" onClick={() => setLibrary(true)}>
            <BookOpen size={17} />
            <span>Scenarios</span>
          </button>
          <button className="button export-button" onClick={download}>
            <Download size={16} />
            Export<span className="desktop-word"> scenario</span>
          </button>
        </nav>
      </header>
      <main id="planner" className="app-main">
        <div className="intro">
          <div>
            <h1>
              On time.
              <br />
              <span>With room to breathe.</span>
            </h1>
            <p>
              Start with when you need to arrive.
              <br />
              Work backward through everything in between.
            </p>
          </div>
          <div className="intro-sketch" aria-hidden="true">
            <div className="sketch-line" />
            <span className="sketch-origin" />
            <span className="sketch-turn" />
            <span className="sketch-end">
              <ArrowRight size={20} />
            </span>
            <span className="sketch-label">
              a little margin goes a long way
            </span>
          </div>
        </div>
        <div className="workspace-heading">
          <div className="scenario-title">
            <Field label="Scenario name">
              <input
                className="title-input"
                maxLength={100}
                value={scenario.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </Field>
            <span className="draft-status">
              <HardDrive size={13} />
              {pauseSaving
                ? "Device saving paused"
                : persisted
                  ? "Draft saved on this device"
                  : "Complete fields to save draft"}
            </span>
          </div>
          <button className="button save-button" onClick={save}>
            <Save size={16} />
            Save scenario
          </button>
        </div>
        {storageWarning && (
          <div className="warning-banner" role="alert">
            <div>{storageWarning}</div>
            <button
              className="button"
              onClick={() => {
                setPauseSaving(false);
                try {
                  setPersisted(persistWorkspace(scenario, saved));
                  setStorageWarning("");
                } catch {
                  setNotice(
                    "Device saving is still unavailable. Export a file for now.",
                  );
                }
              }}
            >
              Retry device saving
            </button>
          </div>
        )}
        <section
          className="arrival-settings"
          aria-label="Arrival and model settings"
        >
          <div className="arrival-fields">
            <Field label="Hard arrival deadline">
              <input
                type="datetime-local"
                value={scenario.arrivalLocal}
                onChange={(e) => update({ arrivalLocal: e.target.value })}
              />
            </Field>
            <Field label="Time zone">
              <input
                list="zones"
                maxLength={100}
                value={scenario.timeZone}
                onChange={(e) => update({ timeZone: e.target.value })}
              />
              <datalist id="zones">
                {[
                  "America/Los_Angeles",
                  "America/New_York",
                  "America/Chicago",
                  "America/Denver",
                  "Europe/London",
                  "Europe/Paris",
                  "Asia/Tokyo",
                  "Australia/Sydney",
                  "UTC",
                ].map((z) => (
                  <option key={z} value={z} />
                ))}
              </datalist>
            </Field>
          </div>
          <div className="confidence-control">
            <label htmlFor="confidence">
              Model coverage target{" "}
              <strong>{Math.round(scenario.confidence * 100)}%</strong>
            </label>
            <input
              id="confidence"
              type="range"
              min={50}
              max={100}
              step={1}
              value={Math.round(scenario.confidence * 100)}
              onChange={(e) =>
                update({ confidence: Number(e.target.value) / 100 })
              }
            />
            <div className="range-endpoints">
              <span>50% · less margin</span>
              <span>100% · all sampled runs</span>
            </div>
          </div>
          <NumberField
            label="Arrival buffer"
            max={240}
            value={scenario.finalBuffer}
            onChange={(finalBuffer) => update({ finalBuffer })}
          />
        </section>
        <details className="time-settings">
          <summary>Time settings & assumptions</summary>
          <div className="advanced-settings">
            <div className="two-fields">
              <Field
                label="Earliest allowed departure"
                hint="Optional constraint. Include a date for overnight trips."
              >
                <input
                  type="datetime-local"
                  value={scenario.earliestLocal}
                  onChange={(e) => update({ earliestLocal: e.target.value })}
                />
              </Field>
              <Field
                label="Repeated clock times (DST)"
                hint="Spring-forward times that do not exist are always rejected."
              >
                <select
                  value={scenario.disambiguation}
                  onChange={(e) =>
                    update({ disambiguation: e.target.value as Disambiguation })
                  }
                >
                  <option value="reject">Require an explicit choice</option>
                  <option value="earlier">First occurrence (earlier)</option>
                  <option value="later">Second occurrence (later)</option>
                </select>
              </Field>
            </div>
            <div className="confidence-control linked-control">
              <label htmlFor="linked-delays">
                Linked-delay stress test{" "}
                <strong>
                  {Math.round((scenario.linkedDelays ?? 0) * 100)}%
                </strong>
              </label>
              <input
                id="linked-delays"
                type="range"
                min={0}
                max={100}
                step={10}
                value={Math.round((scenario.linkedDelays ?? 0) * 100)}
                onChange={(e) =>
                  update({ linkedDelays: Number(e.target.value) / 100 })
                }
              />
              <div className="range-endpoints">
                <span>0% · independent</span>
                <span>100% · move together</span>
              </div>
              <p className="field-note">
                In this fraction of runs, all steps share the same duration
                percentile. Other runs stay independent. Each step keeps its
                original range and triangular distribution. This stress test is
                an assumption, not a measured correlation.
              </p>
            </div>
            <Field
              label="Your assumptions"
              hint="Tell future you what the model includes, and what it leaves out."
            >
              <textarea
                rows={3}
                maxLength={2000}
                value={scenario.assumption}
                onChange={(e) => update({ assumption: e.target.value })}
              />
            </Field>
          </div>
        </details>
        <div className="planner-layout">
          <div className="journey-column">
            <section className="plans-section" aria-label="Alternative plans">
              <div className="section-heading">
                <h2>Choose your route</h2>
                <button
                  className="text-button"
                  disabled={scenario.plans.length >= 5}
                  onClick={duplicate}
                >
                  <Plus size={15} />
                  Add alternative
                </button>
              </div>
              <div className="plan-options">
                {scenario.plans.map((p, i) => (
                  <button
                    key={p.id}
                    className={`plan-option ${active.id === p.id ? "selected" : ""}`}
                    aria-pressed={active.id === p.id}
                    onClick={() => update({ activePlanId: p.id })}
                  >
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        {p.steps.length} steps
                        {analyses[i].status === "constraint"
                          ? " · constraint conflict"
                          : analyses[i].status === "impossible"
                            ? " · impossible"
                            : analyses[i].status === "invalid"
                              ? " · check inputs"
                              : ""}
                      </small>
                    </span>
                    <span className="plan-time">
                      {timeLabel(analyses[i].recommendation, scenario.timeZone)}
                      {active.id === p.id && <Check size={15} />}
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <section className="journey-editor" aria-labelledby="journey-title">
              <div className="section-heading">
                <div>
                  <h2 id="journey-title">Everything between here & there</h2>
                  <p>
                    Tap a step to edit durations, buffers, departures, or
                    finish-by cutoffs.
                  </p>
                </div>
              </div>
              <div className="plan-name-row">
                <Field label="Plan name">
                  <input
                    maxLength={100}
                    value={active.name}
                    onChange={(e) =>
                      updatePlan({ ...active, name: e.target.value })
                    }
                  />
                </Field>
                {scenario.plans.length > 1 && (
                  <button
                    className="icon-button danger"
                    aria-label="Remove selected plan"
                    onClick={() =>
                      update({
                        plans: scenario.plans.filter((p) => p.id !== active.id),
                        activePlanId: scenario.plans.find(
                          (p) => p.id !== active.id,
                        )!.id,
                      })
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>
              <div className="steps-list">
                {active.steps.map((step, i) => (
                  <StepEditor
                    key={step.id}
                    step={step}
                    index={i}
                    total={active.steps.length}
                    onChange={(changed) =>
                      updatePlan({
                        ...active,
                        steps: active.steps.map((s) =>
                          s.id === changed.id ? changed : s,
                        ),
                      })
                    }
                    onMove={(d) => move(i, d)}
                    onDelete={() =>
                      updatePlan({
                        ...active,
                        steps: active.steps.filter((s) => s.id !== step.id),
                      })
                    }
                  />
                ))}
              </div>
              <div className="add-step-row">
                <span>Add a step</span>
                {(["walk", "drive", "transit", "task"] as StepKind[]).map(
                  (k) => (
                    <button
                      key={k}
                      className="button small-button"
                      disabled={active.steps.length >= 20}
                      onClick={() =>
                        updatePlan({
                          ...active,
                          steps: [...active.steps, newStep(k)],
                        })
                      }
                    >
                      <Plus size={13} />
                      {k === "task"
                        ? "Task"
                        : k === "transit"
                          ? "Transit"
                          : k === "drive"
                            ? "Drive"
                            : "Walk"}
                    </button>
                  ),
                )}
              </div>
            </section>
            <Timeline analysis={analysis} scenario={scenario} leave={leave} />
            <section className="method-note">
              <h2>A deadline is a chain, not a single trip.</h2>
              <p>
                Every step can use up your margin. Leavewell works backward from
                your hard deadline, subtracts buffers, and checks each listed
                connection. Adjust an assumption and watch the departure move.
              </p>
              <details>
                <summary>See the method & limits</summary>
                <p>
                  The same seeded 4,096 triangular draws are used on every
                  calculation. The recommendation is a lower-tail quantile of
                  the latest feasible departure: at least your chosen percentage
                  of sample runs still work when leaving at that minute. A
                  forward simulation verifies the timeline. Earlier trains are
                  allowed; only entered departures exist. Sensitivity freezes
                  one duration at its mode with the other samples unchanged.
                </p>
                <p>
                  Finite samples have error and inputs are assumptions. Linked
                  durations are a stress test, not a calibrated disruption
                  forecast. Enter any actual check-in close time as a step
                  finish-by cutoff. All steps share one time zone; elapsed
                  travel remains correct across midnight and DST. No live
                  transit, flight, traffic, security, or booking information is
                  supplied.
                </p>
                <p>
                  <a
                    href="https://tc39.es/proposal-temporal/docs/timezone.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Temporal: time zones & ambiguity
                  </a>{" "}
                  ·{" "}
                  <a
                    href="https://www.bipm.org/en/committees/jc/jcgm/publications"
                    target="_blank"
                    rel="noreferrer"
                  >
                    JCGM: propagation of distributions
                  </a>
                </p>
              </details>
            </section>
          </div>
          <Result
            analysis={analysis}
            scenario={scenario}
            offset={offset}
            setOffset={setOffset}
          />
        </div>
        <footer className="app-footer">
          <span>
            {offline ? (
              <>
                <WifiOff size={14} />
                Offline · all calculations stay on this device
              </>
            ) : (
              <>
                <HardDrive size={14} />
                {offlineReady
                  ? "Available offline · inputs stay on this device"
                  : import.meta.env.DEV
                    ? "Local development · offline cache enabled in production"
                    : "Preparing offline cache · inputs stay on this device"}
              </>
            )}
          </span>
          <button className="text-button" onClick={() => setReset(true)}>
            <RotateCcw size={14} />
            Reset draft to demo
          </button>
        </footer>
      </main>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        aria-label="Import scenario file"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            if (file.size > 500000)
              throw new Error("Choose a scenario file under 500 KB.");
            const imported = parseScenarioFile(await file.text());
            load({ ...imported, id: uid() });
            setNotice(
              "Scenario imported. Save it to keep a named copy on this device.",
            );
          } catch (error) {
            setNotice((error as Error).message);
          } finally {
            e.target.value = "";
          }
        }}
      />
      {library && (
        <Dialog title="Your scenarios" onClose={() => setLibrary(false)}>
          <p className="dialog-description">
            Saved here, on this device. Export a file to take a scenario with
            you.
          </p>
          <button
            className="button import-button"
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={16} />
            Import scenario file
          </button>
          <div className="library-section">
            <h3>Start from a demo</h3>
            <button
              className="library-row"
              onClick={() => load({ ...airportDemo(), id: uid() })}
            >
              <span>
                <strong>Morning at the airport</strong>
                <small>Synthetic Seattle-airport style · rail or drive</small>
              </span>
              <ArrowRight size={18} />
            </button>
            <button
              className="library-row"
              onClick={() => load({ ...appointmentDemo(), id: uid() })}
            >
              <span>
                <strong>Across town, on time</strong>
                <small>Synthetic appointment · walk or drive</small>
              </span>
              <ArrowRight size={18} />
            </button>
          </div>
          <div className="library-section">
            <h3>
              Saved scenarios <span>{saved.length} / 20</span>
            </h3>
            {saved.length === 0 ? (
              <p className="empty-state">
                Your first saved scenario will appear here. Edit the demo, then
                select Save scenario.
              </p>
            ) : (
              saved.map((s) => (
                <div key={s.id} className="saved-row">
                  <button className="library-row" onClick={() => load(s)}>
                    <span>
                      <strong>{s.name}</strong>
                      <small>
                        {s.arrivalLocal.replace("T", " · ")} · {s.plans.length}{" "}
                        plans
                      </small>
                    </span>
                    <ArrowRight size={18} />
                  </button>
                  <button
                    className="icon-button danger"
                    aria-label={`Delete saved ${s.name}`}
                    onClick={() => {
                      setSaved(saved.filter((x) => x.id !== s.id));
                      setNotice(
                        "Saved copy removed. The current draft is unchanged.",
                      );
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </Dialog>
      )}
      {reset && (
        <Dialog
          title="Reset the current draft?"
          onClose={() => setReset(false)}
        >
          <p className="dialog-description">
            This replaces the draft with the airport demo. Your named saved
            scenarios stay available. Export first if you need a copy of unsaved
            changes.
          </p>
          <div className="dialog-actions">
            <button className="button" onClick={() => setReset(false)}>
              Keep editing
            </button>
            <button
              className="button primary"
              onClick={() => {
                load(airportDemo());
                setReset(false);
                setPauseSaving(false);
              }}
            >
              Reset draft
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
