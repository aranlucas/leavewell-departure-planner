import { Temporal } from "@js-temporal/polyfill";
import type { Disambiguation } from "./model";

export const MINUTE = 60_000;

/** Civil time is resolved once; all travel durations are elapsed milliseconds. */
export function parseTime(
  value: string,
  zone: string,
  disambiguation: Disambiguation = "reject",
): number {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})?$/.test(
      value,
    )
  ) {
    throw new Error("Use a full date and time, such as 2026-10-03T06:12.");
  }

  // Validate the zone even for exact-time input.
  try {
    Temporal.Instant.fromEpochMilliseconds(0).toZonedDateTimeISO(zone);
  } catch {
    throw new Error(`“${zone}” is not a valid IANA time zone.`);
  }

  if (/(Z|[+-]\d{2}:\d{2})$/.test(value)) {
    try {
      return Temporal.Instant.from(value).epochMilliseconds;
    } catch {
      throw new Error(`Invalid date or time: ${value}.`);
    }
  }

  let civil: Temporal.PlainDateTime;

  try {
    civil = Temporal.PlainDateTime.from(value, { overflow: "reject" });
  } catch {
    throw new Error(`Invalid date or time: ${value}.`);
  }

  const first = civil.toZonedDateTime(zone, { disambiguation: "earlier" });
  const second = civil.toZonedDateTime(zone, { disambiguation: "later" });

  if (
    !first.toPlainDateTime().equals(civil) ||
    !second.toPlainDateTime().equals(civil)
  ) {
    throw new Error(
      `${value} does not exist in ${zone} because the clock jumps forward. Choose an existing time.`,
    );
  }

  if (
    first.epochMilliseconds !== second.epochMilliseconds &&
    disambiguation === "reject"
  ) {
    throw new Error(
      `${value} occurs twice in ${zone}. Choose the first or second occurrence under Time settings, or add an explicit UTC offset to schedule entries.`,
    );
  }

  return (disambiguation === "later" ? second : first).epochMilliseconds;
}

export function timeLabel(
  epoch: number | null,
  zone: string,
  date = false,
): string {
  if (epoch === null || !Number.isFinite(epoch)) {return "—";}

  const options: Intl.DateTimeFormatOptions = {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
  };

  if (date) {
    options.month = "short";
    options.day = "numeric";
    options.timeZoneName = "short";
  }

  return new Intl.DateTimeFormat("en-US", options).format(new Date(epoch));
}

export function offsetLabel(epoch: number, zone: string): string {
  return Temporal.Instant.fromEpochMilliseconds(
    Math.floor(epoch),
  ).toZonedDateTimeISO(zone).offset;
}

export function localDate(epoch: number, zone: string): string {
  return Temporal.Instant.fromEpochMilliseconds(Math.floor(epoch))
    .toZonedDateTimeISO(zone)
    .toPlainDate()
    .toString();
}
