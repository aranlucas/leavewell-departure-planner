import { Car, Footprints, ListChecks, TrainFront } from "lucide-react";

export const icons = {
  walk: Footprints,
  drive: Car,
  transit: TrainFront,
  task: ListChecks,
};

export const addLabels = { walk: "Walk", drive: "Drive", transit: "Transit", task: "Task" };

export const kindNames = {
  walk: "Walking",
  drive: "Driving",
  transit: "Scheduled transit",
  task: "Check-in / task",
};
