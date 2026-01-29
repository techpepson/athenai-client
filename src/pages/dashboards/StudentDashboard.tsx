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
  Loader2,
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
import { mockSessions, mockEarlyArrivals } from "@/data/mockData";

const StudentDashboard = () => {
  const { user } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [studentCourses, setStudentCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user is a course rep based on role
  const isCourseRep = user?.role === Role.REP;

  // Load student's enrolled courses
  useEffect(() => {
    const loadCourses = async () => {
      setLoading(true);
      try {
        const response = await coursesService.getStudentCourses();
        if (response.success && response.data?.data) {
          setStudentCourses(response.data.data);
        } else {
          setStudentCourses([]);
        }
      } catch {
        setStudentCourses([]);
      } finally {
        setLoading(false);
      }
    };
    loadCourses();
  }, []);

  // Filter sessions based on course selection
  const filteredSessions = useMemo(() => {
    if (selectedCourse === "all") {
      return mockSessions.filter((s) => s.type === "class");
    }
    return mockSessions.filter(
      (s) => s.courseId === selectedCourse && s.type === "class",
    );
  }, [selectedCourse]);

  // Calculate statistics
  const totalSessions = filteredSessions.length;
  const attendedSessions = Math.floor(filteredSessions.length * 0.92); // 92% attendance
  const missedSessions = totalSessions - attendedSessions;
  const attendancePercentage = totalSessions
    ? Math.round((attendedSessions / totalSessions) * 100)
    : 0;

  // Group sessions by course for breakdown
  const courseStats = useMemo(() => {
    const stats: { [courseId: string]: { course: Course; count: number } } = {};

    studentCourses.forEach((course) => {
      const count = mockSessions.filter(
        (s) => s.courseId === course.id && s.type === "class",
      ).length;
      stats[course.id] = { course, count };
    });

    return stats;
  }, [studentCourses]);

  const firstName = user?.name?.split(" ")[0] || "User";
  const welcomeMessage = `Welcome back ${firstName}!, here's your attendance overview`;

  const activeSessions = mockSessions.filter(
    (s) => s.status === "active" || s.status === "scheduled",
  );

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
          value={totalSessions}
          icon={CalendarClock}
          variant="primary"
        />
        <StatCard
          title="Sessions Attended"
          value={attendedSessions}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Sessions Missed"
          value={missedSessions}
          icon={UserX}
          variant="destructive"
        />
        <StatCard
          title="Attendance Rate"
          value={`${attendancePercentage}%`}
          icon={CheckCircle2}
          trend={{
            value: attendancePercentage > 85 ? 2.4 : -3,
            isPositive: attendancePercentage > 85,
          }}
        />
        <StatCard
          title="Late Arrivals"
          value={Math.floor(totalSessions * 0.05)}
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
          </div>
          <AttendanceChart />
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
              studentCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">{course.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {course.code}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {courseStats[course.id]?.count || 0} sessions
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Early Arrivals Rewards Section */}
      <EarlyArrivalsCard arrivals={mockEarlyArrivals} />

      {/* Active Sessions */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              Active & Upcoming Sessions
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {activeSessions.length} sessions currently running or scheduled
            </p>
          </div>
        </div>
        {activeSessions.length === 0 ? (
          <div className="bg-card rounded-lg sm:rounded-xl border border-border p-8 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No active sessions
            </h3>
            <p className="text-sm text-muted-foreground">
              There are no sessions currently running or scheduled
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {activeSessions.map((session) => (
              <ActiveSessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
