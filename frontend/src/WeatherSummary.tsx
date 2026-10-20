 
type Forecast = {
  time: string;
  temperature: number;
  shortwave_radiation: number;
};

type WeatherSummaryProps = {
  forecast: Forecast[];
};

function WeatherSummary({ forecast }: WeatherSummaryProps) {
  if (forecast.length === 0) return null;

  const temperatures = forecast.map((hour) => hour.temperature);
  const radiation = forecast.map((hour) => hour.shortwave_radiation);

  const minTemp = Math.min(...temperatures);
  const maxTemp = Math.max(...temperatures);
  const peakRadiation = Math.max(...radiation);

  return (
    <div className="weather-summary">
      <div className="summary-card">
        <h3>Minimum Temperature</h3>
        <p>{minTemp.toFixed(1)} °C</p>
      </div>

      <div className="summary-card">
        <h3>Maximum Temperature</h3>
        <p>{maxTemp.toFixed(1)} °C</p>
      </div>

      <div className="summary-card">
        <h3>Peak Solar Irradiance</h3>
        <p>{peakRadiation.toFixed(0)} W/m²</p>
      </div>
    </div>
  );
}

export default WeatherSummary;
