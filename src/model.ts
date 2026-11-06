export const STEP_KINDS = ["walk", "drive", "transit", "task"] as const;

export type StepKind = (typeof STEP_KINDS)[number];

export const DISAMBIGUATIONS = ["reject", "earlier", "later"] as const;

export type Disambiguation = (typeof DISAMBIGUATIONS)[number];

export const LIMITS = {
  name: 100,
  date: 40,
  assumption: 2000,
  duration: 1440,
  buffer: 240,
  boardingBuffer: 120,
  departuresText: 20_000,
  departures: 200,
  steps: 20,
  plans: 5,
  saved: 20,
  fileSize: 500_000,
} as const;

export interface Step {
  id: string;
  label: string;
  kind: StepKind;
  min: number;
  mode: number;
  max: number;
  buffer: number;
  boardingBuffer: number;
  departures: string;
  /** Optional completion cutoff, before this step’s post-step buffer. */
  finishByLocal?: string;
}

export interface Plan {
  id: string;
  name: string;
  steps: Step[];
}

export interface Scenario {
  id: string;
  name: string;
  arrivalLocal: string;
  timeZone: string;
  disambiguation: Disambiguation;
  earliestLocal: string;
  confidence: number;
  /** Fraction of draws sharing a duration percentile; 0 preserves independent runs. */
  linkedDelays?: number;
  finalBuffer: number;
  activePlanId: string;
  plans: Plan[];
  assumption: string;
}

export interface ScenarioFile {
  format: "leavewell";
  version: 1 | 2;
  scenario: Scenario;
}

export const uid = () => crypto.randomUUID();

export function newStep(kind: StepKind = "task"): Step {
  return {
    id: uid(),
    label: kind === "transit" ? "Scheduled connection" : "New step",
    kind,
    min: 5,
    mode: 10,
    max: 20,
    buffer: 0,
    boardingBuffer: 2,
    departures: "",
    finishByLocal: "",
  };
}

export function isStepKind(value: string): value is StepKind {
  return STEP_KINDS.some((kind) => kind === value);
}

export function isDisambiguation(value: string): value is Disambiguation {
  return DISAMBIGUATIONS.some((choice) => choice === value);
}

export function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
