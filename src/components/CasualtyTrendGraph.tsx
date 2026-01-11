import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface CasualtyEntry {
  hour_start: string;
  warden_rate_per_hour: number;
  colonial_rate_per_hour: number;
  warden_casualties_delta?: number;
  colonial_casualties_delta?: number;
}

interface CasualtyTrendGraphProps {
  data: CasualtyEntry[];
}

export function CasualtyTrendGraph({ data }: CasualtyTrendGraphProps) {
  const chartData = data.map((entry) => ({
    hour: new Date(entry.hour_start).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
    }),
    wardenRate: entry.warden_rate_per_hour,
    colonialRate: entry.colonial_rate_per_hour,
  }));

  if (chartData.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No casualty trend data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="hour" 
          angle={-45} 
          textAnchor="end" 
          height={80}
          interval="preserveStartEnd"
        />
        <YAxis 
          label={{ value: "Casualties/Hour", angle: -90, position: "insideLeft" }}
        />
        <Tooltip 
          formatter={(value: any) => {
            if (value === null || value === undefined) return "N/A";
            return typeof value === 'number' ? value.toFixed(1) : String(value);
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="wardenRate"
          stroke="#4a7ba7"
          name="Warden"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="colonialRate"
          stroke="#51a651"
          name="Colonial"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
