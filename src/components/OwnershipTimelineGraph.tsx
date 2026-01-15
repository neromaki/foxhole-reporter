import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

interface OwnershipEntry {
  hour_start: string;
  owner: string;
}

interface OwnershipTimelineGraphProps {
  data: OwnershipEntry[];
}

interface TeamOwnership {
  name: string;
  [key: string]: [number, number] | string;
}

const HOUR_MS = 60 * 60 * 1000;

const formatTime = (value: number) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
  });

const formatTimeValue = (value: number | [number, number]) => {
  const timestamp = Array.isArray(value) ? value[0] : value;
  console.log('tickFormatter received:', timestamp, '→', formatTime(timestamp));
  return formatTime(timestamp);
};

const getBarColor = (name: string) => {
  switch (name) {
    case "Warden":
    case "Wardens":
      return "#4a7ba7";
    case "Colonial":
    case "Colonials":
      return "#51a651";
    default:
      return "#999999";
  }
};

const CustomFillRectangle = (props: any) => {
  const teamName = props?.payload?.name ?? props?.name ?? "";
  return <Rectangle {...props} fill={getBarColor(teamName)} />;
};

const ActiveRectangle = (props: any) => {
  return <CustomFillRectangle {...props} stroke="#f59e0b" strokeWidth={2} />;
};

export function OwnershipTimelineGraph({ data }: OwnershipTimelineGraphProps) {
  if (!data.length) {
    return (
      <div className="text-center text-gray-500 py-8">
        No ownership timeline available
      </div>
    );
  }

  const sorted = [...data].sort(
    (a, b) => new Date(a.hour_start).getTime() - new Date(b.hour_start).getTime()
  );

  const segments: Array<{ owner: string; range: [number, number] }> = [];

  sorted.forEach((entry, index) => {
    const start = new Date(entry.hour_start).getTime();
    const nextStart = sorted[index + 1]
      ? new Date(sorted[index + 1].hour_start).getTime()
      : start + HOUR_MS;

    const last = segments[segments.length - 1];
    if (last && last.owner === entry.owner) {
      last.range[1] = nextStart;
      return;
    }

    segments.push({
      owner: entry.owner,
      range: [start, nextStart],
    });
  });

  if (segments.length <= 1) {
    console.warn('[OwnershipTimelineGraph] Only 1 or fewer segments, will attempt to render anyway');
  }
  
  console.log('[OwnershipTimelineGraph] Segments:', segments.length, segments.map(s => ({
    owner: s.owner,
    start: dayjs(s.range[0]).format('MMM D HH:mm'),
    end: dayjs(s.range[1]).format('MMM D HH:mm'),
    durationHours: (s.range[1] - s.range[0]) / HOUR_MS,
  })));

  // Group segments by team and build chart data
  const teamData: TeamOwnership[] = [
    { name: "Warden" },
    { name: "Colonial" },
  ];

  const rangeKeys: string[] = [];
  const teamCounters: Record<string, number> = { Warden: 0, Colonial: 0 };

  segments.forEach((segment) => {
    const team = segment.owner;
    const index = teamCounters[team]++;
    const key = `owned${index + 1}`;

    const teamRecord = teamData.find((t) => t.name === team);
    if (teamRecord) {
      (teamRecord as Record<string, unknown>)[key] = segment.range;
    }

    if (!rangeKeys.includes(key)) {
      rangeKeys.push(key);
    }
  });

  console.log('[OwnershipTimelineGraph] TeamData after processing:', teamData.map(t => ({
    name: t.name,
    keys: Object.keys(t).filter(k => k !== 'name'),
    data: t,
  })));
  
  console.log('[OwnershipTimelineGraph] RangeKeys:', rangeKeys);

// Calculate data range for domain with padding
  const allTimestamps = segments.flatMap((s) => [s.range[0], s.range[1]]);
  const minTime = Math.min(...allTimestamps);
  const maxTime = Math.max(...allTimestamps);
  
  // Add 5% padding to prevent bars from being cut off
  const timeRange = maxTime - minTime;
  const padding = timeRange * 0.05;
  const paddedMin = minTime - padding;
  const paddedMax = maxTime + padding;
  
  // Detect if all segments are compressed into a very narrow range
  const allAtSameTime = segments.every(s => Math.abs(s.range[0] - minTime) < HOUR_MS && Math.abs(s.range[1] - maxTime) < HOUR_MS);
  if (allAtSameTime) {
    console.warn('[OwnershipTimelineGraph] WARNING: All segments compressed to same time point. Time range:', timeRange / HOUR_MS, 'hours');
  }
  
  console.log("OwnershipTimelineGraph minTime:", dayjs(minTime).toString(), "maxTime:", dayjs(maxTime).toString());
  console.log("Domain with padding:", [paddedMin, paddedMax], "time range:", timeRange / HOUR_MS, "hours");
  
  // Generate explicit ticks every 6 hours across the range
  const tickInterval = 6 * HOUR_MS; // 6 hours
  const ticks: number[] = [];
  for (let tick = minTime; tick <= maxTime; tick += tickInterval) {
    ticks.push(tick);
  }
  if (ticks[ticks.length - 1] !== maxTime) {
    ticks.push(maxTime);
  }
  console.log("Generated ticks:", ticks.map(t => dayjs(t).format('MMM D, HH:mm')));
  console.log("Bar count to render:", rangeKeys.length, "across", teamData.length, "teams");
  console.log("Bar count to render:", rangeKeys.length, "across", teamData.length, "teams");

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={teamData} layout="vertical">
        <XAxis
          type="number"
          domain={[paddedMin, paddedMax]}
          tickFormatter={formatTimeValue}
          scale="linear"
          interval="preserveStartEnd"
          tickCount={5}
          allowDataOverflow={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={60}
        />
        <Tooltip 
          shared={false}
          isAnimationActive={false}
          formatter={(value: unknown) => {
            const range = Array.isArray(value)
              ? (value as [number, number])
              : [Number(value) || 0, Number(value) || 0];
            const [start, end] = range;
            return [`${dayjs(start).to(dayjs(end), true)}`, "Held for"] as [string, string];
          }}
        />
        {rangeKeys.map((key) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="a"
            radius={8}
            shape={CustomFillRectangle}
            activeBar={ActiveRectangle}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
