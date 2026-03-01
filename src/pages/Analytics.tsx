/**
 * Analytics Page
 *
 * Displays attendance analytics using module/subtopic-based filtering
 * instead of course-based filtering. Role-aware:
 * - Admin/SystemAdmin/Owner: system-wide across all modules
 * - Lecturer: filtered by assigned subtopics
 * - Student/Rep: filtered by level-appropriate modules
 * - Staff: personal attendance records
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Loader2,
  BarChart3,
  PieChartIcon,
  RefreshCw,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { modulesService, Module, SubTopic } from "@/services/modules.service";
import {
  Session,
  SessionStatus,
  SessionType,
  AttendanceStatus,
  getAllSessionsAdmin,
  getCreatorSessions,
  getLecturerSessions,
  Attendance,
} from "@/services/sessions.service";
import {
  getUserAttendance,
  AttendanceRecord as AttServiceRecord,
} from "@/services/attendance.services";
import { Role } from "@/enums/enums";

// Color palette for charts
const CHART_COLORS = [
  "hsl(173, 80%, 50%)",
  "hsl(215, 80%, 55%)",
  "hsl(280, 70%, 55%)",
  "hsl(45, 90%, 55%)",
  "hsl(340, 75%, 55%)",
  "hsl(120, 60%, 45%)",
  "hsl(30, 85%, 55%)",
  "hsl(190, 75%, 50%)",
];

interface AttendanceRecord extends Attendance {
  session: Session;
}

const Analytics = () => {
  const { user, token } = useAuth();
  const [timePeriod, setTimePeriod] = useState<string>("week");
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // Role helpers
  const isAdmin =
    user?.role === Role.ADMIN ||
    user?.role === Role.SYSTEM_ADMIN ||
    user?.role === Role.OWNER;
  const isLecturer = user?.role === Role.LECTURER;
  const isRep = user?.role === Role.REP;
  const isStaff = user?.role === Role.STAFF;

  // Load data
  const loadData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // ── Fetch modules (everyone except staff) ──
      if (!isStaff) {
        const studentLevel = user?.student?.level;
        const modulesRes =
          isAdmin || isLecturer
            ? await modulesService.getModules()
            : studentLevel
              ? await modulesService.getModules(studentLevel)
              : await modulesService.getModules();

        if (modulesRes.success && modulesRes.data) {
          const mods = Array.isArray(modulesRes.data)
            ? modulesRes.data
            : (modulesRes.data as unknown as { data: Module[] }).data || [];
          setAllModules(mods);
        }
      }

      // ── Fetch sessions / attendance based on role ──
      if (isAdmin) {
        // Admin: all sessions system-wide
        const sessionsRes = await getAllSessionsAdmin(token);
        if (sessionsRes.success && sessionsRes.data?.data) {
          setAllSessions(sessionsRes.data.data);
        } else {
          setAllSessions([]);
        }
      } else if (isLecturer) {
        // Lecturer: sessions for their assigned subtopics
        const sessionsRes = await getLecturerSessions(token);
        if (sessionsRes.success && sessionsRes.data) {
          const data = sessionsRes.data as Record<string, unknown>;
          const list =
            (data.data as Session[]) ||
            (data.sessions as Session[]) ||
            (Array.isArray(sessionsRes.data)
              ? (sessionsRes.data as unknown as Session[])
              : []);
          setAllSessions(list);
        } else {
          setAllSessions([]);
        }
      } else if (isRep) {
        // Rep: sessions they created (which include full attendance lists)
        const sessionsRes = await getCreatorSessions(token);
        if (sessionsRes.success && sessionsRes.data) {
          const data = sessionsRes.data as Record<string, unknown>;
          const list =
            (data.sessions as Session[]) ||
            (data.data as Session[]) ||
            (Array.isArray(sessionsRes.data)
              ? (sessionsRes.data as unknown as Session[])
              : []);
          setAllSessions(list);
        } else {
          setAllSessions([]);
        }
      } else {
        // Student / Staff: build session list from personal attendance records
        const attRes = await getUserAttendance(token);
        if (attRes.success && attRes.data) {
          const records: AttServiceRecord[] = Array.isArray(attRes.data)
            ? attRes.data
            : [];

          // Group attendance records by session to reconstruct Session objects
          const sessionMap = new Map<string, Session>();
          records.forEach((r) => {
            const sid = r.sessionId;
            if (!sid) return;
            if (!sessionMap.has(sid)) {
              const s =
                r.session || ({} as NonNullable<AttServiceRecord["session"]>);
              sessionMap.set(sid, {
                id: sid,
                name: s.name || "",
                token: "",
                startTime: s.startTime ? new Date(s.startTime) : new Date(),
                endTime: s.endTime ? new Date(s.endTime) : new Date(),
                mode: "CHECK_IN" as Session["mode"],
                type: "CLASS" as Session["type"],
                lateThreshold: 0,
                absentThreshold: 0,
                status: (s.status || "CLOSED") as Session["status"],
                userId: "",
                createdAt: new Date(),
                updatedAt: new Date(),
                moduleId: s.moduleId,
                module: s.module
                  ? {
                      id: s.module.id,
                      name: s.module.name,
                      code: s.module.code,
                      level: s.module.level,
                    }
                  : undefined,
                subtopicId: undefined,
                week: s.week ?? undefined,
                attendances: [],
              } as Session);
            }
            sessionMap.get(sid)!.attendances!.push({
              id: r.id,
              userId: r.userId,
              sessionId: sid,
              status: r.status as Attendance["status"],
              timestamp: r.timestamp ? new Date(r.timestamp) : new Date(),
              checkInTime: r.checkInTime ? new Date(r.checkInTime) : undefined,
              checkOutTime: r.checkOutTime
                ? new Date(r.checkOutTime)
                : undefined,
              confidence: r.confidence,
              source: r.source,
            });
          });
          setAllSessions(Array.from(sessionMap.values()));
        } else {
          setAllSessions([]);
        }
      }
    } catch (error) {
      console.error("Failed to load analytics data:", error);
      setAllSessions([]);
      setAllModules([]);
    } finally {
      setLoading(false);
    }
  }, [token, isAdmin, isLecturer, isRep, isStaff, user?.student?.level]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build relevant subtopics based on role
  const relevantSubtopics = useMemo((): SubTopic[] => {
    if (isAdmin) {
      // Admin: all subtopics from all modules
      return allModules.flatMap((m) => m.subtopics || []);
    }
    if (isLecturer) {
      // Lecturer: only subtopics they're assigned to
      // subtopic.lecturerId stores the User ID (not the Lecturer record ID)
      const lecturerUserId = user?.id;
      if (!lecturerUserId) return [];
      return allModules.flatMap((m) =>
        (m.subtopics || []).filter((st) => st.lecturerId === lecturerUserId),
      );
    }
    if (isStaff) {
      return []; // Staff don't use subtopics for analytics
    }
    // Student/Rep: all subtopics from their level modules (already fetched by level)
    return allModules.flatMap((m) => m.subtopics || []);
  }, [allModules, user?.id, isAdmin, isLecturer, isStaff]);

  const relevantSubtopicIds = useMemo(
    () => new Set(relevantSubtopics.map((st) => st.id)),
    [relevantSubtopics],
  );

  // Filter sessions by role
  const relevantSessions = useMemo(() => {
    if (isAdmin) return allSessions; // Admin sees everything
    if (isStaff) {
      // Staff: sessions where they have attendance
      const userId = user?.id;
      if (!userId) return [];
      return allSessions.filter((s) =>
        s.attendances?.some((a) => a.userId === userId),
      );
    }
    // Lecturer / Student / Rep: filter by subtopic assignment/level
    return allSessions.filter(
      (s) => s.subtopicId && relevantSubtopicIds.has(s.subtopicId),
    );
  }, [allSessions, isAdmin, isStaff, relevantSubtopicIds, user?.id]);

  // Build attendance records based on role
  const attendanceRecords = useMemo((): AttendanceRecord[] => {
    if (isAdmin || isRep) {
      // Admin/Rep: all records across all relevant sessions
      const records: AttendanceRecord[] = [];
      relevantSessions.forEach((session) => {
        session.attendances?.forEach((a) => {
          records.push({ ...a, session });
        });
      });
      return records;
    }
    // Lecturer / Student / Staff: only own records
    const userId = user?.id;
    if (!userId) return [];
    const records: AttendanceRecord[] = [];
    relevantSessions.forEach((session) => {
      const att = session.attendances?.find((a) => a.userId === userId);
      if (att) records.push({ ...att, session });
    });
    return records;
  }, [relevantSessions, user?.id, isAdmin, isRep]);

  // Time period date range
  const getDateRange = useMemo(() => {
    const now = new Date();
    const startDate = new Date();
    switch (timePeriod) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(now.getMonth() - 3);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }
    return { startDate, endDate: now };
  }, [timePeriod]);

  // Filtered records by time period
  const filteredRecords = useMemo(() => {
    const { startDate, endDate } = getDateRange;
    return attendanceRecords.filter((r) => {
      const d = new Date(r.session.startTime);
      return d >= startDate && d <= endDate;
    });
  }, [attendanceRecords, getDateRange]);

  // Filtered sessions by time period (with attendance relevance)
  const filteredSessions = useMemo(() => {
    const { startDate, endDate } = getDateRange;
    return relevantSessions.filter((session) => {
      const d = new Date(session.startTime);
      const inRange = d >= startDate && d <= endDate;
      const hasRelevance =
        session.status === SessionStatus.CLOSED ||
        (session.status === SessionStatus.OPEN &&
          session.attendances &&
          session.attendances.length > 0);
      const isAttendanceType =
        session.type === SessionType.CLASS ||
        session.type === SessionType.EXAM ||
        session.type === SessionType.LAB ||
        session.type === SessionType.TUTORIAL;
      return inRange && hasRelevance && isAttendanceType;
    });
  }, [relevantSessions, getDateRange]);

  // Calculate stats
  const stats = useMemo(() => {
    if (isAdmin || isRep) {
      // Admin/Rep: aggregate stats across all attendances in filtered sessions
      let totalAttendances = 0;
      let totalPresent = 0;
      let totalLate = 0;
      let totalAbsent = 0;

      filteredSessions.forEach((session) => {
        const atts = session.attendances || [];
        atts.forEach((a) => {
          totalAttendances++;
          if (a.status === AttendanceStatus.PRESENT) totalPresent++;
          else if (a.status === AttendanceStatus.LATE) totalLate++;
          else if (
            a.status === AttendanceStatus.ABSENT ||
            a.status === AttendanceStatus.CHECKED_IN
          )
            totalAbsent++;
        });
      });

      const total = totalAttendances || 1;
      const rate = Math.round(((totalPresent + totalLate) / total) * 100);
      return {
        attendanceRate: totalAttendances > 0 ? rate : 0,
        totalCheckins: totalPresent + totalLate,
        lateArrivals: totalLate,
        absentCount: totalAbsent,
        totalSessions: filteredSessions.length,
      };
    } else {
      // Personal stats for Lecturer / Student / Staff
      const userId = user?.id;
      if (!userId)
        return {
          attendanceRate: 0,
          totalCheckins: 0,
          lateArrivals: 0,
          absentCount: 0,
        };

      let attended = 0;
      let late = 0;
      let absent = 0;

      filteredSessions.forEach((session) => {
        const att = session.attendances?.find((a) => a.userId === userId);
        if (att) {
          if (att.status === AttendanceStatus.PRESENT) attended++;
          else if (att.status === AttendanceStatus.LATE) late++;
          else absent++;
        } else {
          absent++;
        }
      });

      const total = attended + late + absent;
      const rate =
        total > 0 ? Math.round(((attended + late) / total) * 100) : 0;
      return {
        attendanceRate: rate,
        totalCheckins: attended + late,
        lateArrivals: late,
        absentCount: absent,
      };
    }
  }, [filteredSessions, user?.id, isAdmin, isRep]);

  // Attendance trend data (daily breakdown)
  const attendanceTrendData = useMemo(() => {
    const { startDate, endDate } = getDateRange;
    const days: {
      day: string;
      present: number;
      late: number;
      absent: number;
    }[] = [];

    if (timePeriod === "today") {
      days.push({ day: "Today", present: 0, late: 0, absent: 0 });
    } else if (timePeriod === "week") {
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({
          day: dayNames[d.getDay()],
          present: 0,
          late: 0,
          absent: 0,
        });
      }
    } else {
      const diffDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const interval = timePeriod === "month" ? 7 : 14;
      for (let i = 0; i < diffDays; i += interval) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        days.push({
          day: `${d.getMonth() + 1}/${d.getDate()}`,
          present: 0,
          late: 0,
          absent: 0,
        });
      }
    }

    filteredRecords.forEach((record) => {
      const sessionDate = new Date(record.session.startTime);
      let dayIndex = -1;

      if (timePeriod === "today") {
        dayIndex = 0;
      } else if (timePeriod === "week") {
        const diffDays = Math.floor(
          (new Date().getTime() - sessionDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        dayIndex = 6 - diffDays;
      } else {
        const diffDays = Math.floor(
          (sessionDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        const interval = timePeriod === "month" ? 7 : 14;
        dayIndex = Math.floor(diffDays / interval);
      }

      if (dayIndex >= 0 && dayIndex < days.length) {
        if (record.status === AttendanceStatus.PRESENT) {
          days[dayIndex].present++;
        } else if (record.status === AttendanceStatus.LATE) {
          days[dayIndex].late++;
        } else if (
          record.status === AttendanceStatus.ABSENT ||
          record.status === AttendanceStatus.CHECKED_IN
        ) {
          days[dayIndex].absent++;
        }
      }
    });

    return days;
  }, [filteredRecords, getDateRange, timePeriod]);

  // Module/Subtopic distribution data (replaces course distribution)
  const subtopicDistributionData = useMemo(() => {
    if (isStaff) return []; // Staff don't use subtopic distribution

    // Build a map: subtopic → session count
    const subtopicMap = new Map<
      string,
      { name: string; moduleName: string; count: number }
    >();

    relevantSubtopics.forEach((st) => {
      const mod = allModules.find((m) =>
        m.subtopics?.some((s) => s.id === st.id),
      );
      subtopicMap.set(st.id, {
        name: st.name,
        moduleName: mod?.code || mod?.name || "",
        count: 0,
      });
    });

    // Count 1 per session (not per attendance record)
    filteredSessions.forEach((session) => {
      if (session.subtopicId && subtopicMap.has(session.subtopicId)) {
        subtopicMap.get(session.subtopicId)!.count++;
      }
    });

    return Array.from(subtopicMap.values())
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((item, index) => ({
        name: item.name,
        fullName: `${item.moduleName} - ${item.name}`,
        value: item.count,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }));
  }, [relevantSubtopics, allModules, filteredSessions, isStaff]);

  // Hourly check-in distribution
  const hourlyDistributionData = useMemo(() => {
    const hours: { hour: string; count: number }[] = [];
    for (let i = 7; i <= 20; i++) {
      const hour = i > 12 ? `${i - 12}PM` : i === 12 ? "12PM" : `${i}AM`;
      hours.push({ hour, count: 0 });
    }

    filteredRecords.forEach((record) => {
      if (record.checkInTime) {
        const checkInHour = new Date(record.checkInTime).getHours();
        const hourIndex = checkInHour - 7;
        if (hourIndex >= 0 && hourIndex < hours.length) {
          hours[hourIndex].count++;
        }
      }
    });

    return hours;
  }, [filteredRecords]);

  // Stat Cards
  const showAggregateStats = isAdmin || isRep;
  const statCards = showAggregateStats
    ? [
        {
          label: "System Attendance Rate",
          value: `${stats.attendanceRate}%`,
          change:
            stats.attendanceRate >= 85 ? "Good overall" : "Needs attention",
          isPositive: stats.attendanceRate >= 85,
          icon: TrendingUp,
        },
        {
          label: "Total Check-ins",
          value: stats.totalCheckins.toString(),
          change: `Across ${filteredSessions.length} sessions`,
          isPositive: true,
          icon: Users,
        },
        {
          label: "Late Arrivals",
          value: stats.lateArrivals.toString(),
          change: "System-wide",
          isPositive: stats.lateArrivals === 0,
          icon: Clock,
        },
        {
          label: "Total Absences",
          value: stats.absentCount.toString(),
          change: "Across all sessions",
          isPositive: stats.absentCount === 0,
          icon: TrendingDown,
        },
      ]
    : [
        {
          label: "Attendance Rate",
          value: `${stats.attendanceRate}%`,
          change: stats.attendanceRate >= 85 ? "+Good" : "Needs improvement",
          isPositive: stats.attendanceRate >= 85,
          icon: TrendingUp,
        },
        {
          label: "Total Check-ins",
          value: stats.totalCheckins.toString(),
          change: `${filteredSessions.length} sessions`,
          isPositive: true,
          icon: Users,
        },
        {
          label: "Late Arrivals",
          value: stats.lateArrivals.toString(),
          change:
            stats.lateArrivals === 0
              ? "Perfect timing!"
              : "Try arriving earlier",
          isPositive: stats.lateArrivals === 0,
          icon: Clock,
        },
        {
          label: "Absences",
          value: stats.absentCount.toString(),
          change:
            stats.absentCount === 0 ? "Perfect attendance!" : "Sessions missed",
          isPositive: stats.absentCount === 0,
          icon: TrendingDown,
        },
      ];

  const hasData = filteredSessions.length > 0 || filteredRecords.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? "System-wide attendance insights and reports"
              : isRep
                ? "Attendance insights for sessions you manage"
                : isLecturer
                  ? "Attendance insights for your assigned subtopics"
                  : isStaff
                    ? "Your personal attendance insights"
                    : "Your attendance insights across your level's modules"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Refresh data"
          >
            <RefreshCw
              className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="p-5 bg-card rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <stat.icon
                className={`w-5 h-5 ${stat.isPositive ? "text-success" : "text-destructive"}`}
              />
            </div>
            <p className="text-3xl font-bold text-foreground mt-2">
              {stat.value}
            </p>
            <p
              className={`text-sm mt-1 ${stat.isPositive ? "text-success" : "text-destructive"}`}
            >
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">
            Attendance Trend
          </h2>
          {hasData &&
          attendanceTrendData.some((d) => d.present > 0 || d.late > 0) ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceTrendData}>
                  <defs>
                    <linearGradient
                      id="presentGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
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
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="present"
                    stroke="hsl(173, 80%, 50%)"
                    strokeWidth={2}
                    fill="url(#presentGrad)"
                    name="Present"
                  />
                  <Area
                    type="monotone"
                    dataKey="late"
                    stroke="hsl(45, 90%, 55%)"
                    strokeWidth={2}
                    fill="transparent"
                    name="Late"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-base font-medium text-foreground mb-2">
                No attendance data
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {isAdmin
                  ? "Attendance trends will appear here once sessions have recorded check-ins"
                  : "Attendance trends will appear here once you start attending sessions"}
              </p>
            </div>
          )}
        </div>

        {/* Subtopic Distribution (replaces Course Distribution) */}
        {!isStaff && (
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">
              Sessions by Subtopic
            </h2>
            {subtopicDistributionData.length > 0 ? (
              <div className="h-[300px] flex items-center">
                <ResponsiveContainer width="60%" height="100%">
                  <PieChart>
                    <Pie
                      data={subtopicDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {subtopicDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(222, 47%, 10%)",
                        border: "1px solid hsl(217, 33%, 17%)",
                        borderRadius: "8px",
                      }}
                      formatter={(
                        value: number,
                        _name: string,
                        props: { payload?: { fullName?: string } },
                      ) => [
                        `${value} session${value !== 1 ? "s" : ""}`,
                        props.payload?.fullName || "Subtopic",
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {subtopicDistributionData.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span
                        className="text-muted-foreground truncate"
                        title={item.fullName}
                      >
                        {item.name}
                      </span>
                      <span className="font-medium text-foreground ml-auto">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-center">
                <PieChartIcon className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-base font-medium text-foreground mb-2">
                  No subtopic data
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {isAdmin
                    ? "Subtopic distribution will appear here once sessions have attendance records"
                    : "Subtopic distribution will appear here once you attend sessions"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* For staff, show a placeholder card instead of subtopic distribution */}
        {isStaff && (
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">
              Attendance Summary
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Present</span>
                <span className="text-sm font-bold text-success">
                  {
                    filteredRecords.filter(
                      (r) => r.status === AttendanceStatus.PRESENT,
                    ).length
                  }
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Late</span>
                <span className="text-sm font-bold text-warning">
                  {
                    filteredRecords.filter(
                      (r) => r.status === AttendanceStatus.LATE,
                    ).length
                  }
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Absent</span>
                <span className="text-sm font-bold text-destructive">
                  {
                    filteredRecords.filter(
                      (r) =>
                        r.status === AttendanceStatus.ABSENT ||
                        r.status === AttendanceStatus.CHECKED_IN,
                    ).length
                  }
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">
                  Total Records
                </span>
                <span className="text-sm font-bold text-foreground">
                  {filteredRecords.length}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Hourly Distribution */}
        <div className="bg-card rounded-xl border border-border p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-foreground mb-6">
            Check-in Distribution by Hour
          </h2>
          {hourlyDistributionData.some((h) => h.count > 0) ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyDistributionData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(217, 33%, 17%)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="hour"
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
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(173, 80%, 50%)"
                    radius={[4, 4, 0, 0]}
                    name="Check-ins"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] flex flex-col items-center justify-center text-center">
              <Clock className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-base font-medium text-foreground mb-2">
                No check-in data
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {isAdmin
                  ? "Check-in time distribution will appear here once sessions have attendance records"
                  : "Your check-in time distribution will appear here once you start attending sessions"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
