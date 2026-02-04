import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, RefreshCw, QrCode, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SessionCard } from "@/components/sessions/SessionCard";
import { CreateSessionModal } from "@/components/sessions/CreateSessionModal";
import { SessionReportModal } from "@/components/sessions/SessionReportModal";
import {
  AttendanceSession,
  SessionAttendanceRecord,
  ExpectedAttendee,
} from "@/types/attendance";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
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
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] =
    useState<AttendanceSession | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  // Check if user can create sessions (only LECTURER and REP can create sessions)
  const canCreateSession =
    user?.role === Role.LECTURER || user?.role === Role.REP;

  // Check if user is admin (can see all sessions)
  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SYSTEM_ADMIN;

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

  // Handle creating a new session
  const handleCreateSession = (newSession: AttendanceSession) => {
    setSessions((prev) => [newSession, ...prev]);
    // Refresh sessions to get the actual data from the server
    setTimeout(() => fetchSessions(), 1000);
  };

  const handleStartSession = () => {
    toast.success("Session started! Kiosk mode is now active.");
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
              : "Create and manage your attendance tracking sessions"}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          {canCreateSession && (
            <Button variant="gradient" onClick={() => setCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Session
            </Button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">
            Loading sessions...
          </span>
        </div>
      ) : (
        <>
          {/* Tabs */}
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
                    user={user}
                    isTogglingMode={togglingSessionId === session.id}
                    isDeleting={deletingSessionId === session.id}
                    isGeneratingQrCode={generatingQrCode === session.id}
                  />
                ))}
              </div>

              {filteredSessions.length === 0 && (
                <div className="text-center py-12 bg-card rounded-xl border border-border">
                  <p className="text-muted-foreground">
                    {activeTab === "all"
                      ? "No sessions found."
                      : `No ${activeTab} sessions found.`}
                  </p>
                  {canCreateSession && activeTab === "all" && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setCreateModalOpen(true)}
                    >
                      Create your first session
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Create Session Modal */}
      <CreateSessionModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        user={user}
        onCreateSession={handleCreateSession}
      />

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
    </div>
  );
};

export default Sessions;
