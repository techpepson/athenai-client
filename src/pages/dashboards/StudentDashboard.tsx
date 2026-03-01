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
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Role } from "@/enums/enums";
import {
  Session,
  SessionStatus,
  SessionType,
  SessionMode,
  AttendanceStatus,
  getCreatorSessions,
  Attendance,
} from "@/services/sessions.service";
import { usersServices } from "@/services/users.services";
import { IUser, IStudent } from "@/interface/user.interface";
import {
  getUserAttendance,
  AttendanceRecord,
} from "@/services/attendance.services";
import { modulesService, Module, SubTopic } from "@/services/modules.service";

// Interface for weekly attendance data
interface WeeklyAttendanceData {
  day: string;
  present: number;
  late: number;
  absent: number;
}

const StudentDashboard = () => {
  const { user, token } = useAuth();
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [userAttendanceRecords, setUserAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [studentData, setStudentData] = useState<
    (IUser & { student?: IStudent | null }) | null
  >(null);
  const [studentModules, setStudentModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user is a course rep based on role
  const isCourseRep = user?.role === Role.REP;

  // Load student data, modules (by level), and sessions
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch student details to get their level
        const userResponse = await usersServices.getUserById(token);
        let studentLevel: number | undefined;

        if (userResponse.success && userResponse.data?.user) {
          const userData = userResponse.data.user;
          setStudentData(userData);
          studentLevel = userData.student?.level;
        }

        // Fetch modules for student's level
        if (studentLevel) {
          const modulesResponse = await modulesService.getModules(studentLevel);
          if (modulesResponse.success && modulesResponse.data?.data) {
            setStudentModules(modulesResponse.data.data);
          } else {
            setStudentModules([]);
          }
        } else {
          // If no level, fetch all modules as fallback
          const modulesResponse = await modulesService.getModules();
          if (modulesResponse.success && modulesResponse.data?.data) {
            setStudentModules(modulesResponse.data.data);
          } else {
            setStudentModules([]);
          }
        }

        // Fetch sessions based on role
        if (isCourseRep) {
          // Reps can see sessions they created (includes all students' attendance)
          const sessionsResponse = await getCreatorSessions(token);
          if (sessionsResponse.success && sessionsResponse.data) {
            const data = sessionsResponse.data as Record<string, unknown>;
            const list =
              (data.sessions as Session[]) ||
              (data.data as Session[]) ||
              (Array.isArray(sessionsResponse.data)
                ? (sessionsResponse.data as unknown as Session[])
                : []);
            setAllSessions(list);
          } else {
            setAllSessions([]);
          }
        } else {
          setAllSessions([]);
        }

        // Fetch user's own attendance records
        const attendanceResponse = await getUserAttendance(token);
        if (attendanceResponse.success && attendanceResponse.data) {
          setUserAttendanceRecords(attendanceResponse.data);
        } else {
          setUserAttendanceRecords([]);
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        setAllSessions([]);
        setUserAttendanceRecords([]);
        setStudentModules([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [token]);

  // Build all subtopics from student's level modules
  const allSubtopics = useMemo(() => {
    const subtopics: (SubTopic & {
      moduleName: string;
      moduleCode: string;
      moduleId: string;
    })[] = [];
    studentModules.forEach((mod) => {
      (mod.subtopics || []).forEach((st) => {
        subtopics.push({
          ...st,
          moduleName: mod.name,
          moduleCode: mod.code,
          moduleId: mod.id,
        });
      });
    });
    return subtopics;
  }, [studentModules]);

  // Get all subtopic IDs for the student's level
  const levelSubtopicIds = useMemo(() => {
    return allSubtopics.map((st) => st.id);
  }, [allSubtopics]);

  // Filter sessions that belong to subtopics at the student's level
  const studentSessions = useMemo(() => {
    return allSessions.filter(
      (session) =>
        session.subtopicId && levelSubtopicIds.includes(session.subtopicId),
    );
  }, [allSessions, levelSubtopicIds]);

  // Get selected module subtopic IDs
  const selectedSubtopicIds = useMemo(() => {
    if (selectedModule === "all") return levelSubtopicIds;
    const mod = studentModules.find((m) => m.id === selectedModule);
    return (mod?.subtopics || []).map((st) => st.id);
  }, [selectedModule, studentModules, levelSubtopicIds]);

  // Filter sessions based on module selection
  const filteredSessions = useMemo(() => {
    const baseSessions =
      selectedModule === "all"
        ? studentSessions
        : studentSessions.filter(
            (s) => s.subtopicId && selectedSubtopicIds.includes(s.subtopicId),
          );
    return baseSessions;
  }, [selectedModule, studentSessions, selectedSubtopicIds]);

  // Calculate attendance statistics from userAttendanceRecords
  // Single source of truth for all roles (student/rep)
  // Use session scalar fields (subtopicId, moduleId) since the getUserAttendance
  // API does NOT include the subtopic/module relation objects.
  const attendanceStats = useMemo(() => {
    // Filter attendance records whose session matches the user's level subtopics
    const levelRecords = userAttendanceRecords.filter((r) => {
      // Match by subtopicId (scalar field on session)
      const recSubtopicId = r.session?.subtopicId;
      if (recSubtopicId && levelSubtopicIds.includes(recSubtopicId))
        return true;
      // Fallback: match by moduleId → look up module level in local data
      const recModuleId = r.session?.moduleId;
      if (recModuleId && studentData?.student?.level) {
        const mod = studentModules.find((m) => m.id === recModuleId);
        if (mod && mod.level === studentData.student.level) return true;
      }
      return false;
    });

    // Further filter by selected module if one is chosen
    const records =
      selectedModule === "all"
        ? levelRecords
        : levelRecords.filter((r) => {
            const recSubtopicId = r.session?.subtopicId;
            if (recSubtopicId)
              return selectedSubtopicIds.includes(recSubtopicId);
            return r.session?.moduleId === selectedModule;
          });

    let attended = 0;
    let late = 0;
    let absent = 0;

    records.forEach((r) => {
      const status = r.status as string;
      if (status === "PRESENT" || status === AttendanceStatus.PRESENT)
        attended++;
      else if (status === "LATE" || status === AttendanceStatus.LATE) late++;
      else absent++;
    });

    const total = attended + late + absent;
    const rate = total > 0 ? Math.round(((attended + late) / total) * 100) : 0;

    return {
      attended,
      late,
      absent,
      total,
      totalSessions: total,
      rate,
    };
  }, [
    userAttendanceRecords,
    levelSubtopicIds,
    selectedSubtopicIds,
    selectedModule,
    studentData?.student?.level,
    studentModules,
  ]);

  // Calculate weekly attendance data for chart
  const weeklyAttendance = useMemo((): WeeklyAttendanceData[] => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    return days.map((day, index) => {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + index);
      const nextDay = new Date(dayDate);
      nextDay.setDate(dayDate.getDate() + 1);

      let present = 0;
      let late = 0;
      let absent = 0;

      userAttendanceRecords.forEach((record) => {
        const sessionStartTime =
          record.session?.startTime || record.checkInTime;
        if (!sessionStartTime) return;

        const sessionDate = new Date(sessionStartTime);
        if (sessionDate >= dayDate && sessionDate < nextDay) {
          if (
            record.status === AttendanceStatus.PRESENT ||
            record.status === "PRESENT"
          ) {
            present++;
          } else if (
            record.status === AttendanceStatus.LATE ||
            record.status === "LATE"
          ) {
            late++;
          } else if (
            record.status === AttendanceStatus.ABSENT ||
            record.status === "ABSENT" ||
            record.status === AttendanceStatus.CHECKED_IN ||
            record.status === "CHECKED_IN"
          ) {
            absent++;
          }
        }
      });

      return { day, present, late, absent };
    });
  }, [userAttendanceRecords]);

  // Subtopic stats breakdown — uses userAttendanceRecords for all roles
  // For each subtopic at the user's level, count attendance records whose
  // session maps to that subtopic, and count records where user is present.
  const subtopicStats = useMemo(() => {
    const stats: {
      [subtopicId: string]: {
        subtopic: SubTopic & { moduleName: string; moduleCode: string };
        totalSessions: number;
        attended: number;
        late: number;
        absent: number;
        rate: number;
      };
    } = {};

    allSubtopics.forEach((st) => {
      let attended = 0;
      let late = 0;
      let absent = 0;
      let sessionCount = 0;

      userAttendanceRecords.forEach((r) => {
        // Match attendance record to this subtopic using scalar subtopicId
        const recSubtopicId = r.session?.subtopicId;
        if (recSubtopicId !== st.id) return;

        sessionCount++;
        const status = r.status as string;
        if (status === "PRESENT" || status === AttendanceStatus.PRESENT)
          attended++;
        else if (status === "LATE" || status === AttendanceStatus.LATE) late++;
        else absent++;
      });

      const total = attended + late + absent;
      const rate =
        total > 0 ? Math.round(((attended + late) / total) * 100) : 0;

      stats[st.id] = {
        subtopic: st,
        totalSessions: sessionCount,
        attended,
        late,
        absent,
        rate,
      };
    });

    return stats;
  }, [allSubtopics, userAttendanceRecords]);

  // Get active and upcoming sessions for student's level subtopics
  const upcomingAndActiveSessions = useMemo(() => {
    const now = new Date();

    return studentSessions
      .filter((session) => {
        if (session.status === SessionStatus.OPEN) return true;
        if (session.status === SessionStatus.SCHEDULED) {
          const startTime = new Date(session.startTime);
          return startTime > now;
        }
        return false;
      })
      .sort((a, b) => {
        return (
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
      });
  }, [studentSessions]);

  const firstName =
    user?.name?.split(" ")[0] || studentData?.name?.split(" ")[0] || "User";
  const welcomeMessage = `Welcome back ${firstName}!, here's your attendance overview`;

  // Map sessions to AttendanceSession format for ActiveSessionCard
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
      department:
        session.subtopic?.name || session.module?.name || session.course?.title,
      startTime: new Date(session.startTime),
      endTime: new Date(session.endTime),
      status: isScheduled
        ? ("scheduled" as const)
        : session.status === SessionStatus.OPEN
          ? ("active" as const)
          : ("completed" as const),
      location: session.location,
      expectedCount: session.attendances?.length || 0,
      presentCount:
        session.attendances?.filter(
          (a) => a.status === AttendanceStatus.PRESENT,
        ).length || 0,
      courseId: session.courseId,
      courseName:
        session.subtopic?.name || session.module?.name || session.course?.title,
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
              Level Representative
            </Badge>
          )}
        </div>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          {welcomeMessage}
        </p>
        {studentData?.student?.level && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Level {studentData.student.level}
          </p>
        )}
      </div>

      {/* Module Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <label className="text-sm font-medium">Filter by Module:</label>
        <Select value={selectedModule} onValueChange={setSelectedModule}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Select a module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {studentModules.map((mod) => (
              <SelectItem key={mod.id} value={mod.id}>
                {mod.name} ({mod.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
        <StatCard
          title="Total Sessions"
          value={attendanceStats.totalSessions}
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
          title="Available Subtopics"
          value={allSubtopics.length}
          icon={Layers}
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

        {/* Subtopic Summary (replaces Course Summary) */}
        <div className="bg-card rounded-lg sm:rounded-xl border border-border p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              Subtopic Summary
            </h2>
            <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          </div>
          <div className="space-y-2 sm:space-y-3 max-h-[280px] sm:max-h-[360px] overflow-y-auto scrollbar-hide">
            {allSubtopics.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BookX className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No subtopics available
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  No modules or subtopics found for your level
                </p>
              </div>
            ) : (
              allSubtopics.map((st) => {
                const stats = subtopicStats[st.id];
                return (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{st.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {st.moduleName} ({st.moduleCode})
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
              level. Sessions created by your lecturers or course
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
