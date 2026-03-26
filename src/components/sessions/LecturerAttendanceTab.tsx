/**
 * LecturerAttendanceTab Component
 *
 * Displays open sessions at the logged-in rep's level, showing the lecturer
 * assigned to each session's subtopic. Reps/Admins can mark lecturers as
 * Present or Absent via the manual attendance API, including bulk operations.
 *
 * Data is fetched entirely from the backend - no localStorage.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar,
  BookOpen,
  GraduationCap,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  FileText,
  Loader2,
  RefreshCw,
  CheckSquare,
  User,
  Clock,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/enums/enums";
import { cn } from "@/lib/utils";
import {
  getCreatorSessions,
  getAllSessionsAdmin,
  getLecturerSessions,
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
  subtopicId?: string;
  subtopicName: string;
  lecturerRecordId?: string;
  lecturerUserId: string | undefined;
  lecturerName: string;
  rawStatus:
    | "PRESENT"
    | "LATE"
    | "CHECKED_IN"
    | "CHECKED_OUT"
    | "ABSENT"
    | "EXCUSED"
    | "UNMARKED";
  displayStatus:
    | "PRESENT"
    | "CHECKED_IN"
    | "CHECKED_OUT"
    | "ABSENT"
    | "UNMARKED";
  checkInTime?: string;
  checkOutTime?: string;
  needsAttention: boolean;
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
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(),
  );
  const attentionNotifiedRef = useRef<Set<string>>(new Set());

  // Late attendance modal state (for late check-in/check-out)
  const [lateActionRow, setLateActionRow] = useState<LecturerRow | null>(null);
  const [lateActionType, setLateActionType] = useState<"checkin" | "checkout">(
    "checkin",
  );
  const [lateActionTime, setLateActionTime] = useState<string>("");
  const [isSubmittingLateAction, setIsSubmittingLateAction] = useState(false);

  const formatForInput = useCallback((dateStr: string | Date): string => {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }, []);

  const playAttentionSound = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (
          window as Window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;
      if (!AudioCtx) return;

      const audioContext = new AudioCtx();
      const now = audioContext.currentTime;

      const beep = (startAt: number, freq: number, duration: number) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, startAt);
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(0.08, startAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start(startAt);
        osc.stop(startAt + duration);
      };

      beep(now, 740, 0.16);
      beep(now + 0.2, 620, 0.22);

      setTimeout(() => {
        void audioContext.close().catch(() => {});
      }, 700);
    } catch {
      // Ignore browser autoplay/audio failures.
    }
  }, []);

  /* data fetch */
  const loadData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const sessionsPromise = isAdmin
        ? getAllSessionsAdmin(token)
        : isLecturer
          ? getLecturerSessions(token)
          : getCreatorSessions(token);

      const [sessionsRes, modulesRes] = await Promise.all([
        sessionsPromise,
        modulesService.getModules(),
      ]);

      if (sessionsRes.success && sessionsRes.data) {
        let list: Session[] = [];
        if (isAdmin) {
          list =
            ((sessionsRes.data as { data?: Session[] }).data as Session[]) ||
            [];
        } else if (isLecturer) {
          list =
            ((sessionsRes.data as { data?: Session[] }).data as Session[]) ||
            [];
        } else {
          list =
            ((sessionsRes.data as { sessions?: Session[] })
              .sessions as Session[]) || [];
        }
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
  }, [token, isAdmin, isLecturer]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* derive rows from sessions */
  const rows: LecturerRow[] = useMemo(() => {
    const repLevel = user?.student?.level;
    const viewerUserId = user?.id;
    const viewerLecturerId = user?.lecturer?.id;

    return sessions
      .filter((s) => {
        // Must have a subtopic (i.e. a lecturer assignment)
        if (!s.subtopicId && !s.subtopic) return false;

        const mod = s.module ?? allModules.find((m) => m.id === s.moduleId);
        const moduleSubtopic = s.subtopicId
          ? (mod?.subtopics?.find((st) => st.id === s.subtopicId) ??
            allModules
              .flatMap((m) => m.subtopics ?? [])
              .find((st) => st.id === s.subtopicId))
          : undefined;

        const assignedLecturerRecordId =
          s.lecturer?.id ??
          s.subtopic?.lecturer?.id ??
          moduleSubtopic?.lecturer?.id ??
          s.subtopic?.lecturerId ??
          moduleSubtopic?.lecturerId;

        const assignedLecturerUserId =
          s.lecturer?.userId ?? s.lecturer?.user?.id;

        // Lecturers should only see their own sessions
        if (isLecturer) {
          const matchesLecturer = Boolean(
            (viewerLecturerId &&
              assignedLecturerRecordId &&
              assignedLecturerRecordId === viewerLecturerId) ||
            (viewerUserId &&
              assignedLecturerUserId &&
              assignedLecturerUserId === viewerUserId),
          );
          if (!matchesLecturer) return false;
        }

        // Filter to the rep's level unless admin/lecturer
        if (!isAdmin && !isLecturer && repLevel) {
          const moduleLevel = mod?.level;
          if (moduleLevel && moduleLevel !== repLevel) return false;
        }

        return true;
      })
      .map((s) => {
        const mod = s.module ?? allModules.find((m) => m.id === s.moduleId);

        // Look up the subtopic from modules data (has lecturerName populated)
        const moduleSubtopic = s.subtopicId
          ? (mod?.subtopics?.find((st) => st.id === s.subtopicId) ??
            allModules
              .flatMap((m) => m.subtopics ?? [])
              .find((st) => st.id === s.subtopicId))
          : undefined;

        const resolvedSubtopicId =
          s.subtopic?.id ?? s.subtopicId ?? moduleSubtopic?.id;

        const subtopicName =
          s.subtopic?.name?.trim() || moduleSubtopic?.name?.trim() || "\u2014";

        const lecturerRecordId =
          s.lecturer?.id ??
          s.subtopic?.lecturer?.id ??
          moduleSubtopic?.lecturer?.id ??
          s.subtopic?.lecturerId ??
          moduleSubtopic?.lecturerId;

        const attendanceLecturerUserId = lecturerRecordId
          ? s.attendances?.find(
              (a) => a.user?.lecturer?.id === lecturerRecordId,
            )?.userId
          : undefined;

        // Resolve lecturer name - try session data first, then fall back to modules data
        const lecturerUserId =
          s.lecturer?.userId ??
          s.lecturer?.user?.id ??
          attendanceLecturerUserId;

        const lecturerName =
          s.subtopic?.lecturerName ??
          s.subtopic?.lecturer?.name ??
          s.lecturer?.user?.name ??
          moduleSubtopic?.lecturerName ??
          moduleSubtopic?.lecturer?.name ??
          "Not Assigned";

        // Check if attendance already recorded for this lecturer
        const lecturerAttendance = s.attendances?.find((a) => {
          if (lecturerUserId && a.userId === lecturerUserId) return true;
          if (lecturerRecordId && a.user?.lecturer?.id === lecturerRecordId)
            return true;
          return false;
        });

        const rawStatus =
          (lecturerAttendance?.status as LecturerRow["rawStatus"]) ??
          "UNMARKED";
        const checkInTime = lecturerAttendance?.checkInTime
          ? new Date(lecturerAttendance.checkInTime).toISOString()
          : undefined;
        const checkOutTime = lecturerAttendance?.checkOutTime
          ? new Date(lecturerAttendance.checkOutTime).toISOString()
          : undefined;

        const hasCheckIn = !!checkInTime;
        const hasCheckOut = !!checkOutTime;

        const displayStatus: LecturerRow["displayStatus"] =
          rawStatus === "PRESENT" ||
          rawStatus === "LATE" ||
          rawStatus === "CHECKED_OUT" ||
          (hasCheckIn && hasCheckOut)
            ? "PRESENT"
            : rawStatus === "CHECKED_IN" || (hasCheckIn && !hasCheckOut)
              ? "CHECKED_IN"
              : rawStatus === "ABSENT"
                ? "ABSENT"
                : rawStatus === "CHECKED_OUT"
                  ? "CHECKED_OUT"
                  : "UNMARKED";

        const needsAttention =
          s.status === "OPEN" &&
          (displayStatus === "UNMARKED" || (hasCheckIn && !hasCheckOut));

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
          subtopicId: resolvedSubtopicId,
          subtopicName,
          lecturerRecordId,
          lecturerUserId,
          lecturerName,
          rawStatus,
          displayStatus,
          checkInTime,
          checkOutTime,
          needsAttention,
          isOpen: s.status === "OPEN",
        };
      });
  }, [
    sessions,
    allModules,
    user?.student?.level,
    user?.id,
    user?.lecturer?.id,
    isAdmin,
    isLecturer,
  ]);

  const topicOptions = useMemo(() => {
    const options = new Map<string, string>();
    rows.forEach((row) => {
      const value = row.subtopicId ?? `no-id:${row.subtopicName}`;
      if (!options.has(value)) {
        options.set(value, row.subtopicName || "\u2014");
      }
    });
    return Array.from(options.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (selectedTopic === "all") return rows;
    return rows.filter((row) => {
      const value = row.subtopicId ?? `no-id:${row.subtopicName}`;
      return value === selectedTopic;
    });
  }, [rows, selectedTopic]);

  useEffect(() => {
    if (selectedTopic === "all") return;
    const stillExists = rows.some((row) => {
      const value = row.subtopicId ?? `no-id:${row.subtopicName}`;
      return value === selectedTopic;
    });
    if (!stillExists) {
      setSelectedTopic("all");
    }
  }, [rows, selectedTopic]);

  type ModuleGroup = {
    key: string;
    moduleCode: string;
    moduleName: string;
    rows: LecturerRow[];
    firstStartTime: Date;
    lastEndTime: Date;
  };

  const moduleGroups = useMemo<ModuleGroup[]>(() => {
    const grouped = new Map<string, LecturerRow[]>();
    filteredRows.forEach((row) => {
      const key = `${row.moduleCode || "N/A"}::${row.moduleName || "Untitled Module"}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(row);
    });

    return Array.from(grouped.entries())
      .map(([key, groupedRows]) => {
        const firstStartTime = groupedRows.reduce((earliest, row) => {
          const t = new Date(row.session.startTime);
          return t.getTime() < earliest.getTime() ? t : earliest;
        }, new Date(groupedRows[0].session.startTime));

        const lastEndTime = groupedRows.reduce((latest, row) => {
          const t = new Date(row.session.endTime);
          return t.getTime() > latest.getTime() ? t : latest;
        }, new Date(groupedRows[0].session.endTime));

        return {
          key,
          moduleCode: groupedRows[0].moduleCode || "N/A",
          moduleName: groupedRows[0].moduleName || "Untitled Module",
          rows: groupedRows,
          firstStartTime,
          lastEndTime,
        };
      })
      .sort((a, b) => a.moduleCode.localeCompare(b.moduleCode));
  }, [filteredRows]);

  useEffect(() => {
    const visibleKeys = new Set(moduleGroups.map((g) => g.key));
    setExpandedModules((prev) => {
      const next = new Set<string>();
      visibleKeys.forEach((key) => {
        if (prev.has(key) || prev.size === 0) {
          next.add(key);
        }
      });
      return next;
    });
  }, [moduleGroups]);

  const toggleModule = useCallback((moduleKey: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleKey)) {
        next.delete(moduleKey);
      } else {
        next.add(moduleKey);
      }
      return next;
    });
  }, []);

  const upsertLocalAttendance = useCallback(
    (
      row: LecturerRow,
      patch: {
        status?: string;
        checkInTime?: string;
        checkOutTime?: string;
      },
    ) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== row.sessionId) return s;
          const atts = [...(s.attendances || [])];
          const idx = atts.findIndex((a) => a.userId === row.lecturerUserId);
          const checkInDate = patch.checkInTime
            ? new Date(patch.checkInTime)
            : undefined;
          const checkOutDate = patch.checkOutTime
            ? new Date(patch.checkOutTime)
            : undefined;

          if (idx >= 0) {
            atts[idx] = {
              ...atts[idx],
              ...(patch.status ? { status: patch.status as never } : {}),
              ...(checkInDate ? { checkInTime: checkInDate as never } : {}),
              ...(checkOutDate ? { checkOutTime: checkOutDate as never } : {}),
            };
          } else {
            atts.push({
              id: `temp-${Date.now()}-${row.lecturerUserId}`,
              sessionId: row.sessionId,
              userId: row.lecturerUserId!,
              timestamp: new Date(),
              status: (patch.status || "CHECKED_IN") as never,
              ...(checkInDate ? { checkInTime: checkInDate as never } : {}),
              ...(checkOutDate ? { checkOutTime: checkOutDate as never } : {}),
            });
          }
          return { ...s, attendances: atts };
        }),
      );
    },
    [],
  );

  const submitCheckIn = useCallback(
    async (row: LecturerRow, checkInAtIso?: string) => {
      if (!canEdit || !token || !row.lecturerUserId) return;

      const key = `${row.sessionId}-${row.lecturerUserId}`;
      setMarkingKey(key);
      try {
        const checkInIso = checkInAtIso || new Date().toISOString();
        const res = await markManualAttendance(
          row.sessionId,
          row.lecturerUserId,
          "CHECKED_IN",
          undefined,
          token,
          checkInIso,
          row.checkOutTime,
        );

        if (res.success) {
          upsertLocalAttendance(row, {
            status: row.checkOutTime ? "PRESENT" : "CHECKED_IN",
            checkInTime: checkInIso,
            checkOutTime: row.checkOutTime,
          });
          toast.success(`${row.lecturerName} checked in`);
        } else {
          toast.error(res.error || "Failed to check in lecturer");
        }
      } catch {
        toast.error("Failed to check in lecturer");
      } finally {
        setMarkingKey(null);
      }
    },
    [canEdit, token, upsertLocalAttendance],
  );

  const submitCheckOut = useCallback(
    async (row: LecturerRow, checkOutAtIso?: string) => {
      if (!canEdit || !token || !row.lecturerUserId) return;

      const key = `${row.sessionId}-${row.lecturerUserId}`;
      setMarkingKey(key);
      try {
        const checkOutIso = checkOutAtIso || new Date().toISOString();
        const res = await markManualAttendance(
          row.sessionId,
          row.lecturerUserId,
          "CHECKED_OUT",
          undefined,
          token,
          row.checkInTime,
          checkOutIso,
        );

        if (res.success) {
          const hasCheckIn = !!row.checkInTime;
          upsertLocalAttendance(row, {
            status: hasCheckIn ? "PRESENT" : "CHECKED_OUT",
            checkInTime: row.checkInTime,
            checkOutTime: checkOutIso,
          });
          toast.success(
            hasCheckIn
              ? `${row.lecturerName} checked out and marked Present`
              : `${row.lecturerName} checked out`,
          );
        } else {
          toast.error(res.error || "Failed to check out lecturer");
        }
      } catch {
        toast.error("Failed to check out lecturer");
      } finally {
        setMarkingKey(null);
      }
    },
    [canEdit, token, upsertLocalAttendance],
  );

  const handleCheckIn = useCallback(
    (row: LecturerRow) => {
      const now = new Date();
      const sessionStart = new Date(row.session.startTime);

      if (now.getTime() > sessionStart.getTime()) {
        setLateActionRow(row);
        setLateActionType("checkin");
        setLateActionTime(formatForInput(now));
        return;
      }

      void submitCheckIn(row, now.toISOString());
    },
    [formatForInput, submitCheckIn],
  );

  const handleCheckOut = useCallback(
    (row: LecturerRow) => {
      const now = new Date();
      const sessionEnd = new Date(row.session.endTime);

      if (now.getTime() > sessionEnd.getTime()) {
        setLateActionRow(row);
        setLateActionType("checkout");
        setLateActionTime(formatForInput(now));
        return;
      }

      void submitCheckOut(row, now.toISOString());
    },
    [formatForInput, submitCheckOut],
  );

  const handleSubmitOvertimeCheckout = useCallback(async () => {
    if (!lateActionRow || !lateActionTime) {
      toast.error(
        `Select a ${lateActionType === "checkin" ? "check-in" : "check-out"} date and time`,
      );
      return;
    }

    setIsSubmittingLateAction(true);
    try {
      const selectedIso = new Date(lateActionTime).toISOString();

      if (lateActionType === "checkin") {
        await submitCheckIn(lateActionRow, selectedIso);
      } else {
        await submitCheckOut(lateActionRow, selectedIso);
      }

      setLateActionRow(null);
    } finally {
      setIsSubmittingLateAction(false);
    }
  }, [
    lateActionRow,
    lateActionTime,
    lateActionType,
    submitCheckIn,
    submitCheckOut,
  ]);

  /* bulk check-in all open unmarked/absent lecturers */
  const handleBulkCheckIn = async () => {
    if (!canEdit || !token) return;

    const toMark = filteredRows.filter(
      (r) =>
        r.lecturerUserId &&
        r.isOpen &&
        (r.displayStatus === "UNMARKED" || r.displayStatus === "ABSENT"),
    );

    if (toMark.length === 0) {
      toast.info("No lecturers to check in");
      return;
    }

    // Group by session for bulk API calls
    const bySession = new Map<string, { userId: string; status: string }[]>();
    toMark.forEach((r) => {
      if (!bySession.has(r.sessionId)) bySession.set(r.sessionId, []);
      bySession.get(r.sessionId)!.push({
        userId: r.lecturerUserId!,
        status: "CHECKED_IN",
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
                  atts[idx] = {
                    ...atts[idx],
                    status: "CHECKED_IN" as never,
                    checkInTime: new Date() as never,
                  };
                } else {
                  atts.push({
                    id: `temp-${Date.now()}-${uid}`,
                    sessionId,
                    userId: uid,
                    timestamp: new Date(),
                    status: "CHECKED_IN" as never,
                    checkInTime: new Date() as never,
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
          `Checked in ${successCount} lecturer${successCount !== 1 ? "s" : ""}`,
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
      "Check-In": r.checkInTime ? formatTime(r.checkInTime) : "\u2014",
      "Check-Out": r.checkOutTime ? formatTime(r.checkOutTime) : "\u2014",
      Status: r.displayStatus === "UNMARKED" ? "\u2014" : r.displayStatus,
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
      (r) => r.displayStatus === "PRESENT",
    ).length;
    const checkedIn = filteredRows.filter(
      (r) => r.displayStatus === "CHECKED_IN",
    ).length;
    const absent = filteredRows.filter(
      (r) => r.displayStatus === "ABSENT",
    ).length;
    const unmarked = filteredRows.filter(
      (r) => r.displayStatus === "UNMARKED",
    ).length;
    const attention = filteredRows.filter((r) => r.needsAttention).length;
    return {
      present,
      checkedIn,
      absent,
      unmarked,
      attention,
      total: filteredRows.length,
    };
  }, [filteredRows]);

  useEffect(() => {
    const rowsNeedingAttention = filteredRows.filter((r) => r.needsAttention);
    if (rowsNeedingAttention.length === 0) return;

    let shouldPlay = false;
    rowsNeedingAttention.forEach((r) => {
      const key = `${r.sessionId}-${r.lecturerUserId || "unknown"}`;
      if (!attentionNotifiedRef.current.has(key)) {
        attentionNotifiedRef.current.add(key);
        shouldPlay = true;
      }
    });

    if (shouldPlay) {
      playAttentionSound();
      toast.warning("Some lecturer sessions need attention", {
        description:
          "Red rows show missing check-in/check-out. Please update the times.",
      });
    }
  }, [filteredRows, playAttentionSound]);

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
          <div className="flex items-center gap-2">
            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Filter by topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {topicOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              disabled={bulkMarking}
              onClick={handleBulkCheckIn}
            >
              {bulkMarking ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckSquare className="w-4 h-4 mr-2" />
              )}
              Check-In All
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
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          Checked-In: {stats.checkedIn}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-700" />
          Needs Attention: {stats.attention}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-gray-400" />
          Unmarked: {stats.unmarked}
        </div>
      </div>

      {/* Module groups */}
      {moduleGroups.length === 0 ? (
        <div className="border border-border rounded-lg p-8 text-center text-muted-foreground">
          No sessions match the subtopic filter.
        </div>
      ) : (
        <div className="space-y-4">
          {moduleGroups.map((group) => {
            const isExpanded = expandedModules.has(group.key);
            return (
              <div
                key={group.key}
                className="border border-border rounded-lg overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full px-4 py-3 bg-muted/30 hover:bg-muted/40 transition-colors text-left"
                  onClick={() => toggleModule(group.key)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <ChevronRight
                        className={cn(
                          "w-4 h-4 shrink-0 transition-transform",
                          isExpanded && "rotate-90",
                        )}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {group.moduleName} ({group.moduleCode})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Module Time Window: {formatTime(group.firstStartTime)}{" "}
                          - {formatTime(group.lastEndTime)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {group.rows.length} session
                      {group.rows.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </button>

                {isExpanded && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[5%] text-center font-semibold">
                            S/N
                          </TableHead>
                          <TableHead className="w-[7%] text-center font-semibold">
                            Week
                          </TableHead>
                          <TableHead className="w-[10%] font-semibold">
                            Date
                          </TableHead>
                          <TableHead className="w-[9%] font-semibold">
                            Start
                          </TableHead>
                          <TableHead className="w-[9%] font-semibold">
                            End
                          </TableHead>
                          <TableHead className="w-[7%] text-center font-semibold">
                            Hrs
                          </TableHead>
                          <TableHead className="w-[18%] font-semibold">
                            Topic
                          </TableHead>
                          <TableHead className="w-[13%] font-semibold">
                            Lecturer
                          </TableHead>
                          <TableHead className="w-[22%] text-center font-semibold">
                            Attendance
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.rows.map((row, idx) => {
                          const key = `${row.sessionId}-${row.lecturerUserId}`;
                          const isMarking = markingKey === key;

                          return (
                            <TableRow
                              key={row.sessionId}
                              className={cn(
                                "transition-colors",
                                row.needsAttention
                                  ? "bg-red-50/80 border-red-200"
                                  : row.isOpen
                                    ? "bg-success/5"
                                    : "",
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
                              <TableCell className="truncate max-w-[220px]">
                                {row.subtopicName}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <span className="truncate">
                                    {row.lecturerName}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {canEdit && row.lecturerUserId ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs hover:bg-green-50 hover:text-green-700"
                                      disabled={isMarking || bulkMarking}
                                      onClick={() => handleCheckIn(row)}
                                      title="Check in lecturer with current time"
                                    >
                                      {isMarking ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <CheckCircle className="w-3 h-3 mr-0.5" />
                                      )}
                                      In
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs hover:bg-orange-50 hover:text-orange-700"
                                      disabled={isMarking || bulkMarking}
                                      onClick={() => handleCheckOut(row)}
                                      title="Check out lecturer with current time"
                                    >
                                      {isMarking ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <XCircle className="w-3 h-3 mr-0.5" />
                                      )}
                                      Out
                                    </Button>
                                    {row.displayStatus === "PRESENT" ? (
                                      <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Present
                                      </Badge>
                                    ) : row.displayStatus === "CHECKED_IN" ? (
                                      <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Checked-In
                                      </Badge>
                                    ) : row.displayStatus === "CHECKED_OUT" ? (
                                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Checked-Out
                                      </Badge>
                                    ) : row.displayStatus === "ABSENT" ? (
                                      <Badge className="bg-red-50 text-red-700 border-red-200 text-xs">
                                        <XCircle className="w-3 h-3 mr-1" />
                                        Absent
                                      </Badge>
                                    ) : null}
                                    <div className="ml-2 text-left text-[10px] leading-4 text-muted-foreground">
                                      <div>
                                        In:{" "}
                                        {row.checkInTime
                                          ? formatTime(row.checkInTime)
                                          : "\u2014"}
                                      </div>
                                      <div>
                                        Out:{" "}
                                        {row.checkOutTime
                                          ? formatTime(row.checkOutTime)
                                          : "\u2014"}
                                      </div>
                                    </div>
                                    {row.needsAttention && (
                                      <Badge className="bg-red-100 text-red-700 border-red-300 text-[10px] ml-1">
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        Fix Time
                                      </Badge>
                                    )}
                                  </div>
                                ) : row.lecturerUserId ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-xs",
                                        row.displayStatus === "PRESENT"
                                          ? "bg-green-50 text-green-700 border-green-200"
                                          : row.displayStatus === "CHECKED_IN"
                                            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                            : row.displayStatus ===
                                                "CHECKED_OUT"
                                              ? "bg-blue-50 text-blue-700 border-blue-200"
                                              : row.displayStatus === "ABSENT"
                                                ? "bg-red-50 text-red-700 border-red-200"
                                                : "bg-gray-50 text-gray-500 border-gray-200",
                                      )}
                                    >
                                      {row.displayStatus === "PRESENT" ? (
                                        <>
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Present
                                        </>
                                      ) : row.displayStatus === "CHECKED_IN" ? (
                                        <>
                                          <Clock className="w-3 h-3 mr-1" />
                                          Checked-In
                                        </>
                                      ) : row.displayStatus ===
                                        "CHECKED_OUT" ? (
                                        <>
                                          <Clock className="w-3 h-3 mr-1" />
                                          Checked-Out
                                        </>
                                      ) : row.displayStatus === "ABSENT" ? (
                                        <>
                                          <XCircle className="w-3 h-3 mr-1" />
                                          Absent
                                        </>
                                      ) : (
                                        "\u2014"
                                      )}
                                    </Badge>
                                    <div className="text-[10px] leading-4 text-muted-foreground text-left">
                                      <div>
                                        In:{" "}
                                        {row.checkInTime
                                          ? formatTime(row.checkInTime)
                                          : "\u2014"}
                                      </div>
                                      <div>
                                        Out:{" "}
                                        {row.checkOutTime
                                          ? formatTime(row.checkOutTime)
                                          : "\u2014"}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    No Lecturer
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      <div className="text-xs text-muted-foreground bg-muted/30 p-4 rounded-lg border border-border">
        <p className="font-medium mb-1">Instructions:</p>
        <p>
          This record tracks lecturer attendance for all sessions at your level.
          Use Check-In and Check-Out to record exact attendance timestamps. If
          check-in is after the scheduled start or check-out is after the
          scheduled end, choose the exact date and time in the popup.
        </p>
      </div>

      {/* Late check-in/check-out picker */}
      <Dialog
        open={!!lateActionRow}
        onOpenChange={(open) => !open && setLateActionRow(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Select Actual{" "}
              {lateActionType === "checkin" ? "Check-In" : "Check-Out"} Time
            </DialogTitle>
            <DialogDescription>
              This {lateActionType === "checkin" ? "check-in" : "check-out"} is
              after the scheduled{" "}
              {lateActionType === "checkin" ? "start" : "end"} time for{" "}
              {lateActionRow?.lecturerName}. Select the actual attendance date
              and time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="late-action-time">
              {lateActionType === "checkin" ? "Check-In" : "Check-Out"} Date &
              Time
            </Label>
            <Input
              id="late-action-time"
              type="datetime-local"
              value={lateActionTime}
              onChange={(e) => setLateActionTime(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLateActionRow(null)}
              disabled={isSubmittingLateAction}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSubmittingLateAction}
              onClick={() => void handleSubmitOvertimeCheckout()}
            >
              {isSubmittingLateAction ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                `Save ${lateActionType === "checkin" ? "Check-In" : "Check-Out"}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LecturerAttendanceTab;
