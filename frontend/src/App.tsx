import { useState, useEffect, useRef } from "react";
import LocationWeatherCard from "./LocationWeatherCard";
import type { City } from "./types";

const MAX_LOCATIONS = 4;

function App() {
  const [selectedCities, setSelectedCities] = useState<City[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [search, setSearch] = useState("");
  const [searchError, setSearchError] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const searchRequest = useRef<AbortController | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const atLimit = selectedCities.length >= MAX_LOCATIONS;

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) return;

    const controller = new AbortController();
    searchRequest.current = controller;
    const timer = setTimeout(async () => {
      if (controller.signal.aborted) return;
      setSearchLoading(true);
      try {
        const response = await fetch(
          `/api/locations?name=${encodeURIComponent(query)}`,
          {
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error("Location search failed");
        const data: City[] = await response.json();
        if (!controller.signal.aborted) {
          setCities(data);
          setNoResults(data.length === 0);
        }
      } catch {
        if (!controller.signal.aborted) {
          setSearchError(
            "Unable to search locations. Please try searching again.",
          );
          setNoResults(false);
        }
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  function handleSearchChange(value: string) {
    searchRequest.current?.abort();
    setSearch(value);
    setCities([]);
    setSearchError("");
    setSearchLoading(false);
    setNoResults(false);
  }

  function addCity(city: City) {
    if (atLimit || selectedCities.some((selected) => selected.id === city.id))
      return;
    setSelectedCities((selected) => {
      if (
        selected.length >= MAX_LOCATIONS ||
        selected.some((item) => item.id === city.id)
      ) {
        return selected;
      }
      return [...selected, city];
    });
    handleSearchChange("");
    searchInput.current?.focus();
  }

  function removeCity(id: number) {
    setSelectedCities((selected) => selected.filter((city) => city.id !== id));
    searchInput.current?.focus();
  }

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div className="brand">
          <div className="brand-icon" aria-hidden="true">
            ⚡
          </div>
          <div>
            <h1>Providers</h1>
            <p>Energy Weather</p>
          </div>
        </div>
        <div className="header-status">Weather Forecast Dashboard</div>
      </header>

      <section className="location-panel" aria-labelledby="search-heading">
        <div className="location-heading">
          <div>
            <span className="section-label">COMPARE LOCATIONS</span>
            <h2 id="search-heading">Your weather, side by side</h2>
          </div>
          <span className="location-count" role="status">
            {selectedCities.length} of {MAX_LOCATIONS} locations
          </span>
        </div>
        <p id="search-help" className="search-help">
          {atLimit
            ? "Remove a location to add another."
            : `Add up to ${MAX_LOCATIONS} cities to compare temperature and solar irradiance.`}
        </p>
        <div className="search-container">
          <div className="autocomplete">
            <label className="search-label" htmlFor="city-search">
              Search for a city
            </label>
            <input
              id="city-search"
              ref={searchInput}
              type="search"
              placeholder="Try Helsinki or Oulu…"
              value={search}
              autoComplete="off"
              aria-describedby="search-help"
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <div className="search-status" role="status">
              {searchLoading && "Searching locations…"}
              {!searchLoading &&
                noResults &&
                `No matching locations found for “${search}”.`}
            </div>
            {searchError && (
              <p className="error-message" role="alert">
                {searchError}
              </p>
            )}
            {cities.length > 0 && (
              <ul className="search-results" aria-label="Matching locations">
                {cities.map((city) => {
                  const added = selectedCities.some(
                    (selected) => selected.id === city.id,
                  );
                  return (
                    <li key={city.id}>
                      <button
                        type="button"
                        className="city-option"
                        disabled={added || atLimit}
                        onClick={() => addCity(city)}
                      >
                        <span>
                          {[city.name, city.admin1, city.country]
                            .filter(Boolean)
                            .join(", ")}
                        </span>{" "}
                        <span className="result-action">
                          {added ? "Added" : atLimit ? "Limit reached" : "Add"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      {selectedCities.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            ☀
          </span>
          <h2>Explore weather forecasts</h2>
          <p>
            Search for a city and add a location to see its temperature and
            solar irradiance forecast here.
          </p>
        </div>
      ) : (
        <div className="dashboard-grid">
          {selectedCities.map((city) => (
            <LocationWeatherCard
              key={city.id}
              city={city}
              onRemove={() => removeCity(city.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}

export default App;
