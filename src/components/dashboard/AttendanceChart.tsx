import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { attendanceChartData } from "@/data/mockData";

export const AttendanceChart = () => {
  return (
    <div className="h-[200px] sm:h-[250px] md:h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={attendanceChartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="hsl(173, 80%, 50%)"
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor="hsl(173, 80%, 50%)"
                stopOpacity={0}
              />
            </linearGradient>
            <linearGradient id="lateGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="hsl(38, 92%, 50%)"
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor="hsl(38, 92%, 50%)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(217, 33%, 17%)"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222, 47%, 10%)",
              border: "1px solid hsl(217, 33%, 17%)",
              borderRadius: "8px",
              boxShadow: "0 4px 24px rgba(0, 0, 0, 0.3)",
            }}
            labelStyle={{ color: "hsl(210, 40%, 98%)" }}
            itemStyle={{ color: "hsl(210, 40%, 98%)" }}
          />
          <Area
            type="monotone"
            dataKey="present"
            stroke="hsl(173, 80%, 50%)"
            strokeWidth={2}
            fill="url(#presentGradient)"
            name="Present"
          />
          <Area
            type="monotone"
            dataKey="late"
            stroke="hsl(38, 92%, 50%)"
            strokeWidth={2}
            fill="url(#lateGradient)"
            name="Late"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
