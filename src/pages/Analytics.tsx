import { useState, useEffect, useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import {
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Loader2,
  BarChart3,
  PieChartIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { coursesService, Course } from "@/services/courses.services";
import {
  Session,
  SessionStatus,
  SessionType,
  AttendanceStatus,
  getAllSessionsAdmin,
  Attendance,
} from "@/services/sessions.service";
import { usersServices } from "@/services/users.services";
import { IUser, IStudent } from "@/interface/user.interface";
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
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [studentCourses, setStudentCourses] = useState<Course[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [studentData, setStudentData] = useState<
    (IUser & { student?: IStudent | null }) | null
  >(null);
  const [loading, setLoading] = useState(true);

  // Check if user is admin or system_admin
  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SYSTEM_ADMIN;

  // Load data based on user role
  useEffect(() => {
    const loadAnalyticsData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch all sessions
        const sessionsResponse = await getAllSessionsAdmin(token);
        if (sessionsResponse.success && sessionsResponse.data?.data) {
          setAllSessions(sessionsResponse.data.data);
        } else {
          setAllSessions([]);
        }

        if (isAdmin) {
          // For admins: fetch all courses for system-wide analytics
          const allCoursesResponse = await coursesService.getAllCourses();
          if (allCoursesResponse.success && allCoursesResponse.data) {
            // Handle both possible response structures
            const coursesData = Array.isArray(allCoursesResponse.data)
              ? allCoursesResponse.data
              : allCoursesResponse.data.data || [];
            setAllCourses(coursesData);
          } else {
            setAllCourses([]);
          }
        } else {
          // For non-admins: fetch personal data
          const userResponse = await usersServices.getUserById(token);
          if (userResponse.success && userResponse.data?.user) {
            setStudentData(userResponse.data.user);
          }

          // Fetch student's enrolled courses
          const coursesResponse = await coursesService.getStudentCourses();
          if (coursesResponse.success && coursesResponse.data?.data) {
            setStudentCourses(coursesResponse.data.data);
          } else {
            setStudentCourses([]);
          }
        }
      } catch (error) {
        console.error("Failed to load analytics data:", error);
        setStudentCourses([]);
        setAllCourses([]);
        setAllSessions([]);
      } finally {
        setLoading(false);
      }
    };

    loadAnalyticsData();
  }, [token, isAdmin]);

  // Get courses to display based on role
  const displayCourses = useMemo(() => {
    return isAdmin ? allCourses : studentCourses;
  }, [isAdmin, allCourses, studentCourses]);

  // Get enrolled course IDs (for non-admins)
  const enrolledCourseIds = useMemo(() => {
    return studentCourses.map((course) => course.id);
  }, [studentCourses]);

  // Filter sessions based on role
  const relevantSessions = useMemo(() => {
    if (isAdmin) {
      // Admins see all sessions
      return allSessions;
    }

    // Non-admins see sessions for enrolled courses OR sessions where they have attendance
    return allSessions.filter((session) => {
      // Include if session is for an enrolled course
      const isEnrolledCourse =
        session.courseId && enrolledCourseIds.includes(session.courseId);

      // Also include if user has an attendance record in this session
      const hasUserAttendance =
        studentData?.id &&
        session.attendances?.some((a) => a.userId === studentData.id);

      return isEnrolledCourse || hasUserAttendance;
    });
  }, [allSessions, enrolledCourseIds, isAdmin, studentData?.id]);

  // Get attendance records based on role
  const attendanceRecords = useMemo((): AttendanceRecord[] => {
    if (isAdmin) {
      // Admins see all attendance records from all sessions
      const records: AttendanceRecord[] = [];
      relevantSessions.forEach((session) => {
        session.attendances?.forEach((attendance) => {
          records.push({ ...attendance, session });
        });
      });
      return records;
    } else {
      // Non-admins see only their own attendance records
      if (!studentData?.id) return [];
      const records: AttendanceRecord[] = [];
      relevantSessions.forEach((session) => {
        const studentAttendance = session.attendances?.find(
          (a) => a.userId === studentData.id,
        );
        if (studentAttendance) {
          records.push({ ...studentAttendance, session });
        }
      });
      return records;
    }
  }, [relevantSessions, studentData?.id, isAdmin]);

  // Filter data based on time period
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

  // Filter attendance records by time period
  const filteredRecords = useMemo(() => {
    const { startDate, endDate } = getDateRange;
    return attendanceRecords.filter((record) => {
      const sessionDate = new Date(record.session.startTime);
      return sessionDate >= startDate && sessionDate <= endDate;
    });
  }, [attendanceRecords, getDateRange]);

  // Filter sessions by time period (closed sessions only for stats)
  // Include all session types that count for attendance
  const filteredSessions = useMemo(() => {
    const { startDate, endDate } = getDateRange;
    return relevantSessions.filter((session) => {
      const sessionDate = new Date(session.startTime);
      const isInDateRange = sessionDate >= startDate && sessionDate <= endDate;

      // Include closed sessions and open sessions that have attendance records
      const hasAttendanceRelevance =
        session.status === SessionStatus.CLOSED ||
        (session.status === SessionStatus.OPEN &&
          session.attendances &&
          session.attendances.length > 0);

      // Include all session types that require attendance tracking
      const isAttendanceSessionType =
        session.type === SessionType.CLASS ||
        session.type === SessionType.EXAM ||
        session.type === SessionType.LAB ||
        session.type === SessionType.TUTORIAL;

      return isInDateRange && hasAttendanceRelevance && isAttendanceSessionType;
    });
  }, [relevantSessions, getDateRange]);

  // Calculate stats based on role
  const stats = useMemo(() => {
    if (isAdmin) {
      // System-wide statistics for admins
      let totalAttendances = 0;
      let totalPresent = 0;
      let totalLate = 0;
      let totalAbsent = 0;
      let totalExpected = 0;

      filteredSessions.forEach((session) => {
        const sessionAttendances = session.attendances || [];
        const expectedCount =
          session.course?._count?.enrollments ||
          session.course?.enrollments?.length ||
          0;
        totalExpected += expectedCount;

        sessionAttendances.forEach((a) => {
          totalAttendances++;
          // Only PRESENT (fully completed) counts as present
          if (a.status === AttendanceStatus.PRESENT) {
            totalPresent++;
          } else if (a.status === AttendanceStatus.CHECKED_IN) {
            // CHECKED_IN without checkout counts as absent
            totalAbsent++;
          } else if (a.status === AttendanceStatus.LATE) {
            totalLate++;
          } else if (a.status === AttendanceStatus.ABSENT) {
            totalAbsent++;
          }
        });

        // Count missing attendances as absent
        if (expectedCount > sessionAttendances.length) {
          totalAbsent += expectedCount - sessionAttendances.length;
        }
      });

      const total = totalExpected > 0 ? totalExpected : totalAttendances;
      const rate =
        total > 0 ? Math.round(((totalPresent + totalLate) / total) * 100) : 0;

      return {
        attendanceRate: rate,
        totalCheckins: totalPresent + totalLate,
        lateArrivals: totalLate,
        absentCount: totalAbsent,
        totalSessions: filteredSessions.length,
      };
    } else {
      // Personal statistics for non-admins
      if (!studentData?.id) {
        return {
          attendanceRate: 0,
          totalCheckins: 0,
          lateArrivals: 0,
          absentCount: 0,
        };
      }

      let attended = 0;
      let late = 0;
      let absent = 0;

      filteredSessions.forEach((session) => {
        const attendance = session.attendances?.find(
          (a) => a.userId === studentData.id,
        );
        if (attendance) {
          // Only PRESENT (fully completed) counts as attended
          if (attendance.status === AttendanceStatus.PRESENT) {
            attended++;
          } else if (attendance.status === AttendanceStatus.CHECKED_IN) {
            // CHECKED_IN without checkout counts as absent
            absent++;
          } else if (attendance.status === AttendanceStatus.LATE) {
            late++;
          } else if (attendance.status === AttendanceStatus.ABSENT) {
            absent++;
          }
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
  }, [filteredSessions, studentData?.id, isAdmin]);

  // Calculate attendance trend data (daily breakdown)
  const attendanceTrendData = useMemo(() => {
    const { startDate, endDate } = getDateRange;
    const days: {
      day: string;
      present: number;
      late: number;
      absent: number;
    }[] = [];

    // Generate labels based on time period
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
      // For month/quarter, use week numbers or dates
      const diffDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const interval = timePeriod === "month" ? 7 : 14; // Weekly for month, bi-weekly for quarter

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

    // Populate with actual data
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
        // Only PRESENT (fully completed) counts as present
        if (record.status === AttendanceStatus.PRESENT) {
          days[dayIndex].present++;
        } else if (record.status === AttendanceStatus.CHECKED_IN) {
          // CHECKED_IN without checkout counts as absent
          days[dayIndex].absent++;
        } else if (record.status === AttendanceStatus.LATE) {
          days[dayIndex].late++;
        } else if (record.status === AttendanceStatus.ABSENT) {
          days[dayIndex].absent++;
        }
      }
    });

    return days;
  }, [filteredRecords, getDateRange, timePeriod]);

  // Calculate course distribution data based on role
  const courseDistributionData = useMemo(() => {
    if (isAdmin) {
      // System-wide course distribution for admins
      return displayCourses
        .map((course, index) => {
          const courseSessions = filteredSessions.filter(
            (s) => s.courseId === course.id,
          );
          let totalAttendance = 0;

          courseSessions.forEach((session) => {
            session.attendances?.forEach((a) => {
              // Only PRESENT (fully completed) and LATE count as attended
              if (
                a.status === AttendanceStatus.PRESENT ||
                a.status === AttendanceStatus.LATE
              ) {
                totalAttendance++;
              }
              // CHECKED_IN without checkout doesn't count
            });
          });

          return {
            name: course.code || course.title,
            value: totalAttendance,
            color: CHART_COLORS[index % CHART_COLORS.length],
          };
        })
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 8); // Top 8 courses
    } else {
      // Personal course distribution for non-admins
      if (!studentData?.id) return [];

      return displayCourses
        .map((course, index) => {
          const courseSessions = filteredSessions.filter(
            (s) => s.courseId === course.id,
          );
          let attended = 0;

          courseSessions.forEach((session) => {
            const attendance = session.attendances?.find(
              (a) => a.userId === studentData.id,
            );
            // Only PRESENT (fully completed) and LATE count as attended
            if (
              attendance &&
              (attendance.status === AttendanceStatus.PRESENT ||
                attendance.status === AttendanceStatus.LATE)
            ) {
              attended++;
            }
            // CHECKED_IN without checkout doesn't count
          });

          return {
            name: course.code || course.title,
            value: attended,
            color: CHART_COLORS[index % CHART_COLORS.length],
          };
        })
        .filter((item) => item.value > 0);
    }
  }, [displayCourses, filteredSessions, studentData?.id, isAdmin]);

  // Calculate hourly check-in distribution
  const hourlyDistributionData = useMemo(() => {
    const hours: { hour: string; count: number }[] = [];

    // Initialize hours (7 AM to 8 PM)
    for (let i = 7; i <= 20; i++) {
      const hour = i > 12 ? `${i - 12}PM` : i === 12 ? "12PM" : `${i}AM`;
      hours.push({ hour, count: 0 });
    }

    // Count check-ins by hour
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

  // Stat cards configuration based on role
  const statCards = isAdmin
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

  // Check if there's any data
  const hasData = filteredSessions.length > 0 || filteredRecords.length > 0;

  // Show loading state
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
              : "Your personal attendance insights and reports"}
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
          {/* <Button variant="outline" disabled={!hasData}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button> */}
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

        {/* Course Distribution */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">
            By Course
          </h2>
          {courseDistributionData.length > 0 ? (
            <div className="h-[300px] flex items-center">
              <ResponsiveContainer width="60%" height="100%">
                <PieChart>
                  <Pie
                    data={courseDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {courseDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(222, 47%, 10%)",
                      border: "1px solid hsl(217, 33%, 17%)",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {courseDistributionData.map((course, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: course.color }}
                    />
                    <span className="text-muted-foreground truncate">
                      {course.name}
                    </span>
                    <span className="font-medium text-foreground ml-auto">
                      {course.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-center">
              <PieChartIcon className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-base font-medium text-foreground mb-2">
                No course data
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {isAdmin
                  ? "Course distribution will appear here once sessions have attendance records"
                  : "Course distribution will appear here once you attend sessions"}
              </p>
            </div>
          )}
        </div>

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
