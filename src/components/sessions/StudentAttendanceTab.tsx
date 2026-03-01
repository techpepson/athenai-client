import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  User,
  Users,
  GraduationCap,
  Pencil,
  CheckCircle,
  AlertCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  modulesService,
  LEVELS,
  Module,
  ModuleTimetable,
} from "@/services/modules.service";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/enums/enums";
import { cn } from "@/lib/utils";

// Student attendance record interface
export interface StudentAttendanceEntry {
  id: string;
  studentId: string;
  studentName: string;
  contactNumber: string;
  signature?: string;
  signedAt?: Date;
}

export interface StudentAttendanceSheet {
  id: string;
  slotId: string;
  sessionId?: string;
  date: Date;
  startTime: string;
  endTime: string;
  moduleCode: string;
  moduleName: string;
  sessionStarted: boolean;
  entries: StudentAttendanceEntry[];
}

// Local storage keys
const STUDENT_ATTENDANCE_KEY = "student_attendance_sheets";
const ACTIVE_SESSIONS_KEY = "active_lecture_sessions";

// Format date for display
const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
};

// Format time for display
const formatTime = (timeStr: string): string => {
  const [h, m] = timeStr.split(":").map(Number);
  const hours = h < 7 ? h + 12 : h;
  const period = hours >= 12 ? "pm" : "am";
  const displayHour = hours > 12 ? hours - 12 : hours;
  return `${displayHour}:${(m || 0).toString().padStart(2, "0")}${period}`;
};

const StudentAttendanceTab = () => {
  const { user } = useAuth();

  // Role-based access
  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SYSTEM_ADMIN;
  const isRep = user?.role === Role.REP;
  const isStudent = user?.role === Role.STUDENT;
  const isLecturer = user?.role === Role.LECTURER;
  const canEdit = isAdmin || isRep;
  const canView = !isLecturer; // Everyone except lecturers can view

  // State
  const [selectedLevel, setSelectedLevel] = useState<number>(
    user?.student?.level || 100,
  );
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [attendanceSheets, setAttendanceSheets] = useState<
    StudentAttendanceSheet[]
  >([]);
  const [activeSessions, setActiveSessions] = useState<Set<string>>(new Set());
  const [selectedSheet, setSelectedSheet] =
    useState<StudentAttendanceSheet | null>(null);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] =
    useState<StudentAttendanceEntry | null>(null);
  const [signatureInput, setSignatureInput] = useState("");
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [allTimetables, setAllTimetables] = useState<ModuleTimetable[]>([]);

  // Load modules and timetables (with full slot data) asynchronously
  useEffect(() => {
    const loadData = async () => {
      const modulesRes = await modulesService.getModules();
      let modules: Module[] = [];
      if (modulesRes.success && modulesRes.data?.data) {
        modules = modulesRes.data.data;
        setAllModules(modules);
      }

      // Fetch full timetable (with slots) for each module
      if (modules.length > 0) {
        const timetableResults = await Promise.all(
          modules.map((m) => modulesService.getTimetableForModule(m.id)),
        );
        const timetables: ModuleTimetable[] = [];
        timetableResults.forEach((res) => {
          if (res.success && res.data?.data) {
            timetables.push(res.data.data);
          }
        });
        setAllTimetables(timetables);
      }
    };
    loadData();
  }, []);

  // Available levels based on role
  const availableLevels = useMemo(() => {
    if (isAdmin) return LEVELS;
    const userLevel = user?.student?.level || 100;
    return [userLevel];
  }, [isAdmin, user?.student?.level]);

  // Load attendance sheets and active sessions from localStorage
  useEffect(() => {
    const storedSheets = localStorage.getItem(STUDENT_ATTENDANCE_KEY);
    if (storedSheets) {
      try {
        const parsed = JSON.parse(storedSheets);
        const sheets = parsed.map((s: StudentAttendanceSheet) => ({
          ...s,
          date: new Date(s.date),
          entries: s.entries.map((e: StudentAttendanceEntry) => ({
            ...e,
            signedAt: e.signedAt ? new Date(e.signedAt) : undefined,
          })),
        }));
        setAttendanceSheets(sheets);
      } catch {
        setAttendanceSheets([]);
      }
    }

    const storedActiveSessions = localStorage.getItem(ACTIVE_SESSIONS_KEY);
    if (storedActiveSessions) {
      try {
        setActiveSessions(new Set(JSON.parse(storedActiveSessions)));
      } catch {
        setActiveSessions(new Set());
      }
    }
  }, []);

  // Generate attendance sheets from timetable data (for today's sessions only)
  const todaysSheets = useMemo(() => {
    if (allTimetables.length === 0 || allModules.length === 0) {
      return [];
    }

    // Filter by selected level and semester
    const filteredTimetables = allTimetables.filter(
      (t) => t.level === selectedLevel && t.semester === selectedSemester,
    );

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Get Monday of the current week
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    const dayIndexMap: Record<string, number> = {
      MONDAY: 0,
      TUESDAY: 1,
      WEDNESDAY: 2,
      THURSDAY: 3,
      FRIDAY: 4,
      SATURDAY: 5,
      SUNDAY: 6,
    };

    const sheets: StudentAttendanceSheet[] = [];

    filteredTimetables.forEach((timetable) => {
      const mod = allModules.find((m) => m.id === timetable.moduleId);
      if (!mod) return;

      // Determine current week
      let currentWeek = 1;
      if (timetable.startDate) {
        const start = new Date(timetable.startDate);
        const diffMs = now.getTime() - start.getTime();
        currentWeek = Math.max(
          1,
          Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)),
        );
        if (currentWeek > timetable.totalWeeks) return;
      }

      // Filter for LECTURE activities
      const lectureSlots = timetable.slots.filter(
        (slot) =>
          (!slot.week || slot.week === currentWeek) &&
          slot.activityType === "LECTURE",
      );

      lectureSlots.forEach((slot) => {
        const dayOffset = dayIndexMap[slot.day.toUpperCase()];
        if (dayOffset === undefined) return;

        const slotDate = new Date(monday);
        slotDate.setDate(monday.getDate() + dayOffset);
        slotDate.setHours(0, 0, 0, 0);

        // Only show sessions that are currently in progress (today or future)
        if (slotDate < today) return;

        const isSessionActive = activeSessions.has(slot.id);

        // Only show sessions that have been started by REP
        const existingStartedSheet = attendanceSheets.find(
          (s) =>
            s.slotId === slot.id &&
            formatDate(s.date) === formatDate(slotDate) &&
            s.sessionStarted,
        );

        // Skip if session has not been started
        if (!isSessionActive && !existingStartedSheet) return;

        // Check if we have stored sheet for this slot
        const existingSheet = attendanceSheets.find(
          (s) =>
            s.slotId === slot.id && formatDate(s.date) === formatDate(slotDate),
        );

        sheets.push({
          id: existingSheet?.id || `sheet-${slot.id}-${formatDate(slotDate)}`,
          slotId: slot.id,
          date: slotDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          moduleCode: mod.code,
          moduleName: mod.name,
          sessionStarted: isSessionActive || !!existingSheet?.sessionStarted,
          entries: existingSheet?.entries || [],
        });
      });
    });

    // Sort by date then time
    sheets.sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });

    return sheets;
  }, [
    selectedLevel,
    selectedSemester,
    attendanceSheets,
    activeSessions,
    allModules,
    allTimetables,
  ]);

  // Save attendance sheets to localStorage
  const saveAttendanceSheets = (sheets: StudentAttendanceSheet[]) => {
    localStorage.setItem(STUDENT_ATTENDANCE_KEY, JSON.stringify(sheets));
    setAttendanceSheets(sheets);
  };

  // Check if current user can sign for a sheet
  const canSignForSheet = (sheet: StudentAttendanceSheet): boolean => {
    if (!sheet.sessionStarted) return false;
    if (isAdmin || isRep) return true;
    if (isStudent) return true;
    return false;
  };

  // Open signature modal for a student entry
  const openSignatureModal = (
    sheet: StudentAttendanceSheet,
    entry?: StudentAttendanceEntry,
  ) => {
    setSelectedSheet(sheet);
    if (entry) {
      setEditingEntry(entry);
      setSignatureInput(entry.signature || "");
    } else {
      // New entry for current user
      setEditingEntry({
        id: `entry-${Date.now()}`,
        studentId: user?.student?.studentId || user?.id || "",
        studentName: user?.name || "",
        contactNumber: user?.phone || "",
        signature: undefined,
        signedAt: undefined,
      });
      setSignatureInput("");
    }
    setSignatureModalOpen(true);
  };

  // Save signature
  const handleSaveSignature = () => {
    if (!selectedSheet || !editingEntry || !signatureInput.trim()) {
      toast.error("Please enter a signature");
      return;
    }

    const updatedSheets = [...attendanceSheets];
    const sheetIndex = updatedSheets.findIndex(
      (s) =>
        s.slotId === selectedSheet.slotId &&
        formatDate(s.date) === formatDate(selectedSheet.date),
    );

    const updatedEntry: StudentAttendanceEntry = {
      ...editingEntry,
      signature: signatureInput.trim(),
      signedAt: new Date(),
    };

    if (sheetIndex >= 0) {
      const entryIndex = updatedSheets[sheetIndex].entries.findIndex(
        (e) => e.id === editingEntry.id,
      );
      if (entryIndex >= 0) {
        updatedSheets[sheetIndex].entries[entryIndex] = updatedEntry;
      } else {
        updatedSheets[sheetIndex].entries.push(updatedEntry);
      }
    } else {
      updatedSheets.push({
        ...selectedSheet,
        entries: [updatedEntry],
      });
    }

    saveAttendanceSheets(updatedSheets);
    setSignatureModalOpen(false);
    setSelectedSheet(null);
    setEditingEntry(null);
    setSignatureInput("");
    toast.success("Attendance signed successfully");
  };

  // Check if current user has already signed for a sheet
  const hasUserSigned = (sheet: StudentAttendanceSheet): boolean => {
    const userId = user?.student?.studentId || user?.id;
    return sheet.entries.some((e) => e.studentId === userId && e.signature);
  };

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Access Restricted</h3>
        <p className="text-muted-foreground">
          Lecturers do not have access to student attendance sheets.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Student Attendance Record</h2>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin ? (
            <Select
              value={selectedLevel.toString()}
              onValueChange={(v) => setSelectedLevel(parseInt(v))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                {availableLevels.map((level) => (
                  <SelectItem key={level} value={level.toString()}>
                    Level {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline">Level {selectedLevel}</Badge>
          )}

          <Select
            value={selectedSemester.toString()}
            onValueChange={(v) => setSelectedSemester(parseInt(v))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Semester 1</SelectItem>
              <SelectItem value="2">Semester 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Today's Sessions */}
      {todaysSheets.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            No sessions scheduled for today.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Student attendance sheets are created when sessions are started.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {todaysSheets.map((sheet) => (
            <div
              key={sheet.id}
              className={cn(
                "border rounded-lg overflow-x-auto",
                sheet.sessionStarted
                  ? "border-success/50 bg-success/5"
                  : "border-border",
              )}
            >
              {/* Sheet Header */}
              <div className="bg-muted/50 p-3 sm:p-4 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-sm sm:text-base">
                        {sheet.moduleName} ({sheet.moduleCode})
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(sheet.date)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTime(sheet.startTime)} -{" "}
                      {formatTime(sheet.endTime)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {sheet.sessionStarted ? (
                      <Badge className="bg-success/20 text-success border-success/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Session Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Session Not Started</Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {sheet.entries.filter((e) => e.signature).length} signed
                    </span>
                  </div>
                </div>
              </div>

              {/* Sheet Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">S/N</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact Number</TableHead>
                    <TableHead>Signature</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Existing entries */}
                  {sheet.entries.map((entry, index) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-center font-medium">
                        {index + 1}
                      </TableCell>
                      <TableCell>{entry.studentName}</TableCell>
                      <TableCell>{entry.contactNumber}</TableCell>
                      <TableCell>
                        {entry.signature ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-success" />
                            <span className="italic text-muted-foreground">
                              {entry.signature}
                            </span>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => openSignatureModal(sheet, entry)}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Empty rows + sign button */}
                  {sheet.entries.length < 12 &&
                    Array.from({
                      length: Math.max(1, 5 - sheet.entries.length),
                    }).map((_, i) => (
                      <TableRow key={`empty-${i}`}>
                        <TableCell className="text-center text-muted-foreground">
                          {sheet.entries.length + i + 1}
                        </TableCell>
                        <TableCell colSpan={3}>
                          {i === 0 &&
                            canSignForSheet(sheet) &&
                            !hasUserSigned(sheet) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openSignatureModal(sheet)}
                              >
                                <User className="w-4 h-4 mr-2" />
                                Sign Attendance
                              </Button>
                            )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>

              {/* Instructions */}
              {!sheet.sessionStarted && (
                <div className="p-3 bg-muted/30 border-t border-border text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  This attendance sheet will become active when the class rep
                  starts the session.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Signature Modal */}
      <Dialog open={signatureModalOpen} onOpenChange={setSignatureModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Attendance</DialogTitle>
            <DialogDescription>
              Enter your details to sign attendance for this session.
            </DialogDescription>
          </DialogHeader>

          {selectedSheet && editingEntry && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <p>
                  <strong>Course:</strong> {selectedSheet.moduleName} (
                  {selectedSheet.moduleCode})
                </p>
                <p>
                  <strong>Date:</strong> {formatDate(selectedSheet.date)}
                </p>
                <p>
                  <strong>Time:</strong> {formatTime(selectedSheet.startTime)} -{" "}
                  {formatTime(selectedSheet.endTime)}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={editingEntry.studentName}
                    onChange={(e) =>
                      setEditingEntry({
                        ...editingEntry,
                        studentName: e.target.value,
                      })
                    }
                    placeholder="Your full name"
                    disabled={!canEdit && !!editingEntry.signature}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Contact Number</label>
                  <Input
                    value={editingEntry.contactNumber}
                    onChange={(e) =>
                      setEditingEntry({
                        ...editingEntry,
                        contactNumber: e.target.value,
                      })
                    }
                    placeholder="e.g., 0547714062"
                    disabled={!canEdit && !!editingEntry.signature}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Signature</label>
                  <Input
                    value={signatureInput}
                    onChange={(e) => setSignatureInput(e.target.value)}
                    placeholder="Type your signature"
                    className="font-serif italic"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSignatureModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={handleSaveSignature}
              disabled={
                !signatureInput.trim() ||
                !editingEntry?.studentName ||
                !editingEntry?.contactNumber
              }
            >
              Sign Attendance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentAttendanceTab;
