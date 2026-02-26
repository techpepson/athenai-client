import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Loader2,
  RefreshCw,
  QrCode,
  Download,
  X,
  CalendarDays,
  LayoutList,
  BookOpen,
  FileText,
  Users,
  Send,
  AlertCircle,
} from "lucide-react";
import TimetableTab from "@/components/modules/TimetableTab";
import LecturerAttendanceTab from "@/components/sessions/LecturerAttendanceTab";
import StudentAttendanceTab from "@/components/sessions/StudentAttendanceTab";
import MyAttendanceSheet from "@/components/sessions/MyAttendanceSheet";
import MasterAttendanceSheet from "@/components/sessions/MasterAttendanceSheet";
import { hasEnrolledModules } from "@/data/mockAttendanceData";
import { Button } from "@/components/ui/button";
import { SessionCard } from "@/components/sessions/SessionCard";
import { SessionReportModal } from "@/components/sessions/SessionReportModal";
import {
  AttendanceSession,
  SessionAttendanceRecord,
  ExpectedAttendee,
} from "@/types/attendance";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useAttendance } from "@/contexts/AttendanceContext";
import { Role } from "@/enums/enums";
import {
  getAllSessionsAdmin,
  getCreatorSessions,
  closeSession,
  deleteSession,
  toggleSessionMode,
  generateSessionQrCode,
  Session,
  SessionStatus,
  SessionType,
  SessionMode,
  Attendance,
  CourseEnrollment,
} from "@/services/sessions.service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { modulesService, TimetableSlot } from "@/services/modules.service";

// Helper function to map API Session to AttendanceSession
const mapSessionToAttendanceSession = (session: Session): AttendanceSession => {
  // Map session type
  const typeMap: Record<SessionType, AttendanceSession["type"]> = {
    [SessionType.CLASS]: "class",
    [SessionType.EXAM]: "exam",
    [SessionType.LAB]: "class",
    [SessionType.TUTORIAL]: "class",
    [SessionType.EVENT]: "event",
    [SessionType.WORKSHIFT]: "shift",
  };

  // Map session status
  const statusMap: Record<SessionStatus, AttendanceSession["status"]> = {
    [SessionStatus.OPEN]: "active",
    [SessionStatus.CLOSED]: "completed",
    [SessionStatus.SCHEDULED]: "active", // Treat scheduled as active for display
  };

  // Map attendance records
  const mappedAttendances: SessionAttendanceRecord[] =
    session.attendances?.map((a: Attendance) => ({
      id: a.id,
      userId: a.userId,
      userName: a.user?.name || undefined,
      userEmail: a.user?.email || undefined,
      studentId:
        a.user?.student?.studentId || a.user?.student?.matricNo || undefined,
      department: a.user?.student?.department || undefined,
      timestamp: new Date(a.timestamp),
      checkInTime: a.checkInTime ? new Date(a.checkInTime) : undefined,
      checkOutTime: a.checkOutTime ? new Date(a.checkOutTime) : undefined,
      confidence: a.confidence,
      source: a.source,
      status: a.status as SessionAttendanceRecord["status"],
    })) || [];

  // Map expected attendees from course enrollments
  // Schema path: CourseEnrollment → Student → User
  const mappedExpectedAttendees: ExpectedAttendee[] =
    session.course?.enrollments?.map((e: CourseEnrollment) => ({
      id: e.id,
      userId: e.student?.user?.id || "",
      name: e.student?.user?.name || "Unknown",
      email: e.student?.user?.email,
      studentId: e.student?.studentId || e.student?.matricNo,
      department: undefined, // Note: department is not in Student model
    })) || [];

  // Calculate present count from attendances - only PRESENT (fully completed) and LATE count
  const presentCount =
    session.attendances?.filter(
      (a) => a.status === "PRESENT" || a.status === "LATE",
    ).length || 0;
  // Note: CHECKED_IN without checkout doesn't count as present

  // Expected count is from course enrollments or provided count
  // Priority: expectedAttendeesCount > course._count.enrollments > course.enrollments.length > attendances.length
  const expectedCount =
    session.expectedAttendeesCount ||
    session.course?._count?.enrollments ||
    session.course?.enrollments?.length ||
    session.attendances?.length ||
    0;

  return {
    id: session.id,
    name: session.name,
    type: typeMap[session.type] || "class",
    attendanceType:
      session.mode === SessionMode.CHECK_IN ? "checkin" : "checkout",
    startTime: new Date(session.startTime),
    endTime: new Date(session.endTime),
    status: statusMap[session.status] || "active",
    location: session.location || undefined,
    expectedCount: expectedCount,
    presentCount: presentCount,
    courseId: session.courseId || undefined,
    courseName: session.course?.title || undefined,
    createdBy: session.userId,
    createdByRole: session.createdBy?.name ? Role.LECTURER : undefined,
    attendances: mappedAttendances,
    expectedAttendees: mappedExpectedAttendees,
  };
};

const Sessions = () => {
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] =
    useState<AttendanceSession | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [mainTab, setMainTab] = useState("sessions");
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get AttendanceContext for shared state
  const { startSession: ctxStartSession, endSession: ctxEndSession } =
    useAttendance();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [togglingSessionId, setTogglingSessionId] = useState<string | null>(
    null,
  );
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null,
  );
  const [qrCodeModalOpen, setQrCodeModalOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrCodeSessionName, setQrCodeSessionName] = useState<string>("");
  const [generatingQrCode, setGeneratingQrCode] = useState<string | null>(null);
  const { user, token } = useAuth();

  // Check if user is admin (can see all sessions)
  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SYSTEM_ADMIN;

  // Check if user can view lecturer attendance (REP, LECTURER, ADMIN, SYSTEM_ADMIN)
  const canViewLecturerAttendance =
    isAdmin || user?.role === Role.REP || user?.role === Role.LECTURER;

  // Check if user can view student attendance (everyone except lecturers)
  const canViewStudentAttendance = user?.role !== Role.LECTURER;

  // Check if user is a student (for My Attendance Sheet)
  const isStudent = user?.role === Role.STUDENT;
  const isRep = user?.role === Role.REP;
  const isLecturer = user?.role === Role.LECTURER;

  // Check if user can view My Attendance Sheet (students and reps)
  const canViewMyAttendanceSheet = isStudent || isRep;

  // Check if user can view/edit Master Attendance Sheet (reps and lecturers)
  const canViewMasterAttendanceSheet = isRep || isLecturer || isAdmin;

  // SMS modal state for session start
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [startingSession, setStartingSession] =
    useState<AttendanceSession | null>(null);

  // Day name mapping for display
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  // Build weekly lecture cards from timetable activities (LECTURES ONLY)
  const weeklyLectureSessions = useMemo((): AttendanceSession[] => {
    const timetables = modulesService.getTimetables();
    const modules = modulesService.getModules();
    if (timetables.length === 0) return [];

    const now = new Date();
    // Get Monday of the current week
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    // Today at start of day for filtering past days
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const dayIndexMap: Record<string, number> = {
      MONDAY: 0,
      TUESDAY: 1,
      WEDNESDAY: 2,
      THURSDAY: 3,
      FRIDAY: 4,
      SATURDAY: 5,
      SUNDAY: 6,
    };

    const parseTime = (timeStr: string): { hours: number; minutes: number } => {
      const [h, m] = timeStr.split(":").map(Number);
      // Handle 12-hour implied format (1:30 = 13:30 if < 7)
      const hours = h < 7 ? h + 12 : h;
      return { hours, minutes: m || 0 };
    };

    const lectureCards: AttendanceSession[] = [];

    timetables.forEach((timetable) => {
      const mod = modules.find((m) => m.id === timetable.moduleId);
      if (!mod) return;

      // Determine current week number within the timetable
      let currentWeek = 1;
      if (timetable.startDate) {
        const start = new Date(timetable.startDate);
        const diffMs = now.getTime() - start.getTime();
        currentWeek = Math.max(
          1,
          Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)),
        );
        if (currentWeek > timetable.totalWeeks) return; // past this module
      }

      // Filter slots for the current week AND only LECTURE activities
      const weekSlots = timetable.slots.filter(
        (slot) =>
          (!slot.week || slot.week === currentWeek) &&
          slot.activityType === "LECTURE",
      );

      weekSlots.forEach((slot) => {
        const dayOffset = dayIndexMap[slot.day.toUpperCase()];
        if (dayOffset === undefined) return;

        const slotDate = new Date(monday);
        slotDate.setDate(monday.getDate() + dayOffset);

        // Skip past days (only show today and upcoming days)
        if (slotDate < todayStart) return;

        const start = parseTime(slot.startTime);
        const end = parseTime(slot.endTime);

        const startTime = new Date(slotDate);
        startTime.setHours(start.hours, start.minutes, 0, 0);

        const endTime = new Date(slotDate);
        endTime.setHours(end.hours, end.minutes, 0, 0);

        // Determine status based on current time
        let status: AttendanceSession["status"] = "scheduled";
        if (now >= startTime && now <= endTime) {
          status = "active";
        } else if (now > endTime) {
          status = "completed";
        }

        const subtopic = mod.subtopics.find((s) => s.id === slot.subtopicId);

        lectureCards.push({
          id: `timetable-${slot.id}`,
          name: subtopic?.name || `${mod.name} - Lecture`,
          type: "class",
          attendanceType: "checkin",
          department: mod.code,
          startTime,
          endTime,
          status,
          location: slot.venue || undefined,
          expectedCount: 0,
          presentCount: 0,
          courseId: undefined,
          courseName: `${mod.name} (${mod.code})`,
          createdBy: undefined,
        });
      });
    });

    // Sort by day then start time
    lectureCards.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    return lectureCards;
  }, []);

  // Group lectures by day for display
  const lecturesByDay = useMemo(() => {
    const grouped: Record<string, AttendanceSession[]> = {};

    weeklyLectureSessions.forEach((session) => {
      const dayName = dayNames[session.startTime.getDay()];
      if (!grouped[dayName]) {
        grouped[dayName] = [];
      }
      grouped[dayName].push(session);
    });

    // Sort days in order (Monday to Friday)
    const orderedDays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const sortedGrouped: Record<string, AttendanceSession[]> = {};
    orderedDays.forEach((day) => {
      if (grouped[day]) {
        sortedGrouped[day] = grouped[day];
      }
    });

    return sortedGrouped;
  }, [weeklyLectureSessions]);

  // Fetch sessions from API
  const fetchSessions = useCallback(
    async (showRefreshToast = false) => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        if (showRefreshToast) {
          setIsRefreshing(true);
        }

        let response;

        if (isAdmin) {
          // Admins can see all sessions
          response = await getAllSessionsAdmin(token);
        } else {
          // Non-admins see only sessions they created
          response = await getCreatorSessions(token);
        }

        if (response.success && response.data) {
          // Handle different response structures
          const sessionsData = Array.isArray(response.data)
            ? response.data
            : "data" in response.data
              ? response.data.data
              : "sessions" in response.data
                ? response.data.sessions
                : [];

          const mappedSessions = (sessionsData as Session[]).map(
            mapSessionToAttendanceSession,
          );
          setSessions(mappedSessions);

          if (showRefreshToast) {
            toast.success("Sessions refreshed");
          }
        } else {
          console.error("Failed to fetch sessions:", response.error);
          if (!showRefreshToast) {
            toast.error("Failed to load sessions");
          }
        }
      } catch (error) {
        console.error("Error fetching sessions:", error);
        toast.error("Failed to load sessions");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, isAdmin],
  );

  // Fetch sessions on mount and when dependencies change
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Filter sessions based on active tab
  const filteredSessions = sessions.filter((session) => {
    if (activeTab === "all") return true;
    return session.status === activeTab;
  });

  const handleStartSession = (session: AttendanceSession) => {
    // Extract slot ID from the session ID (e.g., "timetable-slotId" -> "slotId")
    const slotId = session.id.replace("timetable-", "");

    // Save to localStorage to mark as active
    const storedActiveSessions = localStorage.getItem(
      "active_lecture_sessions",
    );
    const activeSessions = storedActiveSessions
      ? JSON.parse(storedActiveSessions)
      : [];

    if (!activeSessions.includes(slotId)) {
      activeSessions.push(slotId);
      localStorage.setItem(
        "active_lecture_sessions",
        JSON.stringify(activeSessions),
      );
    }

    // Also call AttendanceContext's startSession for shared state
    // This enables the Sign In functionality in MyAttendanceSheet
    const moduleCode = session.department || "UNKNOWN";
    const formatTime = (date: Date) => {
      const h = date.getHours().toString().padStart(2, "0");
      const m = date.getMinutes().toString().padStart(2, "0");
      return `${h}:${m}`;
    };
    ctxStartSession({
      sessionId: session.id,
      slotId,
      moduleCode,
      moduleName: session.courseName || session.name,
      topic: session.name,
      date: session.startTime.toISOString().split("T")[0],
      week: 1, // Could calculate from timetable if available
      startTime: formatTime(session.startTime),
      endTime: formatTime(session.endTime),
      startedBy: user?.name || "Level Rep",
    });

    // Dispatch event to notify other components
    window.dispatchEvent(new Event("session-started"));

    // Show SMS modal
    setStartingSession(session);
    setSmsModalOpen(true);

    toast.success("Session started! Students can now sign in.");
  };

  // Handle sending SMS link
  const handleSendSms = () => {
    if (!startingSession) return;

    const slotId = startingSession.id.replace("timetable-", "");
    const kioskLink = `${window.location.origin}/kiosk/lecturer/${slotId}`;

    navigator.clipboard.writeText(kioskLink).catch(() => {});

    toast.success("SMS link sent to lecturer", {
      description: "Link copied to clipboard for testing",
    });

    setSmsModalOpen(false);
    setStartingSession(null);
  };

  const handleEndSession = async (session: AttendanceSession) => {
    if (!token) {
      toast.error("You must be logged in to end a session");
      return;
    }

    try {
      const response = await closeSession(session.id, token);

      if (response.success) {
        toast.success("Session ended successfully. Generating report...");
        // Update local state to reflect the closed session
        setSessions((prev) =>
          prev.map((s) =>
            s.id === session.id ? { ...s, status: "completed" as const } : s,
          ),
        );
        // Show the report modal
        setSelectedSession({ ...session, status: "completed" });
        setReportModalOpen(true);
        // Refresh sessions to get updated data
        fetchSessions();
      } else {
        toast.error(response.error || "Failed to end session");
      }
    } catch (error) {
      console.error("Error ending session:", error);
      toast.error("Failed to end session");
    }
  };

  const handleViewReport = (session: AttendanceSession) => {
    setSelectedSession(session);
    setReportModalOpen(true);
  };

  const handleCheckout = (session: AttendanceSession) => {
    toast.success("Session checked out successfully");
    // The SessionCard handles localStorage sync internally
  };

  const handleDeleteSession = async (session: AttendanceSession) => {
    if (!token) {
      toast.error("You must be logged in to delete a session");
      return;
    }

    setDeletingSessionId(session.id);
    try {
      const response = await deleteSession(session.id, token);

      if (response.success) {
        toast.success("Session deleted successfully");
        // Remove from local state
        setSessions((prev) => prev.filter((s) => s.id !== session.id));
      } else {
        toast.error(response.error || "Failed to delete session");
      }
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Failed to delete session");
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleToggleMode = async (session: AttendanceSession) => {
    if (!token) {
      toast.error("You must be logged in to toggle session mode");
      return;
    }

    setTogglingSessionId(session.id);
    try {
      const response = await toggleSessionMode(session.id, token);

      if (response.success) {
        toast.success("Session mode switched to Check-Out");
        // Update local state to reflect the mode change
        setSessions((prev) =>
          prev.map((s) =>
            s.id === session.id
              ? { ...s, attendanceType: "checkout" as const }
              : s,
          ),
        );
        // Refresh sessions to get updated data
        fetchSessions();
      } else {
        toast.error(response.error || "Failed to toggle session mode");
      }
    } catch (error) {
      console.error("Error toggling session mode:", error);
      toast.error("Failed to toggle session mode");
    } finally {
      setTogglingSessionId(null);
    }
  };

  const handleRefresh = () => {
    fetchSessions(true);
  };

  const handleGenerateQrCode = async (session: AttendanceSession) => {
    if (!token) {
      toast.error("You must be logged in to generate QR code");
      return;
    }

    setGeneratingQrCode(session.id);
    try {
      const response = await generateSessionQrCode(session.id, token);

      if (response.success && response.data?.data) {
        // Add data URL prefix if not already present
        const imageData = response.data.data.startsWith("data:")
          ? response.data.data
          : `data:image/png;base64,${response.data.data}`;
        setQrCodeData(imageData);
        setQrCodeSessionName(session.name);
        setQrCodeModalOpen(true);
        toast.success("QR Code generated successfully");
      } else {
        toast.error(response.error || "Failed to generate QR code");
      }
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.error("Failed to generate QR code");
    } finally {
      setGeneratingQrCode(null);
    }
  };

  const handleDownloadQrCode = () => {
    if (!qrCodeData) return;

    const link = document.createElement("a");
    link.href = qrCodeData;
    link.download = `qrcode-${qrCodeSessionName.replace(/\s+/g, "-").toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("QR Code downloaded");
  };

  // Count sessions by status
  const activeSessions = sessions.filter((s) => s.status === "active").length;
  const completedSessions = sessions.filter(
    (s) => s.status === "completed",
  ).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Attendance Sessions
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? "View and manage all attendance tracking sessions"
              : "View your weekly lectures and attendance sessions"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mainTab === "sessions" && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh sessions"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs: Sessions vs Activities */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="sessions" className="gap-2">
            <LayoutList className="w-4 h-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="activities" className="gap-2">
            <CalendarDays className="w-4 h-4" />
            Activities
          </TabsTrigger>
          {canViewLecturerAttendance && (
            <TabsTrigger value="lecturer-attendance" className="gap-2">
              <FileText className="w-4 h-4" />
              Lecturer Attendance
            </TabsTrigger>
          )}
          {canViewMyAttendanceSheet && (
            <TabsTrigger value="my-attendance" className="gap-2">
              <FileText className="w-4 h-4" />
              My Attendance Sheet
            </TabsTrigger>
          )}
          {canViewMasterAttendanceSheet && (
            <TabsTrigger value="student-attendance" className="gap-2">
              <Users className="w-4 h-4" />
              Student Attendance Sheet
            </TabsTrigger>
          )}
        </TabsList>

        {/* Sessions Tab Content */}
        <TabsContent value="sessions" className="mt-6">
          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">
                Loading sessions...
              </span>
            </div>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <div className="flex items-center justify-between">
                <TabsList className="bg-card border border-border">
                  <TabsTrigger value="all">
                    All Sessions ({sessions.length})
                  </TabsTrigger>
                  <TabsTrigger value="active">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                      Active ({activeSessions})
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="completed">
                    Completed ({completedSessions})
                  </TabsTrigger>
                </TabsList>
                <div className="text-sm text-muted-foreground">
                  {filteredSessions.length} session
                  {filteredSessions.length !== 1 ? "s" : ""} shown
                </div>
              </div>

              <TabsContent value={activeTab} className="mt-6">
                {/* Weekly Lectures from Timetable - Grouped by Day */}
                {weeklyLectureSessions.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <BookOpen className="w-5 h-5 text-primary" />
                      <h2 className="text-lg font-semibold text-foreground">
                        This Week's Lectures
                      </h2>
                      <span className="text-sm text-muted-foreground">
                        (
                        {
                          weeklyLectureSessions.filter((s) => {
                            if (activeTab === "all") return true;
                            return s.status === activeTab;
                          }).length
                        }{" "}
                        lectures remaining)
                      </span>
                    </div>

                    {/* Group lectures by day */}
                    {Object.entries(lecturesByDay).map(
                      ([dayName, daySessions]) => {
                        const filteredDaySessions = daySessions.filter((s) => {
                          if (activeTab === "all") return true;
                          return s.status === activeTab;
                        });

                        if (filteredDaySessions.length === 0) return null;

                        const isToday =
                          dayNames[new Date().getDay()] === dayName;

                        return (
                          <div key={dayName} className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                              <h3
                                className={`text-md font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}
                              >
                                {dayName}
                                {isToday && (
                                  <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                    Today
                                  </span>
                                )}
                              </h3>
                              <span className="text-xs text-muted-foreground">
                                ({filteredDaySessions.length} lecture
                                {filteredDaySessions.length !== 1 ? "s" : ""})
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {filteredDaySessions.map((session) => (
                                <SessionCard
                                  key={session.id}
                                  session={session}
                                  user={user}
                                  onStart={handleStartSession}
                                  onCheckout={handleCheckout}
                                  onViewReport={handleViewReport}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                )}

                {/* API Sessions (if any) */}
                {filteredSessions.length > 0 && (
                  <>
                    {weeklyLectureSessions.length > 0 && (
                      <div className="flex items-center gap-2 mb-4">
                        <h2 className="text-lg font-semibold text-foreground">
                          Attendance Sessions
                        </h2>
                        <span className="text-sm text-muted-foreground">
                          ({filteredSessions.length})
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredSessions.map((session) => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          onStart={handleStartSession}
                          onEnd={handleEndSession}
                          onViewReport={handleViewReport}
                          onDelete={handleDeleteSession}
                          onToggleMode={handleToggleMode}
                          onGenerateQrCode={handleGenerateQrCode}
                          onCheckout={handleCheckout}
                          user={user}
                          isTogglingMode={togglingSessionId === session.id}
                          isDeleting={deletingSessionId === session.id}
                          isGeneratingQrCode={generatingQrCode === session.id}
                        />
                      ))}
                    </div>
                  </>
                )}

                {filteredSessions.length === 0 &&
                  weeklyLectureSessions.length === 0 && (
                    <div className="text-center py-12 bg-card rounded-xl border border-border">
                      <p className="text-muted-foreground">
                        {activeTab === "all"
                          ? "No lectures scheduled this week. Add activities in the Activities tab."
                          : `No ${activeTab} sessions found.`}
                      </p>
                    </div>
                  )}
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>

        {/* Activities / Timetable Tab Content */}
        <TabsContent value="activities" className="mt-6">
          <TimetableTab />
        </TabsContent>

        {/* Lecturer Attendance Tab Content */}
        {canViewLecturerAttendance && (
          <TabsContent value="lecturer-attendance" className="mt-6">
            <LecturerAttendanceTab />
          </TabsContent>
        )}

        {/* My Attendance Sheet Tab Content (Student/Rep personal view) */}
        {canViewMyAttendanceSheet && (
          <TabsContent value="my-attendance" className="mt-6">
            <MyAttendanceSheet />
          </TabsContent>
        )}

        {/* Student Attendance Sheet Tab Content (Master view for Rep/Lecturer) */}
        {canViewMasterAttendanceSheet && (
          <TabsContent value="student-attendance" className="mt-6">
            <MasterAttendanceSheet />
          </TabsContent>
        )}
      </Tabs>

      {/* Session Report Modal */}
      <SessionReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        session={selectedSession}
      />

      {/* QR Code Modal */}
      <Dialog open={qrCodeModalOpen} onOpenChange={setQrCodeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Session QR Code
            </DialogTitle>
            <DialogDescription>
              Scan this QR code to open the kiosk for &quot;{qrCodeSessionName}
              &quot;
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrCodeData && (
              <div className="bg-white p-4 rounded-lg shadow-inner">
                <img
                  src={qrCodeData}
                  alt="Session QR Code"
                  className="w-64 h-64 object-contain"
                />
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center">
              Students can scan this code to mark their attendance
            </p>
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setQrCodeModalOpen(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
              <Button
                variant="gradient"
                className="flex-1"
                onClick={handleDownloadQrCode}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SMS Link Modal for Session Start */}
      <Dialog open={smsModalOpen} onOpenChange={setSmsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Send Attendance Link
            </DialogTitle>
            <DialogDescription>
              Send a link to the lecturer&apos;s device for face recognition
              attendance.
            </DialogDescription>
          </DialogHeader>

          {startingSession && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <p>
                  <strong>Session:</strong> {startingSession.name}
                </p>
                <p>
                  <strong>Course:</strong> {startingSession.courseName}
                </p>
                <p>
                  <strong>Time:</strong>{" "}
                  {startingSession.startTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {startingSession.endTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  A link will be sent to the lecturer&apos;s registered phone
                  number:
                </p>
                <code className="text-xs bg-muted px-2 py-1 rounded break-all">
                  {window.location.origin}/kiosk/lecturer/
                  {startingSession.id.replace("timetable-", "")}
                </code>
              </div>

              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  The lecturer can use this link to verify their attendance
                  through face recognition, or sign manually on the attendance
                  sheet.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setSmsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSendSms}>
              <Send className="w-4 h-4 mr-2" />
              Send SMS
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sessions;
