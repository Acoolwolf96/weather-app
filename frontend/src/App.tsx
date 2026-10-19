import WeatherCharts from "./WeatherCharts";
import { useEffect, useState } from "react";

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

  const [selectedLocation, setSelectedLocation] = useState(
    "Helsinki, Finland"
  );

  // Load Helsinki weather initially
  useEffect(() => {
    async function loadWeather() {
      try {
        setLoading(true);

        const response = await fetch("/api/weather");

        if (!response.ok) {
          throw new Error("Failed to fetch weather data");
        }

        const data: WeatherData = await response.json();
        setWeather(data);
      } catch {
        setError("Unable to load weather data");
      } finally {
        setLoading(false);
      }
    }

    loadWeather();
  }, []);

  // Search for cities
  async function searchCities() {
    if (!search.trim()) return;

    try {
      setError("");
      setCities([]);

      const response = await fetch(
        `/api/locations?name=${encodeURIComponent(search)}`
      );

      if (!response.ok) {
        throw new Error("Failed to search locations");
      }

      const data: City[] = await response.json();
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

      <h2>{selectedLocation}</h2>

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

      {/* Weather forecast */}
      {!loading && weather && (
        <div>
          <h3>Hourly Weather Forecast</h3>

          <WeatherCharts forecast={weather.forecast} />
        </div>
      )}
    </main>
  );
}

export default App;
