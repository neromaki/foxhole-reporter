import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface OwnershipEntry {
  hour_start: string;
  owner: string;
}

interface OwnershipTimelineGraphProps {
  data: OwnershipEntry[];
}

export function OwnershipTimelineGraph({ data }: OwnershipTimelineGraphProps) {
  // Convert ownership history into binary series for visualization
  const chartData = data.map((entry) => ({
    hour: new Date(entry.hour_start).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
    }),
    wardenOwned: entry.owner === "Warden" ? 1 : 0,
    colonialOwned: entry.owner === "Colonial" ? 1 : 0,
  }));

  if (chartData.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No ownership timeline available
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
          domain={[0, 1]} 
          ticks={[0, 1]} 
          tickFormatter={(val) => (val === 1 ? "Owned" : "")}
        />
        <Tooltip 
          formatter={(value: number | undefined) => value === 1 ? "Owned" : "Not Owned"}
        />
        <Legend />
        <Line
          type="stepAfter"
          dataKey="wardenOwned"
          stroke="#4a7ba7"
          name="Warden"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="stepAfter"
          dataKey="colonialOwned"
          stroke="#51a651"
          name="Colonial"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
