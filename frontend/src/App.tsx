
import { useState, useEffect } from "react";
import WeatherCharts from "./WeatherCharts";
import WeatherSummary from "./WeatherSummary";

type Forecast = {
  time: string;
  temperature: number;
  shortwave_radiation: number;
};

type WeatherData = {
  latitude: number;
  longitude: number;
  timezone: string;
  forecast: Forecast[];
};

type City = {
  id: number;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
};

function App() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");

  // Search for cities automatically as the user types
  useEffect(() => {
    const query = search.trim();

    if (query.length < 2) {
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);

        const response = await fetch(
          `/api/locations?name=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to search locations");
        }

        const data: City[] = await response.json();

        if (!controller.signal.aborted) {
          setCities(data);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("Unable to search locations");
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  // Update search input
  function handleSearchChange(value: string) {
    setSearch(value);
    setCities([]);
    setError("");
    setSearchLoading(false);
  }

  // Fetch weather when a city is selected
  async function selectCity(city: City) {
    try {
      setLoading(true);
      setError("");
      setWeather(null);
      setCities([]);
      setSearch("");
      setSearchLoading(false);

      setSelectedLocation(`${city.name}, ${city.country}`);

      const response = await fetch(
        `/api/weather?latitude=${city.latitude}&longitude=${city.longitude}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch weather");
      }

      const data: WeatherData = await response.json();

      setWeather(data);
    } catch {
      setError("Unable to load weather for this location");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dashboard">
      {/* Dashboard Header */}
      <header className="dashboard-header">
        <div className="brand">
          <div className="brand-icon">⚡</div>

          <div>
            <h1>Providers</h1>
            <p>Energy Weather</p>
          </div>
        </div>

        <div className="header-status">
          Weather Forecast Dashboard
        </div>
      </header>

      {/* Location Search */}
      <section className="location-panel">
        <div className="location-heading">
          <div>
            <span className="section-label">LOCATION</span>

            <h2>
              {selectedLocation || "Select a location"}
            </h2>
          </div>
        </div>

        <div className="search-container">
          <div className="autocomplete">
            <input
              type="search"
              placeholder="Search for a city..."
              value={search}
              autoComplete="off"
              aria-label="Search for a city"
              onChange={(e) =>
                handleSearchChange(e.target.value)
              }
            />

            {searchLoading && (
              <div className="search-loading">
                Searching locations...
              </div>
            )}

            {/* Autocomplete Dropdown */}
            {cities.length > 0 && (
              <div className="search-results">
                {cities.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    className="city-option"
                    onClick={() => selectCity(city)}
                  >
                    {city.name}, {city.country}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <p className="error-message">{error}</p>
      )}

      {/* Loading */}
      {loading && (
        <p className="loading-message">
          Loading weather data...
        </p>
      )}

      {/* Initial State */}
      {!weather && !loading && !error && (
        <div className="empty-state">
          <h3>Explore weather forecasts</h3>
          <p>
            Search for a city to view temperature and solar
            irradiance forecasts.
          </p>
        </div>
      )}

      {/* Weather Dashboard */}
      {!loading && weather && (
        <>
          <WeatherSummary forecast={weather.forecast} />

          <div className="forecast-heading">
            <div>
              <span className="section-label">
                FORECAST ANALYSIS
              </span>
              <h2>Hourly Weather Forecast</h2>
            </div>

            <span className="forecast-period">
              Next 24 hours
            </span>
          </div>

          <WeatherCharts forecast={weather.forecast} />
        </>
      )}
    </main>
  );
}

export default App;
