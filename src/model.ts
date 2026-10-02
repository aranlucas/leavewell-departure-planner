export type StepKind = "walk" | "drive" | "transit" | "task";
export type Disambiguation = "reject" | "earlier" | "later";
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
  finalBuffer: number;
  activePlanId: string;
  plans: Plan[];
  assumption: string;
}
export interface ScenarioFile {
  format: "leavewell";
  version: 1;
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
  };
}
