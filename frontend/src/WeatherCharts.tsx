
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Forecast = {
  time: string;
  temperature: number;
  shortwave_radiation: number;
};

type WeatherChartsProps = {
  forecast: Forecast[];
};

function WeatherCharts({ forecast }: WeatherChartsProps) {
  return (
    <div>
      {/* Temperature chart */}
      <section>
        <h3>Temperature Forecast (°C)</h3>

        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecast}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="time"
                tickFormatter={(time: string) => time.slice(11, 16)}
              />

              <YAxis />

              <Tooltip />

              <Line
                type="monotone"
                dataKey="temperature"
                name="Temperature (°C)"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Solar irradiance chart */}
      <section>
        <h3>Solar Irradiance Forecast (W/m²)</h3>

        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecast}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="time"
                tickFormatter={(time: string) => time.slice(11, 16)}
              />

              <YAxis domain={[0, "auto"]} />

              <Tooltip />

              <Area
                type="monotone"
                dataKey="shortwave_radiation"
                name="Solar Irradiance (W/m²)"
                stroke="#eab308"
                fill="#fef08a"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

export default WeatherCharts;
 
