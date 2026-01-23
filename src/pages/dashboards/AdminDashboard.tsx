import { useState, useMemo } from "react";
import {
  Users,
  BookOpen,
  TrendingUp,
  CalendarClock,
  BarChart3,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Course {
  id: string;
  name: string;
  department: string;
  totalStudents: number;
  totalSessions: number;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");

  // Mock courses data - replace with actual API
  const allCourses: Course[] = useMemo(
    () => [
      {
        id: "COURSE001",
        name: "Introduction to Computer Science",
        department: "CSC",
        totalStudents: 150,
        totalSessions: 24,
      },
      {
        id: "COURSE002",
        name: "Data Structures and Algorithms",
        department: "CSC",
        totalStudents: 120,
        totalSessions: 24,
      },
      {
        id: "COURSE003",
        name: "Web Development Fundamentals",
        department: "CSC",
        totalStudents: 95,
        totalSessions: 20,
      },
      {
        id: "COURSE004",
        name: "Database Systems",
        department: "CSC",
        totalStudents: 110,
        totalSessions: 24,
      },
      {
        id: "COURSE005",
        name: "Software Engineering Principles",
        department: "CSC",
        totalStudents: 100,
        totalSessions: 20,
      },
    ],
    [],
  );

  // Filter sessions based on course selection
  const filteredSessions = useMemo(() => {
    if (selectedCourse === "all") {
      return mockSessions.filter((s) => s.type === "class");
    }
    return mockSessions.filter(
      (s) => s.courseId === selectedCourse && s.type === "class",
    );
  }, [selectedCourse]);

  // Calculate overall statistics
  const totalMembers = allCourses.reduce(
    (acc, course) => acc + course.totalStudents,
    0,
  );
  const activeSessions = filteredSessions.filter(
    (s) => s.status === "active" || s.status === "scheduled",
  ).length;
  const todayAttendance = filteredSessions.reduce(
    (acc, s) => acc + s.presentCount,
    0,
  );
  const totalExpected = filteredSessions.reduce(
    (acc, s) => acc + s.expectedCount,
    0,
  );
  const attendanceRate =
    totalExpected > 0 ? Math.round((todayAttendance / totalExpected) * 100) : 0;
  const lateArrivals = Math.floor(filteredSessions.length * 0.08);
  const absentees = totalExpected - todayAttendance;

  // Course details for selected course or all courses
  const courseDetails = useMemo(() => {
    if (selectedCourse === "all") {
      return allCourses.map((course) => {
        const courseSessions = mockSessions.filter(
          (s) => s.courseId === course.id && s.type === "class",
        );
        const totalPresent = courseSessions.reduce(
          (acc, s) => acc + s.presentCount,
          0,
        );
        const totalExpected = courseSessions.reduce(
          (acc, s) => acc + s.expectedCount,
          0,
        );
        const attendanceRate =
          totalExpected > 0
            ? Math.round((totalPresent / totalExpected) * 100)
            : 0;

        return {
          ...course,
          actualSessions: courseSessions.length,
          totalPresent,
          totalExpected,
          attendanceRate,
        };
      });
    }

    const course = allCourses.find((c) => c.id === selectedCourse);
    if (!course) return [];

    const courseSessions = mockSessions.filter(
      (s) => s.courseId === selectedCourse && s.type === "class",
    );
    const totalPresent = courseSessions.reduce(
      (acc, s) => acc + s.presentCount,
      0,
    );
    const totalExpected = courseSessions.reduce(
      (acc, s) => acc + s.expectedCount,
      0,
    );
    const attendanceRate =
      totalExpected > 0 ? Math.round((totalPresent / totalExpected) * 100) : 0;

    return [
      {
        ...course,
        actualSessions: courseSessions.length,
        totalPresent,
        totalExpected,
        attendanceRate,
      },
    ];
  }, [selectedCourse, allCourses]);

  const firstName = user?.name.split(" ")[0] || "User";
  const welcomeMessage = `Welcome back ${firstName}, here's the attendance overview`;

  const activeSessionsList = mockSessions.filter(
    (s) => s.status === "active" || s.status === "scheduled",
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">{welcomeMessage}</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Filter Type:</label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select filter type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              <SelectItem value="department">By Department</SelectItem>
              <SelectItem value="performance">By Performance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Select Course:</label>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {allCourses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name} ({course.department})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Members"
          value={totalMembers.toLocaleString()}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Active Sessions"
          value={activeSessions}
          icon={CalendarClock}
          variant="primary"
        />
        <StatCard
          title="Today's Attendance"
          value={todayAttendance.toLocaleString()}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Attendance Rate"
          value={`${attendanceRate}%`}
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

      {/* Main Content - Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Course Details</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">
                    Avg Students/Course
                  </p>
                  <p className="text-lg font-bold">
                    {Math.round(totalMembers / allCourses.length)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Total Courses</p>
                  <p className="text-lg font-bold">{allCourses.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">System Status</p>
                  <Badge
                    variant={attendanceRate > 85 ? "default" : "secondary"}
                    className="mt-1"
                  >
                    {attendanceRate > 85 ? "Healthy" : "Needs Attention"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {selectedCourse === "all"
                  ? "All Courses Details"
                  : "Selected Course Details"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {courseDetails.map((course) => (
                  <div
                    key={course.id}
                    className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium">{course.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {course.department}
                        </p>
                      </div>
                      <Badge
                        variant={
                          course.attendanceRate >= 80 ? "default" : "secondary"
                        }
                      >
                        {course.attendanceRate}%
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Students
                        </p>
                        <p className="font-bold">{course.totalStudents}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Sessions
                        </p>
                        <p className="font-bold">
                          {course.actualSessions || course.totalSessions}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Attended
                        </p>
                        <p className="font-bold">{course.totalPresent}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Expected
                        </p>
                        <p className="font-bold">{course.totalExpected}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Courses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...courseDetails]
                    .sort((a, b) => b.attendanceRate - a.attendanceRate)
                    .slice(0, 5)
                    .map((course) => (
                      <div
                        key={course.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <span className="text-sm font-medium truncate">
                          {course.name}
                        </span>
                        <Badge variant="default">
                          {course.attendanceRate}%
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Courses Needing Attention</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...courseDetails]
                    .sort((a, b) => a.attendanceRate - b.attendanceRate)
                    .slice(0, 5)
                    .map((course) => (
                      <div
                        key={course.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <span className="text-sm font-medium truncate">
                          {course.name}
                        </span>
                        <Badge variant="secondary">
                          {course.attendanceRate}%
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

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
              {activeSessionsList.length} sessions currently running or
              scheduled
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeSessionsList.map((session) => (
            <ActiveSessionCard key={session.id} session={session} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
