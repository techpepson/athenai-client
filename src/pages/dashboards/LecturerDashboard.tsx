import { useState, useMemo, useEffect } from "react";
import {
  BookOpen,
  Users,
  CalendarClock,
  CheckCircle2,
  Clock,
  UserX,
  CalendarX2,
  Calendar,
  BarChart3,
  Award,
  Loader2,
  BookX,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Session,
  SessionStatus,
  SessionType,
  SessionMode,
  AttendanceStatus,
  getCreatorSessions,
} from "@/services/sessions.service";
import { coursesService, Course } from "@/services/courses.services";

export interface Lecturer {
  id: string;
  userId: string;
  staffNo?: string;
  hourlyRate: number;
  creditHours: number;
}

export interface CourseEnrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt?: string;
}

export interface CourseWithEnrollments extends Course {
  enrollments?: CourseEnrollment[];
}

const LecturerDashboard = () => {
  const { user, token } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [taughtCourses, setTaughtCourses] = useState<CourseWithEnrollments[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  // Fetch sessions and courses from API
  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch sessions and courses in parallel
        const [sessionsResponse, coursesResponse] = await Promise.all([
          getCreatorSessions(token),
          coursesService.getLecturerCourses(),
        ]);

        if (sessionsResponse.success && sessionsResponse.data?.sessions) {
          setSessions(sessionsResponse.data.sessions);
        } else {
          setSessions([]);
        }

        console.log("Courses API Response:", coursesResponse);
        console.log("coursesResponse.data:", coursesResponse.data);

        // Backend returns { success: true, data: courses }
        // API wrapper returns { success, data: { success, data: courses }, ... }
        // So we need coursesResponse.data?.data for the courses array
        if (coursesResponse.success && coursesResponse.data?.data) {
          console.log("Setting courses:", coursesResponse.data.data);
          setTaughtCourses(
            coursesResponse.data.data as CourseWithEnrollments[],
          );
        } else if (
          coursesResponse.success &&
          Array.isArray(coursesResponse.data)
        ) {
          // Fallback: if data is directly an array
          console.log("Setting courses (direct array):", coursesResponse.data);
          setTaughtCourses(coursesResponse.data as CourseWithEnrollments[]);
        } else {
          console.log("No courses found in response");
          setTaughtCourses([]);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setSessions([]);
        setTaughtCourses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Filter sessions based on course selection
  const filteredSessions = useMemo(() => {
    if (selectedCourse === "all") {
      return sessions.filter(
        (s) =>
          taughtCourses.some((c) => c.id === s.courseId) &&
          s.type === SessionType.CLASS,
      );
    }
    return sessions.filter(
      (s) => s.courseId === selectedCourse && s.type === SessionType.CLASS,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourse, sessions]);

  // Calculate real statistics from data
  const totalSessions = filteredSessions.length;

  // Get actual total students enrolled across selected courses
  const totalStudentsEnrolled = useMemo(() => {
    if (selectedCourse === "all") {
      // Sum unique students across all taught courses
      const uniqueStudentIds = new Set<string>();
      taughtCourses.forEach((course) => {
        course.enrollments?.forEach((enrollment) => {
          uniqueStudentIds.add(enrollment.studentId);
        });
      });
      return uniqueStudentIds.size;
    }
    // Get students for selected course
    const course = taughtCourses.find((c) => c.id === selectedCourse);
    return course?.enrollments?.length || 0;
  }, [selectedCourse, taughtCourses]);

  // Calculate actual attendance statistics from sessions
  const attendanceStats = useMemo(() => {
    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;
    let totalCheckedIn = 0;

    filteredSessions.forEach((session) => {
      session.attendances?.forEach((attendance) => {
        switch (attendance.status) {
          case AttendanceStatus.PRESENT:
            totalPresent++;
            break;
          case AttendanceStatus.CHECKED_IN:
            // CHECKED_IN is separate - not counted as present until checkout
            totalCheckedIn++;
            break;
          case AttendanceStatus.LATE:
            totalLate++;
            break;
          case AttendanceStatus.ABSENT:
            totalAbsent++;
            break;
        }
      });
    });

    return {
      // Only PRESENT counts as fully present (not CHECKED_IN)
      present: totalPresent,
      checkedIn: totalCheckedIn,
      late: totalLate,
      absent: totalAbsent,
      total: totalPresent + totalCheckedIn + totalLate + totalAbsent,
    };
  }, [filteredSessions]);

  // Calculate average attendance per session
  const averageAttendance =
    totalSessions > 0 ? Math.round(attendanceStats.present / totalSessions) : 0;

  // Calculate attendance rate
  const attendanceRate = useMemo(() => {
    if (attendanceStats.total === 0) return 0;
    return Math.round(
      ((attendanceStats.present + attendanceStats.late) /
        attendanceStats.total) *
        100,
    );
  }, [attendanceStats]);

  const lateArrivals = attendanceStats.late;
  const absentees = attendanceStats.absent;

  // Course statistics for breakdown - using real data
  const courseStats = useMemo(() => {
    const stats: {
      [courseId: string]: {
        course: CourseWithEnrollments;
        sessions: number;
        totalEnrolled: number;
        avgAttendance: number;
        presentCount: number;
        lateCount: number;
        absentCount: number;
      };
    } = {};

    taughtCourses.forEach((course) => {
      const courseSessions = sessions.filter(
        (s) => s.courseId === course.id && s.type === SessionType.CLASS,
      );

      // Calculate real attendance for this course
      let totalPresent = 0;
      let totalLate = 0;
      let totalAbsent = 0;

      courseSessions.forEach((session) => {
        session.attendances?.forEach((attendance) => {
          // Only PRESENT (fully completed) counts as present
          if (attendance.status === AttendanceStatus.PRESENT) {
            totalPresent++;
          } else if (attendance.status === AttendanceStatus.CHECKED_IN) {
            // CHECKED_IN without checkout doesn't count as fully present
            totalAbsent++;
          } else if (attendance.status === AttendanceStatus.LATE) {
            totalLate++;
          } else if (attendance.status === AttendanceStatus.ABSENT) {
            totalAbsent++;
          }
        });
      });

      stats[course.id] = {
        course,
        sessions: courseSessions.length,
        totalEnrolled: course.enrollments?.length || 0,
        avgAttendance:
          courseSessions.length > 0
            ? Math.round(totalPresent / courseSessions.length)
            : 0,
        presentCount: totalPresent,
        lateCount: totalLate,
        absentCount: totalAbsent,
      };
    });

    return stats;
  }, [sessions, taughtCourses]);

  const firstName = user?.name.split(" ")[0] || "User";
  const welcomeMessage = `Welcome back ${firstName}, here's the attendance overview`;

  const activeSessions = sessions.filter(
    (s) =>
      s.status === SessionStatus.OPEN || s.status === SessionStatus.SCHEDULED,
  );

  // Early arrivals - empty for now until API is available
  const earlyArrivals: Array<{
    id: string;
    memberId: string;
    memberName: string;
    photoUrl?: string;
    department: string;
    checkInTime: Date;
    scheduledTime: Date;
    minutesEarly: number;
  }> = [];

  // Map sessions to AttendanceSession format for ActiveSessionCard compatibility
  const mappedActiveSessions = activeSessions.map((session) => ({
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
    status:
      session.status === SessionStatus.OPEN
        ? ("active" as const)
        : session.status === SessionStatus.SCHEDULED
          ? ("scheduled" as const)
          : ("completed" as const),
    location: session.location,
    expectedCount: session.attendances?.length || 0,
    // Only count PRESENT (fully completed) as present
    presentCount:
      session.attendances?.filter((a) => a.status === AttendanceStatus.PRESENT)
        .length || 0,
    courseId: session.courseId,
    courseName: session.course?.title,
    createdBy: session.createdBy?.id,
  }));

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
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          Dashboard
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          {welcomeMessage}
        </p>
      </div>

      {/* Course Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <label className="text-sm font-medium">Filter by Course:</label>
        <Select
          value={selectedCourse}
          onValueChange={setSelectedCourse}
          disabled={taughtCourses.length === 0}
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue
              placeholder={
                taughtCourses.length === 0
                  ? "No courses available"
                  : "Select a course"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {taughtCourses.map((course) => (
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
          title="Total Students"
          value={totalStudentsEnrolled}
          icon={Users}
          trend={
            totalStudentsEnrolled > 0
              ? { value: totalStudentsEnrolled, isPositive: true }
              : undefined
          }
        />
        <StatCard
          title="Total Sessions"
          value={totalSessions}
          icon={CalendarClock}
          variant="primary"
        />
        <StatCard
          title="Present Today"
          value={attendanceStats.present}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Attendance Rate"
          value={`${attendanceRate}%`}
          icon={CheckCircle2}
          trend={
            attendanceRate > 0
              ? { value: attendanceRate, isPositive: attendanceRate >= 70 }
              : undefined
          }
        />
        <StatCard
          title="Late Arrivals"
          value={lateArrivals}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Absentees"
          value={absentees}
          icon={UserX}
          variant="destructive"
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
            {totalSessions > 0 && (
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
          {totalSessions > 0 ? (
            <AttendanceChart />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-base font-medium text-foreground mb-2">
                No attendance data yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Your attendance chart will appear here once you create and run
                sessions
              </p>
            </div>
          )}
        </div>

        {/* Courses Taught Summary */}
        <div className="bg-card rounded-lg sm:rounded-xl border border-border p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              Courses Overview
            </h2>
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          </div>
          <div className="space-y-3 sm:space-y-4 max-h-[280px] sm:max-h-[360px] overflow-y-auto scrollbar-hide">
            {taughtCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BookX className="w-10 h-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No courses assigned
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  You haven't been assigned to any courses yet
                </p>
              </div>
            ) : (
              taughtCourses.map((course) => {
                const stats = courseStats[course.id];
                return (
                  <div
                    key={course.id}
                    className="p-3 rounded-lg border border-border"
                  >
                    <p className="text-sm font-medium">{course.title}</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {course.code}
                    </p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Sessions:</span>
                        <Badge variant="outline">{stats?.sessions || 0}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Enrolled:</span>
                        <Badge variant="outline">
                          {stats?.totalEnrolled || 0}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Attendance:</span>
                        <Badge
                          variant={
                            (stats?.avgAttendance || 0) > 30
                              ? "default"
                              : "secondary"
                          }
                        >
                          {stats?.avgAttendance || 0}
                        </Badge>
                      </div>
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
              Early arrivals will be displayed here once students start
              attending your sessions
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
              {activeSessions.length > 0
                ? `${activeSessions.length} session${activeSessions.length !== 1 ? "s" : ""} currently running or scheduled`
                : "No sessions available"}
            </p>
          </div>
        </div>
        {activeSessions.length === 0 ? (
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
              You don't have any sessions currently running or scheduled. Create
              a new session to start tracking attendance.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Go to Sessions page to create a new session</span>
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

export default LecturerDashboard;
