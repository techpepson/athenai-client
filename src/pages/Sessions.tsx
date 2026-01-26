import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SessionCard } from "@/components/sessions/SessionCard";
import { CreateSessionModal } from "@/components/sessions/CreateSessionModal";
import { SessionReportModal } from "@/components/sessions/SessionReportModal";
import { AttendanceSession } from "@/types/attendance";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useSession } from "@/contexts/SessionContext";

const Sessions = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] =
    useState<AttendanceSession | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const { user } = useAuth();

  // Get sessions from context
  const { sessions, addSession } = useSession();

  // Filter sessions based on user role and course association
  const getVisibleSessions = () => {
    return sessions.filter((session) => {
      // Super admin and admin can see all sessions
      if (user?.role === "super_admin" || user?.role === "admin") {
        return true;
      }

      // Lecturers can see sessions for courses they teach
      if (user?.role === "lecturer" && user.coursesTaught) {
        const coursesTaught = Array.isArray(user.coursesTaught)
          ? user.coursesTaught
          : [user.coursesTaught];
        if (session.courseId && coursesTaught.includes(session.courseId)) {
          return true;
        }
      }

      // Course reps can see sessions for courses they handle
      if (user?.isCourseRep && user.courseRepData) {
        const courseRepCourseIds = user.courseRepData.map((c) => c.courseId);
        if (session.courseId && courseRepCourseIds.includes(session.courseId)) {
          return true;
        }
      }

      // Staff can see sessions they created
      if (user?.role === "staff" && session.createdBy === user.id) {
        return true;
      }

      // Students can only see active sessions for their courses
      if (user?.role === "student" && !user.isCourseRep) {
        const coursesTaken = Array.isArray(user.coursesTaken)
          ? user.coursesTaken
          : user.coursesTaken
            ? [user.coursesTaken]
            : [];
        if (
          session.status === "active" &&
          session.courseId &&
          coursesTaken.includes(session.courseId)
        ) {
          return true;
        }
      }

      return false;
    });
  };

  // Filter sessions based on active tab
  const filteredSessions = getVisibleSessions().filter((session) => {
    if (activeTab === "all") return true;
    return session.status === activeTab;
  });

  // Handle creating a new session
  const handleCreateSession = (newSession: AttendanceSession) => {
    addSession(newSession);
  };

  const handleStartSession = () => {
    toast.success("Session started! Kiosk mode is now active.");
  };

  const handleEndSession = () => {
    toast.info("Session ended. Report is being generated.");
  };

  const handleViewReport = (session: AttendanceSession) => {
    setSelectedSession(session);
    setReportModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Attendance Sessions
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage attendance tracking sessions
          </p>
        </div>
        {(user?.role === "super_admin" ||
          user?.role === "admin" ||
          user?.role === "lecturer" ||
          user?.isCourseRep) && (
          <Button variant="gradient" onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Session
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="all">All Sessions</TabsTrigger>
            <TabsTrigger value="active">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                Active
              </span>
            </TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          <div className="text-sm text-muted-foreground">
            {filteredSessions.length} session
            {filteredSessions.length !== 1 ? "s" : ""}
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
                user={user}
              />
            ))}
          </div>

          {filteredSessions.length === 0 && (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <p className="text-muted-foreground">No sessions found.</p>
              {(user?.role === "super_admin" ||
                user?.role === "admin" ||
                user?.role === "lecturer" ||
                user?.isCourseRep) && (
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
    </div>
  );
};

export default Sessions;
