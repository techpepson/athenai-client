import { useState, useMemo, useEffect } from "react";
import {
  Users,
  CalendarClock,
  BarChart3,
  CheckCircle2,
  Clock,
  UserX,
  CalendarX2,
  Calendar,
  Loader2,
  BookX,
  Layers,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { AttendanceChart } from "@/components/dashboard/AttendanceChart";
import { ActiveSessionCard } from "@/components/dashboard/ActiveSessionCard";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Session,
  SessionStatus,
  SessionType,
  SessionMode,
  AttendanceStatus,
  getAllSessionsAdmin,
} from "@/services/sessions.service";
import {
  getAllAttendancesAdmin,
  AttendanceRecord,
} from "@/services/attendance.services";
import { usersServices } from "@/services/users.services";
import { modulesService, Module, SubTopic } from "@/services/modules.service";

const AdminDashboard = () => {
  const { user, token } = useAuth();
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [allAttendances, setAllAttendances] = useState<
    AttendanceRecord[] | null
  >(null);
  const [totalMembers, setTotalMembers] = useState(0);

  // Fetch sessions, modules, and attendances from API
  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [
          sessionsResponse,
          modulesResponse,
          allAttendancesResponse,
          usersResponse,
        ] = await Promise.all([
          getAllSessionsAdmin(token),
          modulesService.getModules(),
          getAllAttendancesAdmin(token),
          usersServices.getAllUsers(),
        ]);
        if (sessionsResponse.success && sessionsResponse.data?.data) {
          setSessions(sessionsResponse.data.data);
        } else {
          setSessions([]);
        }
        if (modulesResponse.success && modulesResponse.data?.data) {
          setAllModules(modulesResponse.data.data);
        } else {
          setAllModules([]);
        }
        let attendances: AttendanceRecord[] = [];
        if (allAttendancesResponse.success && allAttendancesResponse.data) {
          attendances = allAttendancesResponse.data;
          setAllAttendances(attendances);
        } else {
          setAllAttendances([]);
        }
        if (usersResponse.success && usersResponse.data?.users) {
          let filteredUsers;
          if (user?.role === "SYSTEM_ADMIN") {
            filteredUsers = usersResponse.data.users;
          } else {
            filteredUsers = usersResponse.data.users.filter(
              (u) => u.role === "STUDENT" || u.role === "LECTURER",
            );
          }
          setTotalMembers(filteredUsers.length);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setSessions([]);
        setAllModules([]);
        setAllAttendances([]);
        setTotalMembers(0);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, user?.role]);

  // Build a flat list of all subtopics with module info
  const allSubtopics = useMemo(() => {
    const subtopics: (SubTopic & {
      moduleName: string;
      moduleCode: string;
      moduleLevel: number;
    })[] = [];
    allModules.forEach((mod) => {
      (mod.subtopics || []).forEach((st) => {
        subtopics.push({
          ...st,
          moduleName: mod.name,
          moduleCode: mod.code,
          moduleLevel: mod.level,
        });
      });
    });
    return subtopics;
  }, [allModules]);

  // Get subtopic IDs for selected module filter
  const selectedSubtopicIds = useMemo(() => {
    if (selectedModule === "all") {
      return allSubtopics.map((st) => st.id);
    }
    const mod = allModules.find((m) => m.id === selectedModule);
    return (mod?.subtopics || []).map((st) => st.id);
  }, [selectedModule, allModules, allSubtopics]);

  // Filter sessions based on module selection (via subtopicId)
  const filteredSessions = useMemo(() => {
    if (selectedModule === "all") {
      return sessions;
    }
    return sessions.filter(
      (s) => s.subtopicId && selectedSubtopicIds.includes(s.subtopicId),
    );
  }, [selectedModule, sessions, selectedSubtopicIds]);

  // Calculate overall statistics
  const activeSessionsCount = sessions.filter(
    (s) =>
      s.status === SessionStatus.OPEN || s.status === SessionStatus.SCHEDULED,
  ).length;

  const todayAttendance = filteredSessions.reduce(
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
    totalExpected > 0 ? Math.round((todayAttendance / totalExpected) * 100) : 0;
  const lateArrivals = filteredSessions.reduce(
    (acc, s) =>
      acc +
      (s.attendances?.filter((a) => a.status === AttendanceStatus.LATE)
        .length || 0),
    0,
  );
  const absentees = filteredSessions.reduce(
    (acc, s) =>
      acc +
      (s.attendances?.filter((a) => a.status === AttendanceStatus.ABSENT)
        .length || 0),
    0,
  );

  // Module details for the details tab
  const moduleDetails = useMemo(() => {
    const modulesToShow =
      selectedModule === "all"
        ? allModules
        : allModules.filter((m) => m.id === selectedModule);

    return modulesToShow.map((mod) => {
      const subtopicIds = (mod.subtopics || []).map((st) => st.id);
      const moduleSessions = sessions.filter(
        (s) => s.subtopicId && subtopicIds.includes(s.subtopicId),
      );
      const totalPresent = moduleSessions.reduce(
        (acc, s) =>
          acc +
          (s.attendances?.filter((a) => a.status === AttendanceStatus.PRESENT)
            .length || 0),
        0,
      );
      const totalExp = moduleSessions.reduce(
        (acc, s) => acc + (s.attendances?.length || 0),
        0,
      );
      const rate =
        totalExp > 0 ? Math.round((totalPresent / totalExp) * 100) : 0;

      return {
        id: mod.id,
        name: mod.name,
        code: mod.code,
        level: mod.level,
        subtopicCount: (mod.subtopics || []).length,
        actualSessions: moduleSessions.length,
        totalPresent,
        totalExpected: totalExp,
        attendanceRate: rate,
      };
    });
  }, [selectedModule, allModules, sessions]);

  const firstName = user?.name.split(" ")[0] || "User";
  const welcomeMessage = `Welcome back ${firstName}, here's the attendance overview`;

  const mapSessionType = (
    type: SessionType,
  ): "class" | "exam" | "event" | "shift" => {
    switch (type) {
      case SessionType.CLASS:
      case SessionType.LAB:
      case SessionType.TUTORIAL:
        return "class";
      case SessionType.EXAM:
        return "exam";
      case SessionType.EVENT:
        return "event";
      case SessionType.WORKSHIFT:
        return "shift";
      default:
        return "class";
    }
  };

  const activeSessionsList = sessions
    .filter(
      (s) =>
        s.status === SessionStatus.OPEN || s.status === SessionStatus.SCHEDULED,
    )
    .map((s) => {
      let startTime = s.startTime;
      let endTime = s.endTime || s.startTime;
      if (typeof startTime === "string" || typeof startTime === "number") {
        startTime = new Date(startTime);
      }
      if (typeof endTime === "string" || typeof endTime === "number") {
        endTime = new Date(endTime);
      }
      return {
        id: s.id,
        name: s.name,
        courseId: s.courseId || "",
        courseName:
          s.subtopic?.name || s.module?.name || s.course?.title || "Unknown",
        createdBy: s.createdBy?.name || "Unknown",
        type: mapSessionType(s.type),
        status:
          s.status === SessionStatus.OPEN
            ? ("active" as const)
            : s.status === SessionStatus.SCHEDULED
              ? ("scheduled" as const)
              : ("completed" as const),
        attendanceType:
          s.mode === SessionMode.CHECK_IN
            ? ("checkin" as const)
            : ("checkout" as const),
        location: s.location,
        startTime,
        endTime,
        presentCount:
          s.attendances?.filter((a) => a.status === AttendanceStatus.PRESENT)
            .length || 0,
        expectedCount: s.attendances?.length || 0,
      };
    });

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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-sm font-medium">Filter by Module:</label>
          <Select value={selectedModule} onValueChange={setSelectedModule}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select a module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {allModules.map((mod) => (
                <SelectItem key={mod.id} value={mod.id}>
                  {mod.name} ({mod.code}) - Level {mod.level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
          <StatCard
            title={
              user?.role === "SYSTEM_ADMIN"
                ? "All Members"
                : "Students & Lecturers"
            }
            value={totalMembers.toLocaleString()}
            icon={Users}
          />
          <StatCard
            title="Active Sessions"
            value={activeSessionsCount}
            icon={CalendarClock}
            variant="primary"
          />
          <StatCard
            title="Total Sessions"
            value={sessions.length}
            icon={Calendar}
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
      )}

      {/* Main Content - Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Module Details</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
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
              {(() => {
                if (!allAttendances || allAttendances.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <BookX className="w-10 h-10 mb-2" />
                      <div>No attendance data for this week.</div>
                    </div>
                  );
                }
                const now = new Date();
                const last7Days = [];
                for (let i = 6; i >= 0; i--) {
                  const d = new Date(now);
                  d.setDate(now.getDate() - i);
                  last7Days.push({
                    key: d.toLocaleDateString(undefined, { weekday: "short" }),
                    date: d,
                  });
                }
                const weeklyAttendanceData = last7Days.map(({ key, date }) => {
                  const dayAttendances = allAttendances.filter((a) => {
                    const checkIn = a.checkInTime
                      ? new Date(a.checkInTime)
                      : null;
                    if (!checkIn) return false;
                    return (
                      checkIn.getFullYear() === date.getFullYear() &&
                      checkIn.getMonth() === date.getMonth() &&
                      checkIn.getDate() === date.getDate()
                    );
                  });
                  let present = 0;
                  let late = 0;
                  dayAttendances.forEach((a) => {
                    if (a.status === "PRESENT") present++;
                    else if (a.status === "LATE") late++;
                  });
                  return { day: key, present, late };
                });
                if (
                  weeklyAttendanceData.every(
                    (d) => d.present === 0 && d.late === 0,
                  )
                ) {
                  return (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <BookX className="w-10 h-10 mb-2" />
                      <div>No attendance data for this week.</div>
                    </div>
                  );
                }
                return <AttendanceChart data={weeklyAttendanceData} />;
              })()}
            </div>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-2 sm:space-y-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Total Modules</p>
                  <p className="text-lg font-bold">{allModules.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">
                    Total Subtopics
                  </p>
                  <p className="text-lg font-bold">{allSubtopics.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">
                    Attendance Rate
                  </p>
                  <Badge
                    variant={attendanceRate > 85 ? "default" : "secondary"}
                    className="mt-1"
                  >
                    {attendanceRate > 85 ? "Excellent" : "Normal"} (
                    {attendanceRate}%)
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
                {selectedModule === "all"
                  ? "All Modules Details"
                  : "Selected Module Details"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {moduleDetails.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <BookX className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">
                      No modules found
                    </p>
                  </div>
                ) : (
                  moduleDetails.map((mod) => (
                    <div
                      key={mod.id}
                      className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium">{mod.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {mod.code} &middot; Level {mod.level}
                          </p>
                        </div>
                        <Badge
                          variant={
                            mod.attendanceRate >= 80 ? "default" : "secondary"
                          }
                        >
                          {mod.attendanceRate}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Subtopics
                          </p>
                          <p className="font-bold">{mod.subtopicCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Sessions
                          </p>
                          <p className="font-bold">{mod.actualSessions}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Attended
                          </p>
                          <p className="font-bold">{mod.totalPresent}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Expected
                          </p>
                          <p className="font-bold">{mod.totalExpected}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">
                  Top Performing Modules
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="space-y-3">
                  {[...moduleDetails]
                    .sort((a, b) => b.attendanceRate - a.attendanceRate)
                    .slice(0, 5)
                    .map((mod) => (
                      <div
                        key={mod.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <span className="text-sm font-medium truncate">
                          {mod.name}
                        </span>
                        <Badge variant="default">{mod.attendanceRate}%</Badge>
                      </div>
                    ))}
                  {moduleDetails.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No module data available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">
                  Modules Needing Attention
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="space-y-3">
                  {[...moduleDetails]
                    .sort((a, b) => a.attendanceRate - b.attendanceRate)
                    .slice(0, 5)
                    .map((mod) => (
                      <div
                        key={mod.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <span className="text-sm font-medium truncate">
                          {mod.name}
                        </span>
                        <Badge variant="secondary">{mod.attendanceRate}%</Badge>
                      </div>
                    ))}
                  {moduleDetails.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No module data available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Active Sessions */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              Active & Upcoming Sessions
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {activeSessionsList.length} sessions currently running or
              scheduled
            </p>
          </div>
        </div>
        {activeSessionsList.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarX2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No Active Sessions
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                There are no active or upcoming sessions at the moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {activeSessionsList.map((session) => (
              <ActiveSessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
