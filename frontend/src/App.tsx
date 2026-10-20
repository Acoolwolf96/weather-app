
import { useState } from "react";
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
  const [selectedLocation, setSelectedLocation] = useState("");

  // Search for cities
  async function searchCities() {
    if (!search.trim()) {
      setError("Please enter a city name");
      return;
    }

    try {
      setError("");
      setCities([]);

      const response = await fetch(
        `/api/locations?name=${encodeURIComponent(search.trim())}`
      );

      if (!response.ok) {
        throw new Error("Failed to search locations");
      }

      const data: City[] = await response.json();

      if (data.length === 0) {
        setError("No matching locations found");
        return;
      }

      setCities(data);
    } catch {
      setError("Unable to search locations");
    }
  }

  // Fetch weather when a city is selected
  async function selectCity(city: City) {
    try {
      setLoading(true);
      setError("");
      setWeather(null);
      setCities([]);
      setSearch("");

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
    <main>
      <h1>Energy Weather Dashboard</h1>

      {/* Show location only when selected */}
      {selectedLocation && <h2>{selectedLocation}</h2>}

      {/* Location search */}
      <div>
        <input
          type="text"
          placeholder="Search for a city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button onClick={searchCities}>Search</button>

        {/* Search results */}
        {cities.map((city) => (
          <div key={city.id}>
            <button onClick={() => selectCity(city)}>
              {city.name}, {city.country}
            </button>
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && <p>{error}</p>}

      {/* Loading indicator */}
      {loading && <p>Loading weather data...</p>}

      {/* Initial message */}
      {!weather && !loading && !error && (
        <p>Search for a city to view its weather forecast.</p>
      )}

      {/* Weather forecast */}
      {!loading && weather && (
        <div>
          <WeatherSummary forecast={weather.forecast} />

          <h3>Hourly Weather Forecast</h3>

          <WeatherCharts forecast={weather.forecast} />
        </div>
      )}
    </main>
  );
}

export default App;
