/**
 * MasterAttendanceSheet Component
 * Displays the master attendance record for all students in a session.
 * Class Rep can edit (mark present/absent via API); Lecturer has read-only view.
 * Fetches data from the backend API instead of using mock/localStorage data.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
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
  Loader2,
  RefreshCw,
  CheckSquare,
  FileSpreadsheet,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/enums/enums";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getCreatorSessions,
  getAllSessionsAdmin,
  getLecturerSessions,
  Session,
  Attendance,
} from "@/services/sessions.service";
import {
  markManualAttendance,
  markBulkManualAttendance,
} from "@/services/attendance.services";
import { usersServices } from "@/services/users.services";
import { modulesService, Module } from "@/services/modules.service";
import { IUser, IStudent, ILecturer } from "@/interface/user.interface";

// Format date for display
const formatDate = (dateStr: string | Date): string => {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
};

// Expected attendee computed from users at module level
interface ExpectedAttendee {
  userId: string;
  name: string;
  email: string;
  studentId: string;
}

const MasterAttendanceSheet = () => {
  const { user, token } = useAuth();

  // Role-based permissions
  const isRep = user?.role === Role.REP;
  const isLecturer = user?.role === Role.LECTURER;
  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SYSTEM_ADMIN;
  const canEdit = isRep || isAdmin;
  const canView = isRep || isLecturer || isAdmin;

  // Data state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [allUsers, setAllUsers] = useState<
    (IUser & {
      student?: IStudent | null;
      lecturer?: ILecturer | null;
    })[]
  >([]);
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [markingAttendance, setMarkingAttendance] = useState<string | null>(
    null,
  );
  const [bulkMarkingSession, setBulkMarkingSession] = useState<string | null>(
    null,
  );

  // Filter state
  const [selectedSessionId, setSelectedSessionId] = useState<string>("all");
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

  // Fetch data from backend
  const loadData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [sessionsRes, usersRes, modulesRes] = await Promise.all([
        isAdmin
          ? getAllSessionsAdmin(token)
          : isLecturer
            ? getLecturerSessions(token)
            : getCreatorSessions(token),
        usersServices.getAllUsers(),
        modulesService.getModules(),
      ]);

      if (sessionsRes.success && sessionsRes.data) {
        let sessionsData: Session[];
        if (isAdmin) {
          sessionsData =
            ((sessionsRes.data as Record<string, unknown>).data as Session[]) ||
            [];
        } else if (isLecturer) {
          // getLecturerSessions returns { data: Session[] }
          sessionsData = Array.isArray(sessionsRes.data)
            ? sessionsRes.data
            : ((sessionsRes.data as Record<string, unknown>)
                .data as Session[]) || [];
        } else {
          sessionsData =
            ((sessionsRes.data as Record<string, unknown>)
              .sessions as Session[]) || [];
        }
        // Sort by start time descending
        sessionsData.sort(
          (a, b) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
        );
        setSessions(sessionsData);
      }

      if (usersRes.success && usersRes.data) {
        const users =
          (usersRes.data as Record<string, unknown>).users ||
          (usersRes.data as Record<string, unknown>).data ||
          usersRes.data;
        setAllUsers(
          Array.isArray(users)
            ? (users as (IUser & {
                student?: IStudent | null;
                lecturer?: ILecturer | null;
              })[])
            : [],
        );
      }

      if (modulesRes.success && modulesRes.data?.data) {
        setAllModules(modulesRes.data.data);
      }
    } catch (error) {
      console.error("Failed to load attendance data:", error);
      toast.error("Failed to load attendance data");
    } finally {
      setIsLoading(false);
    }
  }, [token, isAdmin, isLecturer]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get expected attendees for a session based on module level
  const getExpectedAttendees = useCallback(
    (session: Session): ExpectedAttendee[] => {
      const moduleLevel =
        session.module?.level ||
        allModules.find((m) => m.id === session.moduleId)?.level;
      if (!moduleLevel || allUsers.length === 0) return [];

      // Students at this level
      return allUsers
        .filter((u) => u.student && u.student.level === moduleLevel)
        .map((u) => ({
          userId: u.id,
          name: u.name,
          email: u.email,
          studentId: u.student?.studentId || u.student?.matricNo || "",
        }));
    },
    [allUsers, allModules],
  );

  // Get attendance record for a user in a session
  const getAttendanceForUser = (
    session: Session,
    userId: string,
  ): Attendance | undefined => {
    return session.attendances?.find((a) => a.userId === userId);
  };

  // Handle manual attendance marking via API
  const handleStatusChange = async (
    sessionId: string,
    userId: string,
    userName: string,
    newStatus: string,
  ) => {
    if (!canEdit || !token) return;
    const key = `${sessionId}-${userId}`;
    setMarkingAttendance(key);
    try {
      const res = await markManualAttendance(
        sessionId,
        userId,
        newStatus,
        undefined,
        token,
      );
      if (res.success) {
        // Update local sessions state to reflect the change
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== sessionId) return s;
            const updatedAttendances = [...(s.attendances || [])];
            const existingIdx = updatedAttendances.findIndex(
              (a) => a.userId === userId,
            );
            if (existingIdx >= 0) {
              updatedAttendances[existingIdx] = {
                ...updatedAttendances[existingIdx],
                status: newStatus as Attendance["status"],
              };
            } else {
              updatedAttendances.push({
                id:
                  (res.data as ManualAttendanceResult)?.id ||
                  `temp-${Date.now()}`,
                sessionId,
                userId,
                timestamp: new Date(),
                status: newStatus as Attendance["status"],
              });
            }
            return { ...s, attendances: updatedAttendances };
          }),
        );
        toast.success(`Marked ${userName} as ${newStatus}`);
      } else {
        toast.error(res.error || "Failed to mark attendance");
      }
    } catch {
      toast.error("Failed to mark attendance");
    } finally {
      setMarkingAttendance(null);
    }
  };

  // Bulk mark all unmarked students as present for a session
  const handleBulkMarkPresent = async (session: Session) => {
    if (!canEdit || !token) return;
    const expected = getExpectedAttendees(session);
    const toMark = expected.filter((att) => {
      const record = getAttendanceForUser(session, att.userId);
      const st = record?.status;
      return !st || st === "ABSENT";
    });
    if (toMark.length === 0) {
      toast.info("All students are already marked as present");
      return;
    }
    setBulkMarkingSession(session.id);
    try {
      const records = toMark.map((a) => ({
        userId: a.userId,
        status: "PRESENT",
      }));
      const res = await markBulkManualAttendance(session.id, records, token);
      if (res.success && res.data) {
        const data = res.data as {
          results?: { userId: string; success: boolean }[];
          errors?: { userId: string; success: boolean }[];
        };
        const successIds = new Set(
          data.results?.filter((r) => r.success).map((r) => r.userId) || [],
        );
        const errorCount = data.errors?.length || 0;
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== session.id) return s;
            const atts = [...(s.attendances || [])];
            successIds.forEach((uid) => {
              const idx = atts.findIndex((a) => a.userId === uid);
              if (idx >= 0) {
                atts[idx] = {
                  ...atts[idx],
                  status: "PRESENT" as Attendance["status"],
                };
              } else {
                atts.push({
                  id: `temp-${Date.now()}-${uid}`,
                  sessionId: session.id,
                  userId: uid,
                  timestamp: new Date(),
                  status: "PRESENT" as Attendance["status"],
                });
              }
            });
            return { ...s, attendances: atts };
          }),
        );
        if (successIds.size > 0) {
          toast.success(
            `Marked ${successIds.size} student${successIds.size !== 1 ? "s" : ""} as Present`,
          );
        }
        if (errorCount > 0) {
          toast.error(
            `${errorCount} record${errorCount !== 1 ? "s" : ""} failed`,
          );
        }
      } else {
        toast.error(res.error || "Bulk marking failed");
      }
    } catch {
      toast.error("Bulk marking failed");
    } finally {
      setBulkMarkingSession(null);
    }
  };

  // Export attendance to Excel
  const exportToExcel = () => {
    const rows: Record<string, string | number>[] = [];
    let sn = 0;
    filteredSessions.forEach((session) => {
      const expected = getExpectedAttendees(session);
      const mod =
        session.module ?? allModules.find((m) => m.id === session.moduleId);
      expected.forEach((att) => {
        sn++;
        const record = getAttendanceForUser(session, att.userId);
        rows.push({
          "S/N": sn,
          "Session Date": formatDate(session.startTime),
          "Module Code": mod?.code || "",
          Module: mod?.name || "",
          Topic: session.subtopic?.name || session.name,
          "Student Name": att.name,
          "Student ID": att.studentId,
          Status: record?.status || "ABSENT",
          "Session Status": session.status === "OPEN" ? "Open" : "Closed",
        });
      });
    });
    if (rows.length === 0) {
      toast.info("No data to export");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Student Attendance");
    XLSX.writeFile(wb, "student_attendance.xlsx");
    toast.success("Exported to Excel");
  };

  // Auto-collapse past sessions
  useEffect(() => {
    if (sessions.length === 0) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const latestSession = sessions.reduce((latest, s) => {
      if (!latest) return s;
      return new Date(s.startTime) > new Date(latest.startTime) ? s : latest;
    }, sessions[0]);

    const toCollapse = new Set<string>();
    sessions.forEach((s) => {
      const sessionDate = new Date(s.startTime);
      sessionDate.setHours(0, 0, 0, 0);
      if (sessionDate < today && s.id !== latestSession?.id) {
        toCollapse.add(s.id);
      }
    });
    setCollapsedSessions(toCollapse);
  }, [sessions]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    if (selectedSessionId === "all") return sessions;
    return sessions.filter((s) => s.id === selectedSessionId);
  }, [sessions, selectedSessionId]);

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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading attendance data...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Sessions Found</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Attendance records will appear here once sessions are started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Student Attendance Sheet</h2>
          <Badge variant="secondary" className="ml-2">
            {filteredSessions.length} session
            {filteredSessions.length !== 1 ? "s" : ""}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="ml-2"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              disabled={bulkMarkingSession !== null}
              onClick={() => {
                filteredSessions.forEach((s) => handleBulkMarkPresent(s));
              }}
            >
              {bulkMarkingSession ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckSquare className="w-4 h-4 mr-2" />
              )}
              Mark All Present
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Session Filter */}
      <div className="flex items-center justify-end">
        <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Filter by session" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions</SelectItem>
            {sessions.map((session) => (
              <SelectItem key={session.id} value={session.id}>
                {formatDate(session.startTime)} -{" "}
                {session.module?.code || session.course?.code || ""}:{" "}
                {session.subtopic?.name || session.name}
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
      {filteredSessions.map((session) => {
        const expectedAttendees = getExpectedAttendees(session);
        const presentCount =
          session.attendances?.filter(
            (a) =>
              a.status === "PRESENT" ||
              a.status === "LATE" ||
              a.status === "CHECKED_IN",
          ).length || 0;
        const absentCount = Math.max(
          0,
          expectedAttendees.length - presentCount,
        );

        return (
          <div
            key={session.id}
            className="border rounded-lg overflow-x-auto bg-card"
          >
            {/* Session Header — click to expand/collapse */}
            <div
              className="bg-muted/50 p-3 sm:p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between cursor-pointer select-none hover:bg-muted/70 transition-colors gap-2"
              onClick={() => toggleCollapse(session.id)}
            >
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">
                    {session.week ? `Week ${session.week} - ` : ""}
                    {formatDate(session.startTime)}
                  </span>
                  {session.status === "OPEN" && (
                    <Badge className="bg-green-500 hover:bg-green-500 text-white ml-2">
                      Live
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {session.module?.code || session.course?.code || ""}:{" "}
                  {session.subtopic?.name || session.name}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={bulkMarkingSession === session.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBulkMarkPresent(session);
                    }}
                  >
                    {bulkMarkingSession === session.id ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <CheckSquare className="w-3 h-3 mr-1" />
                    )}
                    Mark All
                  </Button>
                )}
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
                {collapsedSessions.has(session.id) ? (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Attendance Table */}
            {!collapsedSessions.has(session.id) && (
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
                  {expectedAttendees.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No students found for this module level.
                      </TableCell>
                    </TableRow>
                  ) : (
                    expectedAttendees.map((attendee, idx) => {
                      const attendance = getAttendanceForUser(
                        session,
                        attendee.userId,
                      );
                      const status = attendance?.status || "ABSENT";
                      const isPresent =
                        status === "PRESENT" ||
                        status === "LATE" ||
                        status === "CHECKED_IN";
                      const isMarking =
                        markingAttendance ===
                        `${session.id}-${attendee.userId}`;

                      return (
                        <TableRow key={attendee.userId}>
                          <TableCell className="text-center font-medium text-muted-foreground">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{attendee.name}</div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {attendee.studentId}
                          </TableCell>
                          <TableCell className="text-center">
                            {canEdit ? (
                              // Editable status for Level Rep / Admin
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  size="sm"
                                  variant={isPresent ? "default" : "outline"}
                                  className={cn(
                                    "h-8 px-3",
                                    isPresent
                                      ? "bg-green-500 hover:bg-green-600 text-white"
                                      : "hover:bg-green-50 hover:text-green-700",
                                  )}
                                  disabled={isMarking}
                                  onClick={() =>
                                    handleStatusChange(
                                      session.id,
                                      attendee.userId,
                                      attendee.name,
                                      "PRESENT",
                                    )
                                  }
                                >
                                  {isMarking ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                  )}
                                  Present
                                </Button>
                                <Button
                                  size="sm"
                                  variant={!isPresent ? "default" : "outline"}
                                  className={cn(
                                    "h-8 px-3",
                                    !isPresent
                                      ? "bg-red-500 hover:bg-red-600 text-white"
                                      : "hover:bg-red-50 hover:text-red-700",
                                  )}
                                  disabled={isMarking}
                                  onClick={() =>
                                    handleStatusChange(
                                      session.id,
                                      attendee.userId,
                                      attendee.name,
                                      "ABSENT",
                                    )
                                  }
                                >
                                  {isMarking ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <XCircle className="w-4 h-4 mr-1" />
                                  )}
                                  Absent
                                </Button>
                              </div>
                            ) : (
                              // Read-only status for Lecturer
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium cursor-default select-none",
                                  isPresent
                                    ? "bg-green-500 text-white"
                                    : status === "LATE"
                                      ? "bg-yellow-500 text-white"
                                      : "bg-red-500 text-white",
                                )}
                              >
                                {isPresent ? (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    {status === "LATE" ? "Late" : "Present"}
                                  </>
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
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Type for the manual attendance API response
interface ManualAttendanceResult {
  id: string;
}

export default MasterAttendanceSheet;
