import { StrictMode } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { City, Forecast, WeatherData } from "./types";

// Request tests exercise real cards and summaries; chart rendering is tested separately.
vi.mock("./WeatherCharts", () => ({
  default: ({ forecast }: { forecast: Forecast[] }) => (
    <div data-testid="forecast">{JSON.stringify(forecast)}</div>
  ),
}));

const cities: City[] = [
  {
    id: 1,
    name: "Helsinki",
    admin1: "Uusimaa",
    country: "Finland",
    latitude: 60.17,
    longitude: 24.94,
  },
  {
    id: 2,
    name: "Oulu",
    admin1: "North Ostrobothnia",
    country: "Finland",
    latitude: 65.01,
    longitude: 25.47,
  },
  {
    id: 3,
    name: "Turku",
    country: "Finland",
    latitude: 60.45,
    longitude: 22.27,
  },
  {
    id: 4,
    name: "Tampere",
    country: "Finland",
    latitude: 61.5,
    longitude: 23.76,
  },
  {
    id: 5,
    name: "Vaasa",
    country: "Finland",
    latitude: 63.09,
    longitude: 21.62,
  },
];

type Pending = {
  url: string;
  signal: AbortSignal;
  resolve: (data: unknown, ok?: boolean) => void;
  reject: (error: Error) => void;
};
let requests: Pending[];
let fetchMock: ReturnType<typeof vi.fn>;

function weather(
  value: number | null,
  radiation: number | null = 0,
): WeatherData {
  return {
    latitude: 60,
    longitude: 24,
    timezone: "Europe/Helsinki",
    forecast: [
      {
        time: "2026-10-21T23:00",
        temperature: value,
        shortwave_radiation: radiation,
      },
      {
        time: "2026-10-22T00:00",
        temperature: value,
        shortwave_radiation: radiation,
      },
    ],
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  requests = [];
  // Deliberately ignore aborts: late transports must still be harmless.
  fetchMock = vi.fn(
    (url: string, options: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        requests.push({
          url,
          signal: options.signal as AbortSignal,
          resolve: (data, ok = true) =>
            resolve({ ok, json: async () => data } as Response),
          reject,
        });
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function search(name: string, results = cities) {
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: name } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(350);
  });
  await act(async () => {
    requests.at(-1)!.resolve(results);
  });
}

async function add(city: City) {
  await search(city.name, [city]);
  fireEvent.click(
    screen.getByRole("button", { name: new RegExp(`^${city.name},`) }),
  );
  return requests.at(-1)!;
}

function card(name: string) {
  return within(screen.getByRole("article", { name }));
}
function weatherRequests() {
  return requests.filter((request) => request.url.startsWith("/api/weather"));
}

describe("independent location forecasts", () => {
  it("renders Helsinki and Oulu independently when responses arrive in reverse order", async () => {
    render(<App />);
    const helsinki = await add(cities[0]);
    const oulu = await add(cities[1]);
    expect(helsinki.url).toContain("latitude=60.17&longitude=24.94");
    expect(oulu.url).toContain("latitude=65.01&longitude=25.47");
    await act(async () => {
      oulu.resolve(weather(-3));
    });
    expect(card("Oulu").getAllByText("-3.0")).toHaveLength(2);
    expect(card("Helsinki").getByText("Loading forecast…")).toBeVisible();
    await act(async () => {
      helsinki.resolve(weather(12));
    });
    expect(card("Helsinki").getAllByText("12.0")).toHaveLength(2);
    expect(card("Oulu").getAllByText("-3.0")).toHaveLength(2);
    expect(
      card("Helsinki").getByText("Forecast timezone: Europe/Helsinki"),
    ).toBeVisible();
    expect(screen.getByText("2 of 4 locations")).toBeVisible();
  });

  it("isolates initial failures and retries without refetching a successful card", async () => {
    render(<App />);
    const helsinki = await add(cities[0]);
    const oulu = await add(cities[1]);
    await act(async () => {
      helsinki.resolve(weather(12));
      oulu.resolve({}, false);
    });
    expect(card("Oulu").getByRole("alert")).toHaveTextContent("Unable to load");
    expect(
      card("Helsinki").getByRole("button", { name: "Refresh Helsinki" }),
    ).toBeEnabled();
    fireEvent.click(card("Oulu").getByRole("button", { name: "Retry Oulu" }));
    expect(weatherRequests()).toHaveLength(3);
    expect(card("Helsinki").getAllByText("12.0")).toHaveLength(2);
    await act(async () => {
      requests.at(-1)!.resolve(weather(2));
    });
    expect(card("Oulu").queryByRole("alert")).not.toBeInTheDocument();
  });

  it("retains data during refresh and a failed refresh, then permits retry", async () => {
    render(<App />);
    const helsinki = await add(cities[0]);
    const oulu = await add(cities[1]);
    await act(async () => {
      helsinki.resolve(weather(12));
      oulu.resolve(weather(2));
    });
    const refresh = card("Helsinki").getByRole("button", {
      name: "Refresh Helsinki",
    });
    fireEvent.click(refresh);
    fireEvent.click(refresh);
    expect(refresh).toBeDisabled();
    expect(weatherRequests()).toHaveLength(3);
    expect(card("Helsinki").getAllByText("12.0")).toHaveLength(2);
    expect(card("Oulu").getAllByText("2.0")).toHaveLength(2);
    await act(async () => {
      requests.at(-1)!.reject(new Error("offline"));
    });
    expect(card("Helsinki").getByRole("alert")).toHaveTextContent(
      "Refresh failed",
    );
    expect(card("Helsinki").getAllByText("12.0")).toHaveLength(2);
    fireEvent.click(
      card("Helsinki").getByRole("button", { name: "Retry Helsinki" }),
    );
    await act(async () => {
      requests.at(-1)!.resolve(weather(15));
    });
    expect(card("Helsinki").getAllByText("15.0")).toHaveLength(2);
    expect(card("Oulu").getAllByText("2.0")).toHaveLength(2);
    expect(weatherRequests().filter((r) => r.url === oulu.url)).toHaveLength(1);
  });

  it.each(["success", "failure"])(
    "ignores a removed card's late %s and finalization after re-adding",
    async (outcome) => {
      render(<App />);
      const old = await add(cities[0]);
      fireEvent.click(screen.getByRole("button", { name: "Remove Helsinki" }));
      expect(old.signal.aborted).toBe(true);
      const replacement = await add(cities[0]);
      await act(async () => {
        if (outcome === "success") old.resolve(weather(99));
        else old.reject(new Error("late failure"));
      });
      expect(
        card("Helsinki").getByRole("button", { name: "Refresh Helsinki" }),
      ).toBeDisabled();
      expect(card("Helsinki").queryByRole("alert")).not.toBeInTheDocument();
      expect(card("Helsinki").queryByText("99.0")).not.toBeInTheDocument();
      await act(async () => {
        replacement.resolve(weather(8));
      });
      expect(card("Helsinki").getAllByText("8.0")).toHaveLength(2);
    },
  );

  it("marks duplicates Added, disables them, and makes no duplicate request", async () => {
    render(<App />);
    await search("Helsinki", [cities[0]]);
    const result = screen.getByRole("button", { name: /^Helsinki,/ });
    act(() => {
      result.click();
      result.click();
    });
    await search("Helsinki", [cities[0]]);
    const added = screen.getByRole("button", {
      name: /Helsinki, Uusimaa, Finland Added/,
    });
    expect(added).toBeDisabled();
    fireEvent.click(added);
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(weatherRequests()).toHaveLength(1);
  });

  it("rejects a fifth location and immediately makes room on removal", async () => {
    render(<App />);
    for (const city of cities.slice(0, 4)) await add(city);
    expect(screen.getByText("4 of 4 locations")).toBeVisible();
    expect(screen.getByText("Remove a location to add another.")).toBeVisible();
    await search("Vaasa", [cities[4]]);
    const fifth = screen.getByRole("button", { name: /^Vaasa,/ });
    expect(fifth).toBeDisabled();
    fireEvent.click(fifth);
    expect(weatherRequests()).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Remove Oulu" }));
    expect(fifth).toBeEnabled();
    fireEvent.click(fifth);
    expect(screen.getAllByRole("article")).toHaveLength(4);
    expect(screen.getByRole("article", { name: "Vaasa" })).toBeVisible();
    expect(weatherRequests()).toHaveLength(5);
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(
      screen.queryByRole("list", { name: "Matching locations" }),
    ).not.toBeInTheDocument();
  });

  it("preserves nulls and valid zero irradiance, and handles an empty forecast", async () => {
    render(<App />);
    const request = await add(cities[0]);
    await act(async () => {
      request.resolve(weather(null, 0));
    });
    expect(card("Helsinki").getAllByText("Unavailable")).toHaveLength(2);
    expect(card("Helsinki").getByText("0")).toBeVisible();
    expect(card("Helsinki").getByTestId("forecast")).toHaveTextContent(
      '"temperature":null',
    );
    fireEvent.click(screen.getByRole("button", { name: "Refresh Helsinki" }));
    await act(async () => {
      requests.at(-1)!.resolve({ ...weather(0), forecast: [] });
    });
    expect(card("Helsinki").getAllByText("Unavailable")).toHaveLength(3);
    expect(card("Helsinki").getByText(/No hourly forecast/)).toBeVisible();
  });

  it("cancels obsolete StrictMode requests without clearing the current loading state", async () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    await add(cities[0]);
    const [obsolete, current] = weatherRequests();
    expect(obsolete.signal.aborted).toBe(true);
    await act(async () => {
      obsolete.resolve(weather(99));
    });
    expect(
      screen.getByRole("button", { name: "Refresh Helsinki" }),
    ).toBeDisabled();
    await act(async () => {
      current.resolve(weather(4));
    });
    expect(card("Helsinki").getAllByText("4.0")).toHaveLength(2);
  });
});

describe("location search", () => {
  it("keeps its 350 ms debounce and ignores results after clearing the input", async () => {
    render(<App />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "He" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(349);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    const obsolete = requests[0];
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
    await act(async () => {
      obsolete.resolve(cities);
    });
    expect(obsolete.signal.aborted).toBe(true);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("keeps search errors separate from a successful weather card", async () => {
    render(<App />);
    const request = await add(cities[0]);
    await act(async () => {
      request.resolve(weather(10));
    });
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Oulu" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    await act(async () => {
      requests.at(-1)!.reject(new Error("offline"));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to search");
    expect(card("Helsinki").queryByRole("alert")).not.toBeInTheDocument();
    expect(card("Helsinki").getAllByText("10.0")).toHaveLength(2);
    expect(weatherRequests()).toHaveLength(1);
  });
});
