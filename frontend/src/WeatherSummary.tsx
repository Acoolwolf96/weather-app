import type { Forecast } from "./types";
import { isAvailable } from "./weatherFormat";

function WeatherSummary({ forecast }: { forecast: Forecast[] }) {
  const temperatures = forecast
    .map((hour) => hour.temperature)
    .filter(isAvailable);
  const radiation = forecast
    .map((hour) => hour.shortwave_radiation)
    .filter(isAvailable);
  const minTemp = temperatures.length ? Math.min(...temperatures) : null;
  const maxTemp = temperatures.length ? Math.max(...temperatures) : null;
  const peakRadiation = radiation.length ? Math.max(...radiation) : null;

  return (
    <dl className="weather-summary">
      <div className="summary-card">
        <dt>Minimum temperature</dt>
        <dd>
          {minTemp === null ? (
            "Unavailable"
          ) : (
            <>
              {minTemp.toFixed(1)} <span>°C</span>
            </>
          )}
        </dd>
        {temperatures.length > 0 && temperatures.length < forecast.length && (
          <dd className="partial-coverage">
            Partial: {temperatures.length}/{forecast.length} samples
          </dd>
        )}
      </div>
      <div className="summary-card">
        <dt>Maximum temperature</dt>
        <dd>
          {maxTemp === null ? (
            "Unavailable"
          ) : (
            <>
              {maxTemp.toFixed(1)} <span>°C</span>
            </>
          )}
        </dd>
        {temperatures.length > 0 && temperatures.length < forecast.length && (
          <dd className="partial-coverage">
            Partial: {temperatures.length}/{forecast.length} samples
          </dd>
        )}
      </div>
      <div className="summary-card solar-summary">
        <dt>Peak irradiance</dt>
        <dd>
          {peakRadiation === null ? (
            "Unavailable"
          ) : (
            <>
              {peakRadiation.toFixed(0)} <span>W/m²</span>
            </>
          )}
        </dd>
        {radiation.length > 0 && radiation.length < forecast.length && (
          <dd className="partial-coverage">
            Partial: {radiation.length}/{forecast.length} samples
          </dd>
        )}
      </div>
    </dl>
  );
}

export default WeatherSummary;
