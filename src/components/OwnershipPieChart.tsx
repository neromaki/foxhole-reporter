import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS = {
  Colonial: "#51a651",
  Warden: "#4a7ba7",
  Neutral: "#999999",
};

interface OwnershipData {
  Colonial: number;
  Warden: number;
  Neutral: number;
}

interface OwnershipPieChartProps {
  data: OwnershipData;
}

export function OwnershipPieChart({ data }: OwnershipPieChartProps) {
  // Filter out Neutral (0%) and convert to array format
  const chartData = Object.entries(data)
    .filter(([team, pct]) => team !== "Neutral" && pct > 0)
    .map(([team, pct]) => ({
      name: team,
      value: Math.round(pct * 100), // Convert to percentage
    }));

  if (chartData.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No ownership data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          label={({ name, value }) => `${name}: ${value}%`}
          isAnimationActive={false}
          animationEasing="ease-out"
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number | undefined) => value !== undefined ? `${value}%` : 'N/A'} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
