import { cloneElement, type ReactElement } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WeatherCharts from "./WeatherCharts";
import WeatherSummary from "./WeatherSummary";
import type { Forecast } from "./types";
import { formatForecastTime } from "./weatherFormat";

// jsdom has no layout; keep real Recharts rendering with deterministic dimensions.
vi.mock("recharts", async (importOriginal) => {
  const original = await importOriginal<typeof import("recharts")>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(
        children as ReactElement<{ width: number; height: number }>,
        { width: 500, height: 180 },
      ),
  };
});

const forecast: Forecast[] = [
  { time: "2026-10-21T22:00:00Z", temperature: 5, shortwave_radiation: 10 },
  { time: "2026-10-21T23:00:00Z", temperature: 0, shortwave_radiation: 0 },
  {
    time: "2026-10-22T00:00:00Z",
    temperature: null,
    shortwave_radiation: null,
  },
  { time: "2026-10-22T01:00:00Z", temperature: 2, shortwave_radiation: 0 },
  { time: "2026-10-22T02:00:00Z", temperature: 3, shortwave_radiation: 2 },
];

describe("forecast data presentation", () => {
  it("keeps missing samples as separate chart segments", () => {
    const { container } = render(
      <WeatherCharts forecast={forecast} timezone="Europe/Helsinki" />,
    );
    const temperature = container.querySelector(".recharts-line-curve")!;
    const solar = container.querySelector(".recharts-area-curve")!;
    expect(temperature.getAttribute("d")!.match(/M/g)).toHaveLength(2);
    expect(solar.getAttribute("d")!.match(/M/g)).toHaveLength(2);
  });

  it("shows a full local date and timezone in a keyboard-accessible tooltip", async () => {
    render(<WeatherCharts forecast={forecast} timezone="Pacific/Auckland" />);
    const chart = within(
      screen.getByRole("region", { name: "Temperature °C" }),
    ).getByRole("application");
    fireEvent.focus(chart);
    fireEvent.keyDown(chart, { key: "ArrowRight" });
    await waitFor(() =>
      expect(
        screen.getByText(/22 Oct 2026, 12:00 GMT\+13 · Pacific\/Auckland/),
      ).toBeVisible(),
    );
    fireEvent.keyDown(chart, { key: "ArrowRight" });
    await waitFor(() =>
      expect(
        screen.getByText(/22 Oct 2026, 13:00 GMT\+13 · Pacific\/Auckland/),
      ).toBeVisible(),
    );
    expect(screen.getByText("Unavailable")).toBeVisible();
    expect(formatForecastTime("2026-10-22T00:00:00Z", "Europe/Helsinki")).toBe(
      "22 Oct 2026, 03:00 GMT+3",
    );
  });

  it("uses finite values for summaries, including zero, and marks missing metrics unavailable", () => {
    const { rerender } = render(
      <WeatherSummary
        forecast={[
          ...forecast,
          {
            time: "2026-10-22T03:00:00Z",
            temperature: Infinity,
            shortwave_radiation: NaN,
          },
        ]}
      />,
    );
    expect(screen.getByText("0.0")).toBeVisible();
    expect(screen.getByText("5.0")).toBeVisible();
    expect(screen.getByText("10")).toBeVisible();
    expect(screen.getAllByText("Partial: 4/6 samples")).toHaveLength(3);
    rerender(
      <WeatherSummary
        forecast={[
          {
            time: "2026-10-22T00:00:00Z",
            temperature: null,
            shortwave_radiation: null,
          },
        ]}
      />,
    );
    expect(screen.getAllByText("Unavailable")).toHaveLength(3);
  });
});
