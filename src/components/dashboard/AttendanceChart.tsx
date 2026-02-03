import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  getAllAttendancesAdmin,
  AttendanceRecord,
} from "@/services/attendance.services";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { AttendanceStatus } from "@/enums/enums";

interface AttendanceChartData {
  day: string;
  present: number;
  late: number;
  absent?: number;
}

interface AttendanceChartProps {
  data?: AttendanceChartData[];
}

// Helper function to get day name from date
const getDayName = (date: Date): string => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[date.getDay()];
};

// Helper function to process attendance records into chart data
const processAttendanceData = (
  records: AttendanceRecord[],
): AttendanceChartData[] => {
  // Get last 7 days
  const today = new Date();
  const last7Days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    date.setHours(0, 0, 0, 0);
    last7Days.push(date);
  }

  // Group attendances by day
  const dailyStats: Record<
    string,
    { present: number; late: number; absent: number }
  > = {};

  last7Days.forEach((date) => {
    const dayKey = date.toISOString().split("T")[0];
    dailyStats[dayKey] = { present: 0, late: 0, absent: 0 };
  });

  records.forEach((record) => {
    const recordDate = new Date(record.timestamp || record.checkInTime || "");
    const dayKey = recordDate.toISOString().split("T")[0];

    if (dailyStats[dayKey]) {
      // Only PRESENT (fully completed) counts as present
      if (record.status === AttendanceStatus.PRESENT) {
        dailyStats[dayKey].present++;
      } else if (record.status === AttendanceStatus.CHECKED_IN) {
        // CHECKED_IN without checkout counts as absent
        dailyStats[dayKey].absent++;
      } else if (record.status === AttendanceStatus.LATE) {
        dailyStats[dayKey].late++;
      } else if (record.status === AttendanceStatus.ABSENT) {
        dailyStats[dayKey].absent++;
      }
    }
  });

  // Convert to chart data format
  return last7Days.map((date) => {
    const dayKey = date.toISOString().split("T")[0];
    return {
      day: getDayName(date),
      present: dailyStats[dayKey]?.present || 0,
      late: dailyStats[dayKey]?.late || 0,
      absent: dailyStats[dayKey]?.absent || 0,
    };
  });
};

export const AttendanceChart = ({ data }: AttendanceChartProps) => {
  const { token } = useAuth();
  const [chartData, setChartData] = useState<AttendanceChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If data is provided, use it directly
    if (data) {
      setChartData(data);
      setLoading(false);
      return;
    }

    // Otherwise fetch from API
    const fetchAttendanceData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await getAllAttendancesAdmin(token);
        if (response.success && response.data) {
          const processedData = processAttendanceData(response.data);
          setChartData(processedData);
        } else {
          // Set empty data for last 7 days if fetch fails
          setChartData(processAttendanceData([]));
        }
      } catch (error) {
        console.error("Failed to fetch attendance data:", error);
        setChartData(processAttendanceData([]));
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [token, data]);

  if (loading) {
    return (
      <div className="h-[200px] sm:h-[250px] md:h-[300px] w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[200px] sm:h-[250px] md:h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
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
