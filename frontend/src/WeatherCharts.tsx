import { useId } from "react";
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
import type { Forecast } from "./types";
import {
  formatForecastTime,
  formatIrradianceInterval,
  isAvailable,
} from "./weatherFormat";

type Props = { forecast: Forecast[]; timezone: string };

const tooltipStyle = {
  backgroundColor: "#0b1120",
  border: "1px solid #475569",
  borderRadius: 8,
  color: "#f8fafc",
  fontSize: 12,
  maxWidth: "100%",
};

function WeatherCharts({ forecast, timezone }: Props) {
  const id = useId();
  const data = forecast.map((hour) => ({
    ...hour,
    temperature: isAvailable(hour.temperature) ? hour.temperature : null,
    shortwave_radiation: isAvailable(hour.shortwave_radiation)
      ? hour.shortwave_radiation
      : null,
  }));
  const labelFormatter = (label: unknown) =>
    `${formatForecastTime(String(label), timezone)} · ${timezone}`;
  const valueFormatter = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : "Unavailable";
  const timeAxis = {
    dataKey: "time",
    tickFormatter: (time: string) => formatForecastTime(time, timezone, true),
    minTickGap: 28,
    tick: { fill: "#94a3b8", fontSize: 11 },
    axisLine: false,
    tickLine: false,
  };
  const valueAxis = {
    width: 42,
    tick: { fill: "#94a3b8", fontSize: 11 },
    axisLine: false,
    tickLine: false,
  };

  return (
    <div className="weather-charts">
      <section className="chart-panel" aria-labelledby={`${id}-temperature`}>
        <h3 id={`${id}-temperature`}>
          <span className="chart-key temperature-key" />
          Temperature <span>°C</span>
        </h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart
              data={data}
              margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
              accessibilityLayer
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis {...timeAxis} />
              <YAxis {...valueAxis} />
              <Tooltip
                position={{ x: 0 }}
                contentStyle={tooltipStyle}
                labelStyle={{ color: "#f8fafc" }}
                itemStyle={{ color: "#e2e8f0" }}
                labelFormatter={labelFormatter}
                formatter={valueFormatter}
                filterNull={false}
              />
              <Line
                type="monotone"
                dataKey="temperature"
                name="Temperature (°C)"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="chart-panel" aria-labelledby={`${id}-solar`}>
        <h3 id={`${id}-solar`}>
          <span className="chart-key solar-key" />
          Solar irradiance <span>W/m²</span>
        </h3>
        <p className="chart-note">Mean over the preceding hour</p>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart
              data={data}
              margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
              accessibilityLayer
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis {...timeAxis} />
              <YAxis {...valueAxis} domain={[0, "auto"]} />
              <Tooltip
                position={{ x: 0 }}
                contentStyle={tooltipStyle}
                labelStyle={{ color: "#f8fafc" }}
                itemStyle={{ color: "#e2e8f0" }}
                labelFormatter={(label) =>
                  formatIrradianceInterval(String(label), timezone)
                }
                formatter={valueFormatter}
                filterNull={false}
              />
              <Area
                type="monotone"
                dataKey="shortwave_radiation"
                name="Solar irradiance (W/m²)"
                stroke="#eab308"
                fill="#fef08a"
                fillOpacity={0.15}
                strokeWidth={2}
                connectNulls={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

export default WeatherCharts;
