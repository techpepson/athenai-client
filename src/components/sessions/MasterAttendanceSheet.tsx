/**
 * MasterAttendanceSheet Component
 * Displays the master attendance record for all students in a class.
 * Class Rep can edit; Lecturer has read-only view.
 * Uses AttendanceContext for shared state.
 */

import { useState, useMemo, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAttendance } from "@/contexts/AttendanceContext";
import { Role } from "@/enums/enums";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Format date for display
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
};

const MasterAttendanceSheet = () => {
  const { user } = useAuth();
  const {
    enrolledModules,
    activeSessions,
    attendanceRecords,
    markAttendance,
    loadTimetableSessions,
    refreshRecords,
  } = useAttendance();

  // Role-based permissions
  const isRep = user?.role === Role.REP;
  const isLecturer = user?.role === Role.LECTURER;
  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SYSTEM_ADMIN;
  const canEdit = isRep || isAdmin;
  const canView = isRep || isLecturer || isAdmin;

  // Selected session filter
  const [selectedSessionId, setSelectedSessionId] = useState<string>("all");

  // Track which sessions are collapsed (past sessions start collapsed)
  const [collapsedSessions, setCollapsedSessions] = useState<Set<string>>(
    new Set(),
  );

  const toggleCollapse = (sessionId: string) => {
    setCollapsedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  // Load timetable sessions on mount
  useEffect(() => {
    loadTimetableSessions();
    refreshRecords();
  }, [loadTimetableSessions, refreshRecords]);

  // Get unique sessions from active sessions that have attendance records
  const sessions = useMemo(() => {
    return activeSessions
      .filter((s) => enrolledModules.includes(s.moduleCode))
      .map((s) => ({
        sessionId: s.sessionId,
        date: s.date,
        moduleCode: s.moduleCode,
        topic: s.topic,
        week: s.week,
      }));
  }, [activeSessions, enrolledModules]);

  // Auto-collapse past sessions; keep today's / latest session expanded
  useEffect(() => {
    if (sessions.length === 0) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the latest session date (current or most recent)
    const latestSessionId = sessions.reduce((latest, s) => {
      if (!latest) return s.sessionId;
      const latestDate = new Date(
        sessions.find((x) => x.sessionId === latest)?.date || "",
      );
      const thisDate = new Date(s.date);
      return thisDate >= latestDate ? s.sessionId : latest;
    }, "");

    const toCollapse = new Set<string>();
    sessions.forEach((s) => {
      const sessionDate = new Date(s.date);
      sessionDate.setHours(0, 0, 0, 0);
      if (sessionDate < today && s.sessionId !== latestSessionId) {
        toCollapse.add(s.sessionId);
      }
    });
    setCollapsedSessions(toCollapse);
  }, [sessions]);

  // Filtered attendance records based on selected session
  const filteredRecords = useMemo(() => {
    let records = attendanceRecords.filter((r) =>
      enrolledModules.includes(r.moduleCode),
    );

    // Filter by selected session
    if (selectedSessionId !== "all") {
      records = records.filter((r) => r.sessionId === selectedSessionId);
    }

    // Sort by student name
    records.sort((a, b) => a.studentName.localeCompare(b.studentName));

    return records;
  }, [attendanceRecords, selectedSessionId, enrolledModules]);

  // Group records by session for display
  const recordsBySession = useMemo(() => {
    const grouped: Record<
      string,
      Array<{
        id: string;
        sessionId: string;
        slotId: string;
        studentId: string;
        studentName: string;
        moduleCode: string;
        moduleName: string;
        topic: string;
        date: string;
        week: number;
        status: "present" | "absent" | "pending";
      }>
    > = {};

    filteredRecords.forEach((record) => {
      if (!grouped[record.sessionId]) {
        grouped[record.sessionId] = [];
      }
      grouped[record.sessionId].push(record);
    });

    return grouped;
  }, [filteredRecords]);

  // Handle attendance status change (Class Rep only)
  const handleStatusChange = (
    sessionId: string,
    studentId: string,
    studentName: string,
    newStatus: "present" | "absent",
  ) => {
    if (!canEdit) return;

    markAttendance(sessionId, studentId, studentName, newStatus);

    toast.success(
      `Marked ${studentName} as ${newStatus === "present" ? "Present" : "Absent"}`,
    );
  };

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Access Restricted</h3>
        <p className="text-muted-foreground">
          You don't have permission to view the master attendance sheet.
        </p>
      </div>
    );
  }

  if (enrolledModules.length === 0) {
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

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Sessions Started</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Attendance records will appear here once sessions are started by the
          Level Rep.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Student Attendance Sheet</h2>
          <Badge variant="secondary" className="ml-2">
            {filteredRecords.length} records
          </Badge>
        </div>

        {/* Date/Session Dropdown */}
        <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Filter by session" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions</SelectItem>
            {sessions.map((session) => (
              <SelectItem key={session.sessionId} value={session.sessionId}>
                {formatDate(session.date)} - {session.moduleCode}:{" "}
                {session.topic}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Permission Info */}
      {isLecturer && (
        <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          You have read-only access to the attendance sheet.
        </div>
      )}

      {/* Attendance Tables by Session */}
      {Object.entries(recordsBySession).map(([sessionId, records]) => {
        const firstRecord = records[0];
        if (!firstRecord) return null;

        const presentCount = records.filter(
          (r) => r.status === "present",
        ).length;
        const absentCount = records.filter((r) => r.status === "absent").length;

        return (
          <div
            key={sessionId}
            className="border rounded-lg overflow-hidden bg-card"
          >
            {/* Session Header — click anywhere to expand/collapse */}
            <div
              className="bg-muted/50 p-4 border-b flex items-center justify-between cursor-pointer select-none hover:bg-muted/70 transition-colors"
              onClick={() => toggleCollapse(sessionId)}
            >
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">
                    Week {firstRecord.week} - {formatDate(firstRecord.date)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {firstRecord.moduleCode}: {firstRecord.topic}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-3 text-sm">
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700"
                  >
                    Present: {presentCount}
                  </Badge>
                  <Badge variant="outline" className="bg-red-50 text-red-700">
                    Absent: {absentCount}
                  </Badge>
                </div>
                {collapsedSessions.has(sessionId) ? (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Attendance Table — hidden when collapsed */}
            {!collapsedSessions.has(sessionId) && (
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[8%] text-center">S/N</TableHead>
                    <TableHead className="w-[32%]">Student Name</TableHead>
                    <TableHead className="w-[25%]">Student ID</TableHead>
                    <TableHead className="w-[35%] text-center">
                      Attendance Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record, idx) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-center font-medium text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{record.studentName}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {record.studentId}
                      </TableCell>
                      <TableCell className="text-center">
                        {canEdit ? (
                          // Editable status for Level Rep
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant={
                                record.status === "present"
                                  ? "default"
                                  : "outline"
                              }
                              className={cn(
                                "h-8 px-3",
                                record.status === "present"
                                  ? "bg-green-500 hover:bg-green-600 text-white"
                                  : "hover:bg-green-50 hover:text-green-700",
                              )}
                              onClick={() =>
                                handleStatusChange(
                                  record.sessionId,
                                  record.studentId,
                                  record.studentName,
                                  "present",
                                )
                              }
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Present
                            </Button>
                            <Button
                              size="sm"
                              variant={
                                record.status === "absent"
                                  ? "default"
                                  : "outline"
                              }
                              className={cn(
                                "h-8 px-3",
                                record.status === "absent"
                                  ? "bg-red-500 hover:bg-red-600 text-white"
                                  : "hover:bg-red-50 hover:text-red-700",
                              )}
                              onClick={() =>
                                handleStatusChange(
                                  record.sessionId,
                                  record.studentId,
                                  record.studentName,
                                  "absent",
                                )
                              }
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Absent
                            </Button>
                          </div>
                        ) : (
                          // Read-only status for Lecturer
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium cursor-default select-none",
                              record.status === "present"
                                ? "bg-green-500 text-white"
                                : record.status === "pending"
                                  ? "bg-yellow-500 text-white"
                                  : "bg-red-500 text-white",
                            )}
                          >
                            {record.status === "present" ? (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                Present
                              </>
                            ) : record.status === "pending" ? (
                              "Pending"
                            ) : (
                              <>
                                <XCircle className="w-4 h-4" />
                                Absent
                              </>
                            )}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MasterAttendanceSheet;
