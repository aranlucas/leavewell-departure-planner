import {
  ArrowDown,
  ArrowUp,
  Car,
  ChevronDown,
  Footprints,
  ListChecks,
  TrainFront,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type { Step, StepKind } from "../model";
import { Field, NumberField } from "./Field";
export const icons = {
  walk: Footprints,
  drive: Car,
  transit: TrainFront,
  task: ListChecks,
};
export const kindNames = {
  walk: "Walking",
  drive: "Driving",
  transit: "Scheduled transit",
  task: "Check-in / task",
};
export default function StepEditor({
  step,
  index,
  total,
  onChange,
  onMove,
  onDelete,
}: {
  step: Step;
  index: number;
  total: number;
  onChange: (s: Step) => void;
  onMove: (d: number) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const Icon = icons[step.kind];
  const update = (patch: Partial<Step>) => onChange({ ...step, ...patch });
  return (
    <div className={`step-editor ${open ? "expanded" : ""}`}>
      <button
        className="step-toggle"
        aria-expanded={open}
        aria-controls={`editor-${step.id}`}
        onClick={() => setOpen(!open)}
      >
        <span className={`step-icon ${step.kind}`}>
          <Icon size={19} />
        </span>
        <span className="step-description">
          <strong>{step.label || "Unnamed step"}</strong>
          <span>
            {kindNames[step.kind]}
            {step.buffer > 0 ? ` · +${step.buffer} min buffer` : ""}
            {step.finishByLocal ? " · finish-by cutoff" : ""}
          </span>
        </span>
        <span className="step-range">
          <strong>
            {Number.isFinite(step.mode) ? step.mode : "—"}
            <small> min</small>
          </strong>
          <span>
            {step.min}–{step.max} range
          </span>
        </span>
        <ChevronDown size={17} className={open ? "rotate" : ""} />
      </button>
      {open && (
        <div id={`editor-${step.id}`} className="step-body">
          <div className="two-fields">
            <Field label="Step name">
              <input
                maxLength={100}
                value={step.label}
                onChange={(e) => update({ label: e.target.value })}
              />
            </Field>
            <Field label="Step type">
              <select
                value={step.kind}
                onChange={(e) => update({ kind: e.target.value as StepKind })}
              >
                {Object.entries(kindNames).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="three-fields">
            <NumberField
              label="Fastest"
              value={step.min}
              onChange={(min) => update({ min })}
            />
            <NumberField
              label="Typical"
              value={step.mode}
              onChange={(mode) => update({ mode })}
            />
            <NumberField
              label="Slowest"
              value={step.max}
              onChange={(max) => update({ max })}
            />
          </div>
          <p className="field-note">
            Typical is the most likely duration. Fastest ≤ typical ≤ slowest;
            the model samples between these bounds.
          </p>
          <div className="two-fields">
            <NumberField
              label="Buffer after this step"
              max={240}
              value={step.buffer}
              onChange={(buffer) => update({ buffer })}
            />
            {step.kind === "transit" && (
              <NumberField
                label="Boarding margin before departure"
                max={120}
                value={step.boardingBuffer}
                onChange={(boardingBuffer) => update({ boardingBuffer })}
              />
            )}
          </div>
          <Field
            label="Finish this step by"
            hint="Optional dated cutoff in the scenario time zone. Completion must meet this time; the post-step buffer comes afterward. Leave blank for no cutoff."
          >
            <input
              type="text"
              inputMode="text"
              maxLength={40}
              placeholder="2026-10-03T07:15"
              value={step.finishByLocal ?? ""}
              onChange={(e) => update({ finishByLocal: e.target.value })}
            />
          </Field>
          {step.kind === "transit" && (
            <Field
              label="Scheduled departures"
              hint="One full date + time per line, in the scenario time zone. Add an offset (−07:00 or −08:00) to distinguish repeated times. Only these departures exist in the model."
            >
              <textarea
                className="schedule-input"
                rows={5}
                maxLength={20000}
                spellCheck={false}
                value={step.departures}
                onChange={(e) => update({ departures: e.target.value })}
              />
            </Field>
          )}
          <div className="step-actions">
            <span>
              Step {index + 1} of {total}
            </span>
            <button
              className="icon-button"
              aria-label={`Move ${step.label} up`}
              disabled={index === 0}
              onClick={() => onMove(-1)}
            >
              <ArrowUp size={17} />
            </button>
            <button
              className="icon-button"
              aria-label={`Move ${step.label} down`}
              disabled={index === total - 1}
              onClick={() => onMove(1)}
            >
              <ArrowDown size={17} />
            </button>
            <button
              className="text-button danger"
              disabled={total === 1}
              onClick={onDelete}
            >
              <Trash2 size={15} />
              Remove step
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
