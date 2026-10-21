import { describe, expect, it } from "vitest";
import { formatForecastTime, formatIrradianceInterval } from "./weatherFormat";

describe("absolute timestamps in the forecast timezone", () => {
  it("crosses the local date boundary without using the browser timezone", () => {
    expect(formatForecastTime("2026-10-21T23:00:00Z", "Europe/Helsinki")).toBe(
      "22 Oct 2026, 02:00 GMT+3",
    );
    expect(formatForecastTime("2026-10-21T23:00:00Z", "America/New_York")).toBe(
      "21 Oct 2026, 19:00 GMT-4",
    );
  });

  it("distinguishes repeated local hours across the autumn DST transition", () => {
    expect(formatForecastTime("2026-10-25T00:00:00Z", "Europe/Helsinki")).toBe(
      "25 Oct 2026, 03:00 GMT+3",
    );
    expect(formatForecastTime("2026-10-25T01:00:00Z", "Europe/Helsinki")).toBe(
      "25 Oct 2026, 03:00 GMT+2",
    );
  });

  it("derives the solar averaging interval in absolute time across DST", () => {
    expect(
      formatIrradianceInterval("2026-10-25T01:00:00Z", "Europe/Helsinki"),
    ).toBe(
      "25 Oct 2026, 03:00 GMT+3 → 25 Oct 2026, 03:00 GMT+2 · Europe/Helsinki · Preceding-hour mean",
    );
  });
});
