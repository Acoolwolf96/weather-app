export type Forecast = {
  // Absolute UTC ISO 8601 timestamp ending in Z.
  time: string;
  temperature: number | null;
  shortwave_radiation: number | null;
};

export type WeatherData = {
  latitude: number;
  longitude: number;
  timezone: string;
  retrieved_at: string;
  forecast: Forecast[];
};

export type City = {
  id: number;
  name: string;
  admin1?: string | null;
  country?: string | null;
  latitude: number;
  longitude: number;
};
