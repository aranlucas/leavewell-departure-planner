import type { Scenario, Step } from "./model";

const step = (
  id: string,
  label: string,
  kind: Step["kind"],
  min: number,
  mode: number,
  max: number,
  buffer = 0,
): Step => ({
  id,
  label,
  kind,
  min,
  mode,
  max,
  buffer,
  boardingBuffer: 2,
  departures: "",
  finishByLocal: "",
});

export function airportDemo(): Scenario {
  const train = step("rail", "Train to the airport", "transit", 36, 38, 44);
  train.departures = ["05:42", "05:57", "06:12", "06:27", "06:42", "06:57", "07:12"]
    .map((t) => `2026-10-03T${t}`)
    .join("\n");

  const common = [
    step("checkin", "Bag drop & check-in", "task", 5, 10, 20, 3),
    step("security", "Security queue", "task", 10, 20, 50),
    step("gate", "Walk to the gate", "walk", 8, 12, 18),
  ];

  return {
    id: "demo-airport",
    name: "Morning at the airport",
    arrivalLocal: "2026-10-03T08:30",
    timeZone: "America/Los_Angeles",
    disambiguation: "reject",
    earliestLocal: "2026-10-03T05:00",
    confidence: 0.9,
    linkedDelays: 0,
    finalBuffer: 10,
    activePlanId: "rail-plan",
    assumption:
      "Seattle-airport style demo. All durations and train departures are invented. 08:30 is a hard gate-arrival deadline, not a flight departure. Replace every assumption before using this for a real trip.",
    plans: [
      {
        id: "rail-plan",
        name: "Walk + rail",
        steps: [
          step("walk-station", "Walk to the station", "walk", 8, 12, 18, 1),
          train,
          step("terminal", "Walk to the terminal", "walk", 6, 9, 14),
          ...common,
        ],
      },
      {
        id: "drive-plan",
        name: "Drive + park",
        steps: [
          step("drive", "Drive to the airport", "drive", 25, 40, 70, 5),
          step("parking", "Park & reach the terminal", "walk", 10, 15, 25),
          ...structuredClone(common),
        ],
      },
    ],
  };
}

export function appointmentDemo(): Scenario {
  return {
    id: "demo-appointment",
    name: "Across town, on time",
    arrivalLocal: "2026-10-03T14:00",
    timeZone: "America/New_York",
    disambiguation: "reject",
    earliestLocal: "",
    confidence: 0.9,
    linkedDelays: 0,
    finalBuffer: 5,
    activePlanId: "appointment-walk",
    assumption:
      "Synthetic appointment example. Independent triangular durations are rough assumptions, not measured forecasts.",
    plans: [
      {
        id: "appointment-walk",
        name: "Walk there",
        steps: [
          step("prepare", "Get ready", "task", 5, 8, 15),
          step("cross-town", "Walk across town", "walk", 20, 25, 35),
          step("desk", "Check in at the desk", "task", 3, 5, 10),
        ],
      },
      {
        id: "appointment-drive",
        name: "Drive there",
        steps: [
          step("prepare", "Get ready", "task", 5, 8, 15),
          step("car", "Drive across town", "drive", 8, 12, 25),
          step("park", "Find parking & walk", "walk", 5, 10, 20),
          step("desk", "Check in at the desk", "task", 3, 5, 10),
        ],
      },
    ],
  };
}
