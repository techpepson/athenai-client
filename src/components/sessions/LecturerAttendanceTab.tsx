/**
 * LecturerAttendanceTab Component
 *
 * Displays open sessions at the logged-in rep's level, showing the lecturer
 * assigned to each session's subtopic. Reps/Admins can mark lecturers as
 * Present or Absent via the manual attendance API, including bulk operations.
 *
 * Data is fetched entirely from the backend - no localStorage.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  BookOpen,
  GraduationCap,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Loader2,
  RefreshCw,
  CheckSquare,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/enums/enums";
import { cn } from "@/lib/utils";
import {
  getCreatorSessions,
  getAllSessionsAdmin,
  Session,
} from "@/services/sessions.service";
import {
  markManualAttendance,
  markBulkManualAttendance,
} from "@/services/attendance.services";
import { modulesService, Module } from "@/services/modules.service";

/* helpers */

const formatDate = (dateStr: string | Date): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
};

const formatTime = (dateStr: string | Date): string => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const durationHours = (start: string | Date, end: string | Date): string => {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return (ms / 3_600_000).toFixed(1);
};

/* derived row type */

interface LecturerRow {
  sessionId: string;
  session: Session;
  week: number | undefined;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  moduleCode: string;
  moduleName: string;
  subtopicName: string;
  lecturerUserId: string | undefined;
  lecturerName: string;
  status: "PRESENT" | "LATE" | "CHECKED_IN" | "ABSENT" | "EXCUSED" | "UNMARKED";
  isOpen: boolean;
}

/* Component */

const LecturerAttendanceTab = () => {
  const { user, token } = useAuth();

  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SYSTEM_ADMIN;
  const isRep = user?.role === Role.REP;
  const isLecturer = user?.role === Role.LECTURER;
  const canEdit = isRep || isAdmin;
  const canView = isAdmin || isRep || isLecturer;

  /* state */
  const [sessions, setSessions] = useState<Session[]>([]);
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [markingKey, setMarkingKey] = useState<string | null>(null);
  const [bulkMarking, setBulkMarking] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string>("all");

  /* data fetch */
  const loadData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [sessionsRes, modulesRes] = await Promise.all([
        isAdmin ? getAllSessionsAdmin(token) : getCreatorSessions(token),
        modulesService.getModules(),
      ]);

      if (sessionsRes.success && sessionsRes.data) {
        const list = isAdmin
          ? ((sessionsRes.data as Record<string, unknown>).data as Session[]) ||
            []
          : ((sessionsRes.data as Record<string, unknown>)
              .sessions as Session[]) || [];
        list.sort(
          (a, b) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
        );
        setSessions(list);
      }

      if (modulesRes.success && modulesRes.data?.data) {
        setAllModules(modulesRes.data.data);
      }
    } catch (err) {
      console.error("Failed to load lecturer attendance data:", err);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [token, isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* derive rows from sessions */
  const rows: LecturerRow[] = useMemo(() => {
    const repLevel = user?.student?.level;

    return sessions
      .filter((s) => {
        // Must have a subtopic (i.e. a lecturer assignment)
        if (!s.subtopicId && !s.subtopic) return false;

        // Filter to the rep's level unless admin
        if (!isAdmin && repLevel) {
          const moduleLevel =
            s.module?.level ??
            allModules.find((m) => m.id === s.moduleId)?.level;
          if (moduleLevel && moduleLevel !== repLevel) return false;
        }

        return true;
      })
      .map((s) => {
        const mod = s.module ?? allModules.find((m) => m.id === s.moduleId);
        const subtopicName = s.subtopic?.name ?? "Lecture";

        // Look up the subtopic from modules data (has lecturerName populated)
        const moduleSubtopic = s.subtopicId
          ? (mod?.subtopics?.find((st) => st.id === s.subtopicId) ??
            allModules
              .flatMap((m) => m.subtopics ?? [])
              .find((st) => st.id === s.subtopicId))
          : undefined;

        // Resolve lecturer name - try session data first, then fall back to modules data
        const lecturerUserId =
          s.subtopic?.lecturerId ??
          s.subtopic?.lecturer?.id ??
          moduleSubtopic?.lecturerId ??
          s.lecturer?.userId;

        const lecturerName =
          s.subtopic?.lecturerName ??
          s.subtopic?.lecturer?.name ??
          s.lecturer?.user?.name ??
          moduleSubtopic?.lecturerName ??
          moduleSubtopic?.lecturer?.name ??
          "Not Assigned";

        // Check if attendance already recorded for this lecturer
        const lecturerAttendance = s.attendances?.find(
          (a) => a.userId === lecturerUserId,
        );

        const status =
          (lecturerAttendance?.status as LecturerRow["status"]) ?? "UNMARKED";

        return {
          sessionId: s.id,
          session: s,
          week: s.week ?? undefined,
          date: formatDate(s.startTime),
          startTime: formatTime(s.startTime),
          endTime: formatTime(s.endTime),
          duration: durationHours(s.startTime, s.endTime),
          moduleCode: mod?.code ?? "",
          moduleName: mod?.name ?? "",
          subtopicName,
          lecturerUserId,
          lecturerName,
          status,
          isOpen: s.status === "OPEN",
        };
      });
  }, [sessions, allModules, user?.student?.level, isAdmin]);

  /* available modules for filter */
  const availableModuleCodes = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.moduleCode) set.add(r.moduleCode);
    });
    return Array.from(set).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (selectedModule === "all") return rows;
    return rows.filter((r) => r.moduleCode === selectedModule);
  }, [rows, selectedModule]);

  /* mark single lecturer */
  const handleMark = async (
    row: LecturerRow,
    newStatus: "PRESENT" | "ABSENT",
  ) => {
    if (!canEdit || !token || !row.lecturerUserId) return;
    const key = `${row.sessionId}-${row.lecturerUserId}`;
    setMarkingKey(key);
    try {
      const res = await markManualAttendance(
        row.sessionId,
        row.lecturerUserId,
        newStatus,
        undefined,
        token,
      );
      if (res.success) {
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== row.sessionId) return s;
            const atts = [...(s.attendances || [])];
            const idx = atts.findIndex((a) => a.userId === row.lecturerUserId);
            if (idx >= 0) {
              atts[idx] = { ...atts[idx], status: newStatus as never };
            } else {
              atts.push({
                id: `temp-${Date.now()}`,
                sessionId: row.sessionId,
                userId: row.lecturerUserId!,
                timestamp: new Date(),
                status: newStatus as never,
              });
            }
            return { ...s, attendances: atts };
          }),
        );
        toast.success(`Marked ${row.lecturerName} as ${newStatus}`);
      } else {
        toast.error(res.error || "Failed to mark attendance");
      }
    } catch {
      toast.error("Failed to mark attendance");
    } finally {
      setMarkingKey(null);
    }
  };

  /* bulk mark all unmarked as present */
  const handleBulkMarkPresent = async () => {
    if (!canEdit || !token) return;

    const toMark = filteredRows.filter(
      (r) =>
        r.lecturerUserId &&
        r.isOpen &&
        (r.status === "UNMARKED" || r.status === "ABSENT"),
    );

    if (toMark.length === 0) {
      toast.info("No unmarked lecturers to update");
      return;
    }

    // Group by session for bulk API calls
    const bySession = new Map<string, { userId: string; status: string }[]>();
    toMark.forEach((r) => {
      if (!bySession.has(r.sessionId)) bySession.set(r.sessionId, []);
      bySession.get(r.sessionId)!.push({
        userId: r.lecturerUserId!,
        status: "PRESENT",
      });
    });

    setBulkMarking(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const [sessionId, records] of bySession) {
        const res = await markBulkManualAttendance(sessionId, records, token);
        if (res.success && res.data) {
          const data = res.data as {
            results?: { userId: string; success: boolean }[];
            errors?: { userId: string; success: boolean }[];
          };
          successCount += data.results?.filter((r) => r.success).length || 0;
          errorCount += data.errors?.length || 0;

          const successUserIds = new Set(
            data.results?.filter((r) => r.success).map((r) => r.userId) || [],
          );
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id !== sessionId) return s;
              const atts = [...(s.attendances || [])];
              successUserIds.forEach((uid) => {
                const idx = atts.findIndex((a) => a.userId === uid);
                if (idx >= 0) {
                  atts[idx] = { ...atts[idx], status: "PRESENT" as never };
                } else {
                  atts.push({
                    id: `temp-${Date.now()}-${uid}`,
                    sessionId,
                    userId: uid,
                    timestamp: new Date(),
                    status: "PRESENT" as never,
                  });
                }
              });
              return { ...s, attendances: atts };
            }),
          );
        } else {
          errorCount += records.length;
        }
      }

      if (successCount > 0) {
        toast.success(
          `Marked ${successCount} lecturer${successCount !== 1 ? "s" : ""} as Present`,
        );
      }
      if (errorCount > 0) {
        toast.error(
          `${errorCount} record${errorCount !== 1 ? "s" : ""} failed`,
        );
      }
    } catch {
      toast.error("Bulk marking failed");
    } finally {
      setBulkMarking(false);
    }
  };

  /* export */
  const exportToExcel = () => {
    const data = filteredRows.map((r, i) => ({
      "S/N": i + 1,
      Week: r.week ?? "",
      Date: r.date,
      "Start Time": r.startTime,
      "End Time": r.endTime,
      "Duration (hrs)": r.duration,
      "Module Code": r.moduleCode,
      Module: r.moduleName,
      Topic: r.subtopicName,
      Lecturer: r.lecturerName,
      Status: r.status === "UNMARKED" ? "\u2014" : r.status,
      "Session Status": r.isOpen ? "Open" : "Closed",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lecturer Attendance");
    XLSX.writeFile(wb, "lecturer_attendance.xlsx");
  };

  /* stats */
  const stats = useMemo(() => {
    const present = filteredRows.filter(
      (r) =>
        r.status === "PRESENT" ||
        r.status === "LATE" ||
        r.status === "CHECKED_IN",
    ).length;
    const absent = filteredRows.filter((r) => r.status === "ABSENT").length;
    const unmarked = filteredRows.filter((r) => r.status === "UNMARKED").length;
    return { present, absent, unmarked, total: filteredRows.length };
  }, [filteredRows]);

  /* render guards */
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Access Restricted</h3>
        <p className="text-muted-foreground">
          You do not have permission to view lecturer attendance records.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">
          Loading lecturer attendance data...
        </p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Sessions Found</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Lecturer attendance records will appear here once sessions with
          assigned lecturers are created.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Lecturer Attendance Record</h2>
          <Badge variant="secondary" className="ml-2">
            {filteredRows.length} session{filteredRows.length !== 1 ? "s" : ""}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="ml-1"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Module filter */}
          <Select value={selectedModule} onValueChange={setSelectedModule}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {availableModuleCodes.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              disabled={bulkMarking}
              onClick={handleBulkMarkPresent}
            >
              {bulkMarking ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckSquare className="w-4 h-4 mr-2" />
              )}
              Mark All Present
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={exportToExcel}>
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Programme info */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" />
            <span className="font-medium">Programme:</span>
            <span className="text-muted-foreground">MBChB</span>
          </div>
          {user?.student?.level && (
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="font-medium">Level:</span>
              <span className="text-muted-foreground">
                {user.student.level}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-medium">Year:</span>
            <span className="text-muted-foreground">
              {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          Present: {stats.present}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          Absent: {stats.absent}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-gray-400" />
          Unmarked: {stats.unmarked}
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[5%] text-center font-semibold">
                S/N
              </TableHead>
              <TableHead className="w-[7%] text-center font-semibold">
                Week
              </TableHead>
              <TableHead className="w-[10%] font-semibold">Date</TableHead>
              <TableHead className="w-[9%] font-semibold">Start</TableHead>
              <TableHead className="w-[9%] font-semibold">End</TableHead>
              <TableHead className="w-[7%] text-center font-semibold">
                Hrs
              </TableHead>
              <TableHead className="w-[12%] font-semibold">Module</TableHead>
              <TableHead className="w-[14%] font-semibold">Topic</TableHead>
              <TableHead className="w-[13%] font-semibold">Lecturer</TableHead>
              <TableHead className="w-[14%] text-center font-semibold">
                Attendance
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center py-8 text-muted-foreground"
                >
                  No sessions match the selected filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row, idx) => {
                const key = `${row.sessionId}-${row.lecturerUserId}`;
                const isMarking = markingKey === key;
                const isPresent =
                  row.status === "PRESENT" ||
                  row.status === "LATE" ||
                  row.status === "CHECKED_IN";

                return (
                  <TableRow
                    key={row.sessionId}
                    className={cn(
                      "transition-colors",
                      row.isOpen ? "bg-success/5" : "",
                    )}
                  >
                    <TableCell className="text-center font-medium text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.week ?? "\u2014"}
                    </TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.startTime}</TableCell>
                    <TableCell>{row.endTime}</TableCell>
                    <TableCell className="text-center">
                      {row.duration}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium">
                        {row.moduleCode}
                      </span>
                    </TableCell>
                    <TableCell className="truncate max-w-[160px]">
                      {row.subtopicName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{row.lecturerName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {canEdit && row.lecturerUserId ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant={isPresent ? "default" : "outline"}
                            className={cn(
                              "h-7 px-2 text-xs",
                              isPresent
                                ? "bg-green-500 hover:bg-green-600 text-white"
                                : "hover:bg-green-50 hover:text-green-700",
                            )}
                            disabled={isMarking || bulkMarking}
                            onClick={() => handleMark(row, "PRESENT")}
                          >
                            {isMarking ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3 h-3 mr-0.5" />
                            )}
                            P
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              row.status === "ABSENT" ? "default" : "outline"
                            }
                            className={cn(
                              "h-7 px-2 text-xs",
                              row.status === "ABSENT"
                                ? "bg-red-500 hover:bg-red-600 text-white"
                                : "hover:bg-red-50 hover:text-red-700",
                            )}
                            disabled={isMarking || bulkMarking}
                            onClick={() => handleMark(row, "ABSENT")}
                          >
                            {isMarking ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <XCircle className="w-3 h-3 mr-0.5" />
                            )}
                            A
                          </Button>
                        </div>
                      ) : row.lecturerUserId ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            isPresent
                              ? "bg-green-50 text-green-700 border-green-200"
                              : row.status === "ABSENT"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-gray-50 text-gray-500 border-gray-200",
                          )}
                        >
                          {isPresent ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Present
                            </>
                          ) : row.status === "ABSENT" ? (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Absent
                            </>
                          ) : (
                            "\u2014"
                          )}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No Lecturer
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer note */}
      <div className="text-xs text-muted-foreground bg-muted/30 p-4 rounded-lg border border-border">
        <p className="font-medium mb-1">Instructions:</p>
        <p>
          This record tracks lecturer attendance for all sessions at your level.
          Mark each lecturer as Present or Absent after their lecture. Use
          &ldquo;Mark All Present&rdquo; to bulk-mark all unmarked lecturers.
          The sheet can be exported to Excel for record-keeping.
        </p>
      </div>
    </div>
  );
};

export default LecturerAttendanceTab;
