import { useState, useMemo } from "react";
import {
  BookOpen,
  Users,
  CalendarClock,
  TrendingUp,
  CheckCircle2,
  Clock,
  UserX,
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
import { mockSessions, mockEarlyArrivals } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Course {
  id: string;
  name: string;
  department: string;
}

const LecturerDashboard = () => {
  const { user } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState<string>("all");

  // Mock courses taught by lecturer - replace with actual API data
  const taughtCourses: Course[] = [
    {
      id: "COURSE001",
      name: "Introduction to Computer Science",
      department: "CSC",
    },
    {
      id: "COURSE002",
      name: "Data Structures and Algorithms",
      department: "CSC",
    },
    {
      id: "COURSE003",
      name: "Web Development Fundamentals",
      department: "CSC",
    },
  ];

  // Filter sessions based on course selection
  const filteredSessions = useMemo(() => {
    if (selectedCourse === "all") {
      return mockSessions.filter(
        (s) =>
          taughtCourses.some((c) => c.id === s.courseId) && s.type === "class",
      );
    }
    return mockSessions.filter(
      (s) => s.courseId === selectedCourse && s.type === "class",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourse]);

  // Calculate statistics
  const totalSessions = filteredSessions.length;
  const totalStudentsEnrolled =
    selectedCourse === "all"
      ? 120 // Mock data - replace with actual
      : 40; // Mock data - replace with actual

  const averageAttendance = Math.round(
    filteredSessions.reduce((acc, s) => acc + s.presentCount, 0) /
      (filteredSessions.length || 1),
  );

  const lateArrivals = Math.floor(filteredSessions.length * 0.08);
  const absentees = totalStudentsEnrolled - averageAttendance;

  // Course statistics for breakdown
  const courseStats = useMemo(() => {
    const stats: {
      [courseId: string]: {
        course: Course;
        sessions: number;
        totalEnrolled: number;
        avgAttendance: number;
      };
    } = {};

    taughtCourses.forEach((course) => {
      const courseSessions = mockSessions.filter(
        (s) => s.courseId === course.id && s.type === "class",
      );
      stats[course.id] = {
        course,
        sessions: courseSessions.length,
        totalEnrolled: 40, // Mock data
        avgAttendance: Math.round(
          courseSessions.reduce((acc, s) => acc + s.presentCount, 0) /
            (courseSessions.length || 1),
        ),
      };
    });

    return stats;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = user?.name.split(" ")[0] || "User";
  const welcomeMessage = `Welcome back ${firstName}, here's the attendance overview`;

  const activeSessions = mockSessions.filter(
    (s) => s.status === "active" || s.status === "scheduled",
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">{welcomeMessage}</p>
      </div>

      {/* Course Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Filter by Course:</label>
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {taughtCourses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.name} ({course.department})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Students"
          value={totalStudentsEnrolled}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Active Sessions"
          value={totalSessions}
          icon={CalendarClock}
          variant="primary"
        />
        <StatCard
          title="Today's Attendance"
          value={averageAttendance}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Attendance Rate"
          value={`${Math.round((averageAttendance / totalStudentsEnrolled) * 100)}%`}
          icon={CheckCircle2}
          trend={{ value: 2.4, isPositive: true }}
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Weekly Attendance
              </h2>
              <p className="text-sm text-muted-foreground">
                Attendance trends for this week
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-muted-foreground">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span className="text-muted-foreground">Late</span>
              </div>
            </div>
          </div>
          <AttendanceChart />
        </div>

        {/* Courses Taught Summary */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Courses Overview
            </h2>
            <BookOpen className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="space-y-4 max-h-[360px] overflow-y-auto scrollbar-hide">
            {taughtCourses.map((course) => {
              const stats = courseStats[course.id];
              return (
                <div
                  key={course.id}
                  className="p-3 rounded-lg border border-border"
                >
                  <p className="text-sm font-medium">{course.name}</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    {course.department}
                  </p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Sessions:</span>
                      <Badge variant="outline">{stats?.sessions}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Enrolled:</span>
                      <Badge variant="outline">{stats?.totalEnrolled}</Badge>
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
                        {stats?.avgAttendance}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Early Arrivals Rewards Section */}
      <EarlyArrivalsCard arrivals={mockEarlyArrivals} />

      {/* Active Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Active & Upcoming Sessions
            </h2>
            <p className="text-sm text-muted-foreground">
              {activeSessions.length} sessions currently running or scheduled
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeSessions.map((session) => (
            <ActiveSessionCard key={session.id} session={session} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LecturerDashboard;
