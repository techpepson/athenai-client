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
import { Badge } from "@/components/ui/badge";
import {
  Session,
  SessionStatus,
  SessionType,
  SessionMode,
  AttendanceStatus,
  getLecturerSessions,
} from "@/services/sessions.service";
import { usersServices } from "@/services/users.services";
import { IUser, ILecturer } from "@/interface/user.interface";
import { modulesService, Module, SubTopic } from "@/services/modules.service";

const LecturerDashboard = () => {
  const { user, token } = useAuth();
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [lecturerModules, setLecturerModules] = useState<Module[]>([]);
  const [lecturerData, setLecturerData] = useState<
    (IUser & { lecturer?: ILecturer | null }) | null
  >(null);
  const [loading, setLoading] = useState(true);

  // Fetch sessions and determine lecturer's subtopics
  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch lecturer details to get their lecturer ID
        const userResponse = await usersServices.getUserById(token);
        let lecturerId: string | undefined;

        if (userResponse.success && userResponse.data?.user) {
          const userData = userResponse.data.user;
          setLecturerData(userData);
          lecturerId = userData.id; // Use user ID — subtopic.lecturerId stores User ID
        }

        // Fetch all modules (we'll filter subtopics by lecturerId)
        const modulesResponse = await modulesService.getModules();
        if (modulesResponse.success && modulesResponse.data?.data) {
          // Only keep modules that have subtopics assigned to this lecturer
          const allMods = modulesResponse.data.data;
          if (lecturerId) {
            const relevantModules = allMods.filter((mod) =>
              (mod.subtopics || []).some(
                (st) =>
                  st.lecturerId === lecturerId ||
                  st.lecturer?.id === lecturerId,
              ),
            );
            setLecturerModules(relevantModules);
          } else {
            setLecturerModules([]);
          }
        } else {
          setLecturerModules([]);
        }

        // Fetch sessions for this lecturer's assigned subtopics
        const sessionsResponse = await getLecturerSessions(token);
        if (sessionsResponse.success && sessionsResponse.data) {
          const data = sessionsResponse.data as Record<string, unknown>;
          const list =
            (data.data as Session[]) ||
            (data.sessions as Session[]) ||
            (Array.isArray(sessionsResponse.data)
              ? (sessionsResponse.data as unknown as Session[])
              : []);
          setSessions(list);
        } else {
          setSessions([]);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setSessions([]);
        setLecturerModules([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Get the lecturer's assigned subtopics (filtered from their modules)
  const lecturerSubtopics = useMemo(() => {
    const lecturerId = lecturerData?.id; // User ID — subtopic.lecturerId stores User ID
    if (!lecturerId) return [];

    const subtopics: (SubTopic & {
      moduleName: string;
      moduleCode: string;
      moduleLevel: number;
    })[] = [];
    lecturerModules.forEach((mod) => {
      (mod.subtopics || []).forEach((st) => {
        if (st.lecturerId === lecturerId || st.lecturer?.id === lecturerId) {
          subtopics.push({
            ...st,
            moduleName: mod.name,
            moduleCode: mod.code,
            moduleLevel: mod.level,
          });
        }
      });
    });
    return subtopics;
  }, [lecturerModules, lecturerData?.id]);

  // Get subtopic IDs assigned to this lecturer
  const lecturerSubtopicIds = useMemo(() => {
    return lecturerSubtopics.map((st) => st.id);
  }, [lecturerSubtopics]);

  // Filter sessions that match the lecturer's subtopics
  const lecturerSessions = useMemo(() => {
    return sessions.filter(
      (s) => s.subtopicId && lecturerSubtopicIds.includes(s.subtopicId),
    );
  }, [sessions, lecturerSubtopicIds]);

  // Get selected module subtopic IDs
  const selectedSubtopicIds = useMemo(() => {
    if (selectedModule === "all") return lecturerSubtopicIds;
    const mod = lecturerModules.find((m) => m.id === selectedModule);
    const lecturerId = lecturerData?.id;
    return (mod?.subtopics || [])
      .filter(
        (st) => st.lecturerId === lecturerId || st.lecturer?.id === lecturerId,
      )
      .map((st) => st.id);
  }, [selectedModule, lecturerModules, lecturerSubtopicIds, lecturerData?.id]);

  // Filter sessions based on module selection
  const filteredSessions = useMemo(() => {
    if (selectedModule === "all") {
      return lecturerSessions;
    }
    return lecturerSessions.filter(
      (s) => s.subtopicId && selectedSubtopicIds.includes(s.subtopicId),
    );
  }, [selectedModule, lecturerSessions, selectedSubtopicIds]);

  // Calculate real statistics
  const totalSessions = filteredSessions.length;

  // Calculate attendance statistics
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
      present: totalPresent,
      checkedIn: totalCheckedIn,
      late: totalLate,
      absent: totalAbsent,
      total: totalPresent + totalCheckedIn + totalLate + totalAbsent,
    };
  }, [filteredSessions]);

  // Calculate attendance rate
  const attendanceRate = useMemo(() => {
    if (attendanceStats.total === 0) return 0;
    return Math.round(
      ((attendanceStats.present + attendanceStats.late) /
        attendanceStats.total) *
        100,
    );
  }, [attendanceStats]);

  // Subtopic statistics breakdown
  const subtopicStats = useMemo(() => {
    const stats: {
      [subtopicId: string]: {
        subtopic: SubTopic & { moduleName: string; moduleCode: string };
        sessions: number;
        presentCount: number;
        lateCount: number;
        absentCount: number;
        avgAttendance: number;
      };
    } = {};

    lecturerSubtopics.forEach((st) => {
      const stSessions = lecturerSessions.filter((s) => s.subtopicId === st.id);

      let totalPresent = 0;
      let totalLate = 0;
      let totalAbsent = 0;

      stSessions.forEach((session) => {
        session.attendances?.forEach((attendance) => {
          if (attendance.status === AttendanceStatus.PRESENT) {
            totalPresent++;
          } else if (attendance.status === AttendanceStatus.CHECKED_IN) {
            totalAbsent++;
          } else if (attendance.status === AttendanceStatus.LATE) {
            totalLate++;
          } else if (attendance.status === AttendanceStatus.ABSENT) {
            totalAbsent++;
          }
        });
      });

      stats[st.id] = {
        subtopic: st,
        sessions: stSessions.length,
        presentCount: totalPresent,
        lateCount: totalLate,
        absentCount: totalAbsent,
        avgAttendance:
          stSessions.length > 0
            ? Math.round(totalPresent / stSessions.length)
            : 0,
      };
    });

    return stats;
  }, [lecturerSubtopics, lecturerSessions]);

  const firstName = user?.name.split(" ")[0] || "User";
  const welcomeMessage = `Welcome back ${firstName}, here's the attendance overview`;

  const activeSessions = lecturerSessions.filter(
    (s) =>
      s.status === SessionStatus.OPEN || s.status === SessionStatus.SCHEDULED,
  );

  // Compute weekly attendance chart data from lecturer's sessions
  const weeklyChartData = useMemo(() => {
    const today = new Date();
    const days: { day: string; present: number; late: number }[] = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dayKey = d.toISOString().split("T")[0];
      let present = 0;
      let late = 0;
      lecturerSessions.forEach((s) => {
        const sessionDay = new Date(s.startTime).toISOString().split("T")[0];
        if (sessionDay !== dayKey) return;
        s.attendances?.forEach((a) => {
          if (a.status === AttendanceStatus.PRESENT) present++;
          else if (a.status === AttendanceStatus.LATE) late++;
        });
      });
      days.push({ day: dayNames[d.getDay()], present, late });
    }
    return days;
  }, [lecturerSessions]);

  // Map sessions to ActiveSessionCard format
  const mappedActiveSessions = activeSessions.map((session) => ({
    id: session.id,
    name: session.name,
    type: session.type.toLowerCase() as "class" | "exam" | "event" | "shift",
    attendanceType:
      session.mode === SessionMode.CHECK_IN
        ? ("checkin" as const)
        : ("checkout" as const),
    department:
      session.subtopic?.name || session.module?.name || session.course?.title,
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
    presentCount:
      session.attendances?.filter((a) => a.status === AttendanceStatus.PRESENT)
        .length || 0,
    courseId: session.courseId,
    courseName:
      session.subtopic?.name || session.module?.name || session.course?.title,
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

      {/* Module Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <label className="text-sm font-medium">Filter by Module:</label>
        <Select
          value={selectedModule}
          onValueChange={setSelectedModule}
          disabled={lecturerModules.length === 0}
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue
              placeholder={
                lecturerModules.length === 0
                  ? "No modules available"
                  : "Select a module"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {lecturerModules.map((mod) => (
              <SelectItem key={mod.id} value={mod.id}>
                {mod.name} ({mod.code}) - Level {mod.level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
        <StatCard
          title="Assigned Subtopics"
          value={lecturerSubtopics.length}
          icon={Layers}
          trend={
            lecturerSubtopics.length > 0
              ? { value: lecturerSubtopics.length, isPositive: true }
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
          title="Present"
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
          value={attendanceStats.late}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Absentees"
          value={attendanceStats.absent}
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
            <AttendanceChart data={weeklyChartData} />
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

        {/* Subtopic Summary (replaces Courses Overview) */}
        <div className="bg-card rounded-lg sm:rounded-xl border border-border p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              Subtopic Overview
            </h2>
            <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          </div>
          <div className="space-y-3 sm:space-y-4 max-h-[280px] sm:max-h-[360px] overflow-y-auto scrollbar-hide">
            {lecturerSubtopics.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BookX className="w-10 h-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No subtopics assigned
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  You haven't been assigned to any subtopics yet
                </p>
              </div>
            ) : (
              lecturerSubtopics.map((st) => {
                const stats = subtopicStats[st.id];
                return (
                  <div
                    key={st.id}
                    className="p-3 rounded-lg border border-border"
                  >
                    <p className="text-sm font-medium">{st.name}</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {st.moduleName} ({st.moduleCode}) &middot; Level{" "}
                      {st.moduleLevel}
                    </p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Sessions:</span>
                        <Badge variant="outline">{stats?.sessions || 0}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Present:</span>
                        <Badge variant="outline">
                          {stats?.presentCount || 0}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg per Session:</span>
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
