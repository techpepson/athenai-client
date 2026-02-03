import { useState, useMemo, useEffect } from "react";
import {
  GraduationCap,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  UserX,
  BookX,
  Calendar,
  CalendarX2,
  Loader2,
  BarChart3,
  Award,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/StatCard";
import { AttendanceChart } from "@/components/dashboard/AttendanceChart";
import { ActiveSessionCard } from "@/components/dashboard/ActiveSessionCard";
import { EarlyArrivalsCard } from "@/components/dashboard/EarlyArrivalsCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/enums/enums";
import { coursesService, Course } from "@/services/courses.services";
import {
  Session,
  SessionStatus,
  SessionType,
  SessionMode,
  AttendanceStatus,
  getAllSessionsAdmin,
  Attendance,
} from "@/services/sessions.service";
import { usersServices } from "@/services/users.services";
import { IUser, IStudent } from "@/interface/user.interface";
import {
  getUserAttendance,
  AttendanceRecord,
} from "@/services/attendance.services";

// Interface for weekly attendance data
interface WeeklyAttendanceData {
  day: string;
  present: number;
  late: number;
  absent: number;
}

const StudentDashboard = () => {
  const { user, token } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [studentCourses, setStudentCourses] = useState<Course[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [userAttendanceRecords, setUserAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [studentData, setStudentData] = useState<
    (IUser & { student?: IStudent | null }) | null
  >(null);
  const [loading, setLoading] = useState(true);

  // Check if user is a course rep based on role
  const isCourseRep = user?.role === Role.REP;

  // Load student data, courses, and sessions
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch student details using getUserById
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

        // Fetch all sessions (admin endpoint gives all sessions with attendances)
        const sessionsResponse = await getAllSessionsAdmin(token);
        if (sessionsResponse.success && sessionsResponse.data?.data) {
          setAllSessions(sessionsResponse.data.data);
        } else {
          setAllSessions([]);
        }

        // Fetch user's own attendance records directly
        const attendanceResponse = await getUserAttendance(token);
        if (attendanceResponse.success && attendanceResponse.data) {
          setUserAttendanceRecords(attendanceResponse.data);
        } else {
          setUserAttendanceRecords([]);
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        setStudentCourses([]);
        setAllSessions([]);
        setUserAttendanceRecords([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [token]);

  // Get student's enrolled course IDs
  const enrolledCourseIds = useMemo(() => {
    return studentCourses.map((course) => course.id);
  }, [studentCourses]);

  // Filter sessions that belong to courses the student is enrolled in
  const studentSessions = useMemo(() => {
    return allSessions.filter(
      (session) =>
        session.courseId && enrolledCourseIds.includes(session.courseId),
    );
  }, [allSessions, enrolledCourseIds]);

  // Get all attendance records for this student across all sessions
  const studentAttendanceRecords = useMemo(() => {
    if (!studentData?.id) return [];

    const records: (Attendance & { session: Session })[] = [];
    studentSessions.forEach((session) => {
      const studentAttendance = session.attendances?.find(
        (a) => a.userId === studentData.id,
      );
      if (studentAttendance) {
        records.push({ ...studentAttendance, session });
      }
    });
    return records;
  }, [studentSessions, studentData?.id]);

  // Filter sessions based on course selection
  const filteredSessions = useMemo(() => {
    const baseSessions =
      selectedCourse === "all"
        ? studentSessions
        : studentSessions.filter((s) => s.courseId === selectedCourse);

    return baseSessions.filter((s) => s.type === SessionType.CLASS);
  }, [selectedCourse, studentSessions]);

  // Calculate attendance statistics
  const attendanceStats = useMemo(() => {
    if (!studentData?.id) {
      return { attended: 0, late: 0, absent: 0, total: 0, rate: 0 };
    }

    let attended = 0;
    let late = 0;
    let absent = 0;

    filteredSessions.forEach((session) => {
      // Only count completed/closed sessions for attendance stats
      if (session.status === SessionStatus.CLOSED) {
        const attendance = session.attendances?.find(
          (a) => a.userId === studentData.id,
        );

        if (attendance) {
          // Only PRESENT (checked in + checked out) counts as fully attended
          if (attendance.status === AttendanceStatus.PRESENT) {
            attended++;
          } else if (attendance.status === AttendanceStatus.CHECKED_IN) {
            // CHECKED_IN without checkout is treated as incomplete/absent for closed sessions
            absent++;
          } else if (attendance.status === AttendanceStatus.LATE) {
            late++;
          } else if (attendance.status === AttendanceStatus.ABSENT) {
            absent++;
          }
        } else {
          // No attendance record means absent
          absent++;
        }
      }
    });

    const total = attended + late + absent;
    const rate = total > 0 ? Math.round(((attended + late) / total) * 100) : 0;

    return { attended, late, absent, total, rate };
  }, [filteredSessions, studentData?.id]);

  // Calculate weekly attendance data for chart using directly fetched attendance records
  const weeklyAttendance = useMemo((): WeeklyAttendanceData[] => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);

    return days.map((day, index) => {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + index);
      const nextDay = new Date(dayDate);
      nextDay.setDate(dayDate.getDate() + 1);

      let present = 0;
      let late = 0;
      let absent = 0;

      // Use directly fetched user attendance records
      userAttendanceRecords.forEach((record) => {
        // Get the session start time from the record's session data
        const sessionStartTime =
          record.session?.startTime || record.checkInTime;
        if (!sessionStartTime) return;

        const sessionDate = new Date(sessionStartTime);
        if (sessionDate >= dayDate && sessionDate < nextDay) {
          // For chart display: PRESENT and CHECKED_IN both show as "present"
          // (they attended, checkout just confirms they stayed)
          if (
            record.status === AttendanceStatus.PRESENT ||
            record.status === "PRESENT" ||
            record.status === AttendanceStatus.CHECKED_IN ||
            record.status === "CHECKED_IN"
          ) {
            present++;
          } else if (
            record.status === AttendanceStatus.LATE ||
            record.status === "LATE"
          ) {
            late++;
          } else if (
            record.status === AttendanceStatus.ABSENT ||
            record.status === "ABSENT"
          ) {
            absent++;
          }
        }
      });

      return { day, present, late, absent };
    });
  }, [userAttendanceRecords]);

  // Group sessions by course for breakdown with attendance stats
  const courseStats = useMemo(() => {
    const stats: {
      [courseId: string]: {
        course: Course;
        totalSessions: number;
        attended: number;
        late: number;
        absent: number;
        rate: number;
      };
    } = {};

    studentCourses.forEach((course) => {
      const courseSessions = studentSessions.filter(
        (s) =>
          s.courseId === course.id &&
          s.type === SessionType.CLASS &&
          s.status === SessionStatus.CLOSED,
      );

      let attended = 0;
      let late = 0;
      let absent = 0;

      courseSessions.forEach((session) => {
        const attendance = session.attendances?.find(
          (a) => a.userId === studentData?.id,
        );

        if (attendance) {
          // Only PRESENT (checked in + checked out) counts as attended
          if (attendance.status === AttendanceStatus.PRESENT) {
            attended++;
          } else if (attendance.status === AttendanceStatus.CHECKED_IN) {
            // CHECKED_IN without checkout is incomplete
            absent++;
          } else if (attendance.status === AttendanceStatus.LATE) {
            late++;
          } else {
            absent++;
          }
        } else {
          absent++;
        }
      });

      const total = attended + late + absent;
      const rate =
        total > 0 ? Math.round(((attended + late) / total) * 100) : 0;

      stats[course.id] = {
        course,
        totalSessions: courseSessions.length,
        attended,
        late,
        absent,
        rate,
      };
    });

    return stats;
  }, [studentCourses, studentSessions, studentData?.id]);

  // Get active and upcoming sessions for enrolled courses
  const upcomingAndActiveSessions = useMemo(() => {
    const now = new Date();

    return studentSessions
      .filter((session) => {
        // Check if session is OPEN (active) or SCHEDULED
        if (session.status === SessionStatus.OPEN) {
          return true;
        }

        if (session.status === SessionStatus.SCHEDULED) {
          // For scheduled sessions, check if start time is in the future
          const startTime = new Date(session.startTime);
          return startTime > now;
        }

        return false;
      })
      .sort((a, b) => {
        // Sort by start time (earliest first)
        return (
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
      });
  }, [studentSessions]);

  const firstName =
    user?.name?.split(" ")[0] || studentData?.name?.split(" ")[0] || "User";
  const welcomeMessage = `Welcome back ${firstName}!, here's your attendance overview`;

  // Early arrivals - calculate from attendance records
  const earlyArrivals = useMemo(() => {
    return studentAttendanceRecords
      .filter((record) => {
        if (!record.checkInTime) return false;
        const checkIn = new Date(record.checkInTime);
        const sessionStart = new Date(record.session.startTime);
        return checkIn < sessionStart;
      })
      .map((record) => {
        const checkIn = new Date(record.checkInTime!);
        const sessionStart = new Date(record.session.startTime);
        const minutesEarly = Math.round(
          (sessionStart.getTime() - checkIn.getTime()) / 60000,
        );

        return {
          id: record.id,
          memberId: studentData?.id || "",
          memberName: studentData?.name || "Unknown",
          photoUrl: studentData?.profilePicture || undefined,
          department: record.session.course?.title || "Unknown",
          checkInTime: checkIn,
          scheduledTime: sessionStart,
          minutesEarly,
        };
      })
      .sort((a, b) => b.minutesEarly - a.minutesEarly)
      .slice(0, 5);
  }, [studentAttendanceRecords, studentData]);

  // Map sessions to AttendanceSession format for ActiveSessionCard compatibility
  const mappedActiveSessions = upcomingAndActiveSessions.map((session) => {
    const now = new Date();
    const startTime = new Date(session.startTime);
    const isScheduled =
      session.status === SessionStatus.SCHEDULED && startTime > now;

    return {
      id: session.id,
      name: session.name,
      type: session.type.toLowerCase() as "class" | "exam" | "event" | "shift",
      attendanceType:
        session.mode === SessionMode.CHECK_IN
          ? ("checkin" as const)
          : ("checkout" as const),
      department: session.course?.title,
      startTime: new Date(session.startTime),
      endTime: new Date(session.endTime),
      status: isScheduled
        ? ("scheduled" as const)
        : session.status === SessionStatus.OPEN
          ? ("active" as const)
          : ("completed" as const),
      location: session.location,
      expectedCount: session.attendances?.length || 0,
      // Only count PRESENT (fully completed) as present
      presentCount:
        session.attendances?.filter(
          (a) => a.status === AttendanceStatus.PRESENT,
        ).length || 0,
      courseId: session.courseId,
      courseName: session.course?.title,
      createdBy: session.createdBy?.id,
    };
  });

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Dashboard
          </h1>
          {isCourseRep && (
            <Badge variant="secondary" className="gap-1 w-fit">
              <GraduationCap className="w-3 h-3" />
              Course Representative
            </Badge>
          )}
        </div>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          {welcomeMessage}
        </p>
      </div>

      {/* Course Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <label className="text-sm font-medium">Filter by Course:</label>
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Select a course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {studentCourses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.title} ({course.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
        <StatCard
          title="Total Sessions"
          value={attendanceStats.total}
          icon={CalendarClock}
          variant="primary"
        />
        <StatCard
          title="Sessions Attended"
          value={attendanceStats.attended}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Sessions Missed"
          value={attendanceStats.absent}
          icon={UserX}
          variant="destructive"
        />
        <StatCard
          title="Attendance Rate"
          value={`${attendanceStats.rate}%`}
          icon={CheckCircle2}
          trend={{
            value: attendanceStats.rate > 85 ? 2.4 : -3,
            isPositive: attendanceStats.rate > 85,
          }}
        />
        <StatCard
          title="Late Arrivals"
          value={attendanceStats.late}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Enrolled Courses"
          value={studentCourses.length}
          icon={BookOpen}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-card rounded-lg sm:rounded-xl border border-border p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                Weekly Attendance
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Attendance trends for this week
              </p>
            </div>
            {attendanceStats.total > 0 && (
              <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Present</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-warning" />
                  <span className="text-muted-foreground">Late</span>
                </div>
              </div>
            )}
          </div>
          {/* Show chart if there are any attendance records, not just closed sessions */}
          {userAttendanceRecords.length > 0 ||
          weeklyAttendance.some(
            (d) => d.present > 0 || d.late > 0 || d.absent > 0,
          ) ? (
            <AttendanceChart data={weeklyAttendance} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-base font-medium text-foreground mb-2">
                No attendance data yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Your attendance chart will appear here once you start attending
                sessions
              </p>
            </div>
          )}
        </div>

        {/* Course Breakdown */}
        <div className="bg-card rounded-lg sm:rounded-xl border border-border p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              Course Summary
            </h2>
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          </div>
          <div className="space-y-2 sm:space-y-3 max-h-[280px] sm:max-h-[360px] overflow-y-auto scrollbar-hide">
            {studentCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BookX className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No courses enrolled
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  You haven't enrolled in any courses yet
                </p>
              </div>
            ) : (
              studentCourses.map((course) => {
                const stats = courseStats[course.id];
                return (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {course.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {course.code}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {stats && stats.totalSessions > 0 && (
                        <Badge
                          variant={
                            stats.rate >= 80
                              ? "default"
                              : stats.rate >= 60
                                ? "secondary"
                                : "destructive"
                          }
                          className="text-xs"
                        >
                          {stats.rate}%
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {stats?.totalSessions || 0} sessions
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Early Arrivals Rewards Section */}
      {earlyArrivals.length > 0 ? (
        <EarlyArrivalsCard arrivals={earlyArrivals} />
      ) : (
        <div className="bg-card rounded-lg sm:rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                Early Arrivals
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Students who arrived early to sessions
              </p>
            </div>
            <Award className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Award className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-base font-medium text-foreground mb-2">
              No early arrivals yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Early arrivals will be displayed here. Arrive early to sessions to
              get recognized!
            </p>
          </div>
        </div>
      )}

      {/* Active Sessions */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              Active & Upcoming Sessions
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {upcomingAndActiveSessions.length > 0
                ? `${upcomingAndActiveSessions.length} session${upcomingAndActiveSessions.length !== 1 ? "s" : ""} currently running or scheduled`
                : "No sessions available"}
            </p>
          </div>
        </div>
        {upcomingAndActiveSessions.length === 0 ? (
          <div className="bg-card rounded-lg sm:rounded-xl border border-border border-dashed p-8 sm:p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-muted">
                <CalendarX2 className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No active sessions
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              There are no sessions currently running or scheduled for your
              enrolled courses. Sessions created by your lecturers or course
              representatives will appear here.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Check back later for upcoming sessions</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {mappedActiveSessions.map((session) => (
              <ActiveSessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
