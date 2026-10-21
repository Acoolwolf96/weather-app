export function isAvailable(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

// The API returns absolute UTC instants. Always choose the location's timezone,
// and include its offset in full labels to distinguish repeated DST hours.
export function formatForecastTime(
  time: string,
  timezone: string,
  clockOnly = false,
) {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  };
  if (!clockOnly)
    Object.assign(options, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      timeZoneName: "shortOffset",
    });
  return new Intl.DateTimeFormat("en-GB", options).format(new Date(time));
}

export function formatIrradianceInterval(time: string, timezone: string) {
  const start = new Date(Date.parse(time) - 60 * 60 * 1000).toISOString();
  return `${formatForecastTime(start, timezone)} → ${formatForecastTime(time, timezone)} · ${timezone} · Preceding-hour mean`;
}
