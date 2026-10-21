import { useId } from "react";
import WeatherCharts from "./WeatherCharts";
import WeatherSummary from "./WeatherSummary";
import { useWeather } from "./useWeather";
import type { City } from "./types";

type Props = { city: City; onRemove: () => void };

export default function LocationWeatherCard({ city, onRemove }: Props) {
  const { weather, error, loading, refresh } = useWeather(
    city.latitude,
    city.longitude,
  );
  const headingId = useId();

  return (
    <article className="location-card" aria-labelledby={headingId}>
      <header className="card-header">
        <div className="card-location">
          <span className="section-label">LOCATION FORECAST</span>
          <h2 id={headingId}>{city.name}</h2>
          <p className="location-detail">
            {[city.admin1, city.country].filter(Boolean).join(", ")}
          </p>
        </div>
        <div className="card-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={refresh}
            disabled={loading}
            aria-label={`Refresh ${city.name}`}
          >
            {loading && weather ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            className="remove-button"
            onClick={onRemove}
            aria-label={`Remove ${city.name}`}
          >
            Remove
          </button>
        </div>
      </header>

      <p className="forecast-meta">
        {weather
          ? `Forecast timezone: ${weather.timezone}`
          : "Forecast timezone: awaiting data"}
      </p>

      <div role="status" className="card-status">
        {loading &&
          (weather
            ? "Refreshing forecast… Previous data remains visible."
            : "Loading forecast…")}
      </div>

      {error && (
        <div
          className={weather ? "warning-message" : "error-message"}
          role="alert"
        >
          <p>
            {weather
              ? "Refresh failed. Showing the last successful forecast."
              : error}
          </p>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            aria-label={`Retry ${city.name}`}
          >
            Retry
          </button>
        </div>
      )}

      {weather && (
        <>
          <WeatherSummary forecast={weather.forecast} />
          {weather.forecast.length === 0 ? (
            <p className="forecast-empty">
              No hourly forecast is available for this location. Try refreshing.
            </p>
          ) : (
            <>
              <p className="forecast-period">24-hour forecast · Local time</p>
              <WeatherCharts
                forecast={weather.forecast}
                timezone={weather.timezone}
              />
            </>
          )}
        </>
      )}
    </article>
  );
}
