import { useState, useMemo } from "react";
import {
  BarChart3,
  Users,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  CalendarX2,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Session,
  SessionStatus,
  AttendanceStatus,
} from "@/services/sessions.service";

const StaffDashboard = () => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7),
  );

  // Sessions state - empty for now, will be populated from API
  // Using useState to avoid useMemo dependency issues
  const [sessions] = useState<Session[]>([]);

  const months = [
    { value: "2024-01", label: "January 2024" },
    { value: "2024-02", label: "February 2024" },
    { value: "2024-03", label: "March 2024" },
    { value: "2024-04", label: "April 2024" },
    { value: "2024-05", label: "May 2024" },
    { value: "2024-06", label: "June 2024" },
    { value: "2024-07", label: "July 2024" },
    { value: "2024-08", label: "August 2024" },
    { value: "2024-09", label: "September 2024" },
    { value: "2024-10", label: "October 2024" },
    { value: "2024-11", label: "November 2024" },
    { value: "2024-12", label: "December 2024" },
  ];

  // Filter sessions by month
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const sessionMonth = new Date(session.startTime)
        .toISOString()
        .slice(0, 7);
      return (
        sessionMonth === selectedMonth &&
        session.status === SessionStatus.CLOSED
      );
    });
  }, [selectedMonth, sessions]);

  // Calculate attendance statistics
  const totalSessions = filteredSessions.length;
  // Only count PRESENT (fully completed) as present
  const totalPresent = filteredSessions.reduce(
    (acc, s) =>
      acc +
      (s.attendances?.filter((a) => a.status === AttendanceStatus.PRESENT)
        .length || 0),
    0,
  );
  const totalExpected = filteredSessions.reduce(
    (acc, s) => acc + (s.attendances?.length || 0),
    0,
  );
  const attendanceRate =
    totalExpected > 0 ? Math.round((totalPresent / totalExpected) * 100) : 0;

  // Session type breakdown
  const sessionBreakdown = useMemo(() => {
    const breakdown: { [type: string]: number } = {};
    filteredSessions.forEach((session) => {
      breakdown[session.type] = (breakdown[session.type] || 0) + 1;
    });
    return breakdown;
  }, [filteredSessions]);

  // Daily attendance trend for the selected month
  const dailyTrend = useMemo(() => {
    const trend: { [day: string]: { present: number; expected: number } } = {};
    filteredSessions.forEach((session) => {
      const day = new Date(session.startTime).toISOString().split("T")[0];
      if (!trend[day]) {
        trend[day] = { present: 0, expected: 0 };
      }
      // Only count PRESENT (fully completed) as present
      const presentCount =
        session.attendances?.filter(
          (a) => a.status === AttendanceStatus.PRESENT,
        ).length || 0;
      const expectedCount = session.attendances?.length || 0;
      trend[day].present += presentCount;
      trend[day].expected += expectedCount;
    });
    return trend;
  }, [filteredSessions]);

  const firstName = user?.name.split(" ")[0] || "Staff";

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          My Attendance Stats
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Welcome back {firstName}!, here's your attendance overview
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2">
          Staff ID: {user?.staff?.staffNo || "N/A"}
        </p>
      </div>

      {/* Month Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <label className="text-sm font-medium">Filter by Month:</label>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Select a month" />
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        <StatCard
          title="Total Sessions"
          value={totalSessions}
          icon={Calendar}
          variant="primary"
        />
        <StatCard
          title="Total Present"
          value={totalPresent}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Total Expected"
          value={totalExpected}
          icon={Users}
          variant="default"
        />
        <StatCard
          title="Attendance Rate"
          value={`${attendanceRate}%`}
          icon={TrendingUp}
          trend={{
            value: attendanceRate > 85 ? 5 : -3,
            isPositive: attendanceRate > 85,
          }}
        />
      </div>

      {/* Session Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Session Type Breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
              Session Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="space-y-2 sm:space-y-3">
              {Object.entries(sessionBreakdown).length > 0 ? (
                Object.entries(sessionBreakdown).map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm font-medium capitalize">
                      {type}
                    </span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No sessions for this month
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Daily Attendance */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              Daily Attendance Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="space-y-2 max-h-72 sm:max-h-96 overflow-y-auto">
              {Object.entries(dailyTrend).length > 0 ? (
                Object.entries(dailyTrend)
                  .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                  .map(([date, { present, expected }]) => {
                    const rate =
                      expected > 0 ? Math.round((present / expected) * 100) : 0;
                    return (
                      <div
                        key={date}
                        className="p-3 rounded-lg border border-border flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {present} / {expected} present
                          </p>
                        </div>
                        <Badge
                          variant={rate >= 80 ? "default" : "secondary"}
                          className="ml-2"
                        >
                          {rate}%
                        </Badge>
                      </div>
                    );
                  })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No attendance data for this month
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffDashboard;
