export function isAvailable(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

// These timestamps already represent the forecast location's wall clock.
// Parsing them as Dates would incorrectly apply the browser's timezone.
export function formatForecastTime(time: string) {
  return time.replace("T", " ").slice(0, 16);
}
