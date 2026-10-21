export type Forecast = {
  // Open-Meteo local wall time in WeatherData.timezone, without a UTC offset.
  time: string;
  temperature: number | null;
  shortwave_radiation: number | null;
};

export type WeatherData = {
  latitude: number;
  longitude: number;
  timezone: string;
  forecast: Forecast[];
};

export type City = {
  id: number;
  name: string;
  admin1?: string;
  country: string;
  latitude: number;
  longitude: number;
};
