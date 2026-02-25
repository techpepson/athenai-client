/**
 * MyAttendanceSheet Component
 * Displays the logged-in student's/rep's personal attendance record.
 * Shows:
 * - Week, Date, Topic, Sign In button, Attendance Status
 * - For active sessions: Sign In button is clickable
 * - For past sessions: Status shows Present/Absent
 */

import { useMemo, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
  LogIn,
  Filter,
  Clock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAttendance } from "@/contexts/AttendanceContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Format date for display
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
};

const MyAttendanceSheet = () => {
  const { user } = useAuth();
  const {
    enrolledModules,
    activeSessions,
    timetableSessions,
    attendanceRecords,
    signIn,
    loadTimetableSessions,
    refreshRecords,
  } = useAttendance();

  // Get current user's student ID and name
  const currentStudentId = user?.student?.id || user?.id || "student-1";
  const currentStudentName = user?.name || "Current Student";

  // Topic filter state — "all" means no filter
  const [selectedTopic, setSelectedTopic] = useState<string>("all");

  // Load timetable sessions on mount
  useEffect(() => {
    loadTimetableSessions();
    refreshRecords();
  }, [loadTimetableSessions, refreshRecords]);

  // Get unique topics from timetable sessions for the filter dropdown
  const availableTopics = useMemo(() => {
    const seen = new Map<string, { topic: string; moduleCode: string }>();
    timetableSessions
      .filter((s) => enrolledModules.includes(s.moduleCode))
      .forEach((s) => {
        if (!seen.has(s.topic)) {
          seen.set(s.topic, { topic: s.topic, moduleCode: s.moduleCode });
        }
      });
    return Array.from(seen.values());
  }, [timetableSessions, enrolledModules]);

  // Auto-select topic from the active/just-started session
  const autoSelectTopicFromActive = () => {
    const activeSession = activeSessions.find((s) =>
      enrolledModules.includes(s.moduleCode),
    );
    if (activeSession) {
      setSelectedTopic(activeSession.topic);
    }
  };

  // On mount: if there's already an active session, pre-select its topic
  useEffect(() => {
    autoSelectTopicFromActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessions]);

  // Listen for session-started event and auto-select that topic
  useEffect(() => {
    const handleSessionStarted = () => {
      // Short delay to let localStorage settle
      setTimeout(() => {
        refreshRecords();
        loadTimetableSessions();
        autoSelectTopicFromActive();
      }, 100);
    };
    window.addEventListener("session-started", handleSessionStarted);
    return () =>
      window.removeEventListener("session-started", handleSessionStarted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessions, enrolledModules]);

  // Build session data from timetableSessions (ALL weeks) for enrolled modules
  const sessionData = useMemo(() => {
    const data: Array<{
      sessionId: string;
      slotId: string;
      week: number;
      date: string;
      topic: string;
      moduleCode: string;
      moduleName: string;
      isActive: boolean;
      hasSignedIn: boolean;
      status: "present" | "absent" | "pending";
    }> = [];

    timetableSessions
      .filter((s) => enrolledModules.includes(s.moduleCode))
      .forEach((session) => {
        const record = attendanceRecords.find(
          (r) =>
            r.sessionId === session.sessionId &&
            r.studentId === currentStudentId,
        );

        data.push({
          sessionId: session.sessionId,
          slotId: session.slotId,
          week: session.week,
          date: session.date,
          topic: session.topic,
          moduleCode: session.moduleCode,
          moduleName: session.moduleName,
          isActive: session.isActive,
          hasSignedIn: record?.status === "present",
          status: record
            ? record.status
            : session.isActive
              ? "pending"
              : "absent",
        });
      });

    // Sort by week then date
    data.sort((a, b) => {
      if (a.week !== b.week) return a.week - b.week;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return data;
  }, [timetableSessions, enrolledModules, attendanceRecords, currentStudentId]);

  // Apply topic filter
  const filteredSessionData = useMemo(() => {
    if (selectedTopic === "all") return sessionData;
    return sessionData.filter((s) => s.topic === selectedTopic);
  }, [sessionData, selectedTopic]);

  // Is the currently selected topic active right now?
  const isSelectedTopicActive = useMemo(() => {
    if (selectedTopic === "all") return false;
    return activeSessions.some((s) => s.topic === selectedTopic && s.isActive);
  }, [activeSessions, selectedTopic]);

  // Check if user has enrolled modules
  const hasModules = enrolledModules.length > 0;

  // Handle sign in
  const handleSignIn = (sessionId: string) => {
    signIn(sessionId, currentStudentId, currentStudentName);
    toast.success("Signed in successfully!");
  };

  if (!hasModules) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Modules Enrolled</h3>
        <p className="text-muted-foreground text-center max-w-md">
          You haven't enrolled in any modules yet.
          <br />
          Go to <strong>Settings → Profile</strong> to enroll in modules.
        </p>
      </div>
    );
  }

  if (sessionData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Sessions Started Yet</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Your attendance will appear here once sessions are started by the
          class rep.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">My Attendance Sheet</h2>
          <Badge variant="secondary" className="ml-2">
            {filteredSessionData.length} session
            {filteredSessionData.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Topic Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Topic:</span>
          <Select value={selectedTopic} onValueChange={setSelectedTopic}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="All Topics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              {availableTopics.map((t) => (
                <SelectItem key={t.topic} value={t.topic}>
                  {t.topic}
                  <span className="ml-1 text-muted-foreground text-xs">
                    ({t.moduleCode})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isSelectedTopicActive && (
            <Badge className="bg-green-500 hover:bg-green-500 text-white gap-1">
              <Clock className="w-3 h-3" />
              Active
            </Badge>
          )}
        </div>
      </div>

      {/* Attendance Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px]">Week</TableHead>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead className="w-[120px] text-center">Sign In</TableHead>
              <TableHead className="w-[160px] text-center">
                Attendance Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSessionData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  No sessions found for the selected topic.
                </TableCell>
              </TableRow>
            ) : (
              filteredSessionData.map((session) => (
                <TableRow key={session.sessionId}>
                  <TableCell className="font-medium">
                    Week {session.week}
                  </TableCell>
                  <TableCell>{formatDate(session.date)}</TableCell>
                  <TableCell className="max-w-[250px]">
                    <div>
                      <span className="font-medium text-xs text-muted-foreground">
                        {session.moduleCode}
                      </span>
                      <br />
                      <span className="truncate">{session.topic}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {session.isActive && !session.hasSignedIn ? (
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleSignIn(session.sessionId)}
                      >
                        <LogIn className="w-4 h-4 mr-1" />
                        Sign In
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {session.status === "present" || session.hasSignedIn ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium cursor-default select-none",
                          "bg-green-500 text-white",
                        )}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Present
                      </span>
                    ) : session.status === "pending" ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium cursor-default select-none",
                          "bg-yellow-500 text-white",
                        )}
                      >
                        Pending
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium cursor-default select-none",
                          "bg-red-500 text-white",
                        )}
                      >
                        <XCircle className="w-4 h-4" />
                        Absent
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          Present:{" "}
          {
            filteredSessionData.filter(
              (s) => s.status === "present" || s.hasSignedIn,
            ).length
          }
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          Absent:{" "}
          {
            filteredSessionData.filter(
              (s) => s.status === "absent" && !s.hasSignedIn && !s.isActive,
            ).length
          }
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          Pending:{" "}
          {
            filteredSessionData.filter((s) => s.isActive && !s.hasSignedIn)
              .length
          }
        </div>
      </div>
    </div>
  );
};

export default MyAttendanceSheet;
