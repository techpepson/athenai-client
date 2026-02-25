/**
 * MyAttendanceSheet Component
 * Displays the logged-in student's/rep's personal attendance record.
 * Shows:
 * - Week, Date, Topic, Sign In button, Attendance Status
 * - For active sessions: Sign In button is clickable
 * - For past sessions: Status shows Present/Absent
 */

import { useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    attendanceRecords,
    signIn,
    loadTimetableSessions,
    refreshRecords,
  } = useAttendance();

  // Get current user's student ID and name
  const currentStudentId = user?.student?.id || user?.id || "student-1";
  const currentStudentName = user?.name || "Current Student";

  // Load timetable sessions on mount
  useEffect(() => {
    loadTimetableSessions();
    refreshRecords();
  }, [loadTimetableSessions, refreshRecords]);

  // Combine active sessions with attendance records to build display data
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

    // Add all active sessions (started by rep)
    activeSessions
      .filter((s) => enrolledModules.includes(s.moduleCode))
      .forEach((session) => {
        // Check if student has attendance record for this session
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
  }, [activeSessions, enrolledModules, attendanceRecords, currentStudentId]);

  // Handle sign in
  const handleSignIn = (sessionId: string) => {
    signIn(sessionId, currentStudentId, currentStudentName);
    toast.success("Signed in successfully!");
  };

  // Check if user has enrolled modules
  const hasModules = enrolledModules.length > 0;

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
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">My Attendance Sheet</h2>
        <Badge variant="secondary" className="ml-2">
          {sessionData.length} session{sessionData.length !== 1 ? "s" : ""}
        </Badge>
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
            {sessionData.map((session) => (
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
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          Present:{" "}
          {
            sessionData.filter((s) => s.status === "present" || s.hasSignedIn)
              .length
          }
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          Absent:{" "}
          {
            sessionData.filter(
              (s) => s.status === "absent" && !s.hasSignedIn && !s.isActive,
            ).length
          }
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          Pending:{" "}
          {sessionData.filter((s) => s.isActive && !s.hasSignedIn).length}
        </div>
      </div>
    </div>
  );
};

export default MyAttendanceSheet;
