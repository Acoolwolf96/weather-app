import { useEffect, useRef, useState } from "react";
import type { WeatherData } from "./types";

export function useWeather(latitude: number, longitude: number) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshCount, setRefreshCount] = useState(0);
  const generation = useRef(0);
  const active = useRef(true);

  useEffect(() => {
    const controller = new AbortController();
    const request = ++generation.current;
    const isCurrent = () =>
      !controller.signal.aborted && generation.current === request;

    async function load() {
      try {
        const response = await fetch(
          `/api/weather?latitude=${latitude}&longitude=${longitude}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Weather request failed");
        const data: WeatherData = await response.json();
        if (isCurrent()) setWeather(data);
      } catch {
        if (isCurrent()) setError("Unable to load the forecast.");
      } finally {
        if (isCurrent()) {
          active.current = false;
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      controller.abort();
      generation.current += 1;
    };
  }, [latitude, longitude, refreshCount]);

  function refresh() {
    // Also guard rapid activations before React renders the disabled button.
    if (active.current) return;
    active.current = true;
    setLoading(true);
    setError("");
    setRefreshCount((count) => count + 1);
  }

  return { weather, error, loading, refresh };
}
