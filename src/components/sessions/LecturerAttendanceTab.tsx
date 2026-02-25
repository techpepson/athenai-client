import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  BookOpen,
  GraduationCap,
  Pencil,
  CheckCircle,
  AlertCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  modulesService,
  Module,
  ModuleTimetable,
  TimetableSlot,
  LEVELS,
} from "@/services/modules.service";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/enums/enums";
import { cn } from "@/lib/utils";

// Lecturer attendance record interface
export interface LecturerAttendanceRecord {
  id: string;
  slotId: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number; // in hours
  moduleCode: string;
  moduleName: string;
  subtopicName: string;
  lecturerName: string;
  lecturerId?: string;
  venue?: string;
  classRepSignature?: string;
  classRepSignedAt?: Date;
  lecturerSignature?: string;
  lecturerSignedAt?: Date;
  sessionStarted: boolean; // if session has been started by REP
  sessionId?: string; // linked session ID if started
}

// Local storage key for lecturer attendance records
const LECTURER_ATTENDANCE_KEY = "lecturer_attendance_records";
const ACTIVE_SESSIONS_KEY = "active_lecture_sessions";

// Helper to calculate duration in hours
const calculateDuration = (startTime: string, endTime: string): number => {
  const parseTime = (timeStr: string): number => {
    const [h, m] = timeStr.split(":").map(Number);
    // Handle 12-hour implied format (1:30 = 13:30 if < 7)
    const hours = h < 7 ? h + 12 : h;
    return hours + (m || 0) / 60;
  };

  const start = parseTime(startTime);
  const end = parseTime(endTime);
  return Math.round((end - start) * 10) / 10; // Round to 1 decimal
};

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

const LecturerAttendanceTab = () => {
  const { user } = useAuth();

  // Role-based access
  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SYSTEM_ADMIN;
  const isRep = user?.role === Role.REP;
  const isLecturer = user?.role === Role.LECTURER;
  const canEdit = isAdmin || isRep;
  const canView = isAdmin || isRep || isLecturer;

  // State
  const [selectedLevel, setSelectedLevel] = useState<number>(
    user?.student?.level || 100,
  );
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [attendanceRecords, setAttendanceRecords] = useState<
    LecturerAttendanceRecord[]
  >([]);
  const [activeSessions, setActiveSessions] = useState<Set<string>>(new Set());
  const [editingRecord, setEditingRecord] =
    useState<LecturerAttendanceRecord | null>(null);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signatureType, setSignatureType] = useState<"rep" | "lecturer">("rep");
  const [signatureInput, setSignatureInput] = useState("");
  // Listen for session started events from Sessions page
  useEffect(() => {
    const handleSessionStarted = () => {
      // Reload active sessions when a session is started
      const storedActiveSessions = localStorage.getItem(ACTIVE_SESSIONS_KEY);
      if (storedActiveSessions) {
        try {
          setActiveSessions(new Set(JSON.parse(storedActiveSessions)));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("session-started", handleSessionStarted);
    return () =>
      window.removeEventListener("session-started", handleSessionStarted);
  }, []);

  // Available levels based on role
  const availableLevels = useMemo(() => {
    if (isAdmin) return LEVELS;
    const userLevel = user?.student?.level || 100;
    return [userLevel];
  }, [isAdmin, user?.student?.level]);

  // Load attendance records and active sessions from localStorage
  useEffect(() => {
    const storedRecords = localStorage.getItem(LECTURER_ATTENDANCE_KEY);
    if (storedRecords) {
      try {
        const parsed = JSON.parse(storedRecords);
        // Convert date strings back to Date objects
        const records = parsed.map((r: LecturerAttendanceRecord) => ({
          ...r,
          date: new Date(r.date),
          classRepSignedAt: r.classRepSignedAt
            ? new Date(r.classRepSignedAt)
            : undefined,
          lecturerSignedAt: r.lecturerSignedAt
            ? new Date(r.lecturerSignedAt)
            : undefined,
        }));
        setAttendanceRecords(records);
      } catch {
        setAttendanceRecords([]);
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

  // Generate attendance records from timetable data
  const generateRecordsFromTimetable = useMemo(() => {
    const timetables = modulesService.getTimetables();
    const modules = modulesService.getModules();

    if (timetables.length === 0 || modules.length === 0) {
      return [];
    }

    // Filter by selected level and semester
    const filteredTimetables = timetables.filter(
      (t) => t.level === selectedLevel && t.semester === selectedSemester,
    );

    const now = new Date();
    // Get Monday of the current week
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
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

    const records: LecturerAttendanceRecord[] = [];

    filteredTimetables.forEach((timetable) => {
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

      // Filter for LECTURE activities only
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

        const subtopic = mod.subtopics.find((s) => s.id === slot.subtopicId);

        // Check if we have stored attendance data for this slot
        const existingRecord = attendanceRecords.find(
          (ar) =>
            ar.slotId === slot.id &&
            formatDate(ar.date) === formatDate(slotDate),
        );

        const isSessionActive = activeSessions.has(slot.id);

        records.push({
          id: existingRecord?.id || `${slot.id}-${formatDate(slotDate)}`,
          slotId: slot.id,
          date: slotDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          duration: calculateDuration(slot.startTime, slot.endTime),
          moduleCode: mod.code,
          moduleName: mod.name,
          subtopicName: subtopic?.name || "Lecture",
          lecturerName:
            slot.lecturerName || subtopic?.lecturerName || "Not Assigned",
          lecturerId: slot.lecturerId || subtopic?.lecturerId,
          venue: slot.venue,
          classRepSignature: existingRecord?.classRepSignature,
          classRepSignedAt: existingRecord?.classRepSignedAt,
          lecturerSignature: existingRecord?.lecturerSignature,
          lecturerSignedAt: existingRecord?.lecturerSignedAt,
          sessionStarted: isSessionActive || !!existingRecord?.sessionStarted,
          sessionId: existingRecord?.sessionId,
        });
      });
    });

    // Sort by date then start time
    records.sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });

    return records;
  }, [selectedLevel, selectedSemester, attendanceRecords, activeSessions]);

  // Save attendance records to localStorage
  const saveAttendanceRecords = (records: LecturerAttendanceRecord[]) => {
    localStorage.setItem(LECTURER_ATTENDANCE_KEY, JSON.stringify(records));
    setAttendanceRecords(records);
  };

  // Save active sessions to localStorage
  const saveActiveSessions = (sessions: Set<string>) => {
    localStorage.setItem(
      ACTIVE_SESSIONS_KEY,
      JSON.stringify(Array.from(sessions)),
    );
    setActiveSessions(sessions);
  };

  // Note: Session starting is now handled from the Sessions page SessionCard

  // Open signature modal
  const openSignatureModal = (
    record: LecturerAttendanceRecord,
    type: "rep" | "lecturer",
  ) => {
    setEditingRecord(record);
    setSignatureType(type);
    setSignatureInput(
      type === "rep"
        ? record.classRepSignature || ""
        : record.lecturerSignature || "",
    );
    setSignatureModalOpen(true);
  };

  // Save signature
  const handleSaveSignature = () => {
    if (!editingRecord || !signatureInput.trim()) {
      toast.error("Please enter a signature");
      return;
    }

    const updatedRecords = [...attendanceRecords];
    const existingIndex = updatedRecords.findIndex(
      (r) =>
        r.slotId === editingRecord.slotId &&
        formatDate(r.date) === formatDate(editingRecord.date),
    );

    const updatedRecord = {
      ...editingRecord,
      ...(signatureType === "rep"
        ? {
            classRepSignature: signatureInput.trim(),
            classRepSignedAt: new Date(),
          }
        : {
            lecturerSignature: signatureInput.trim(),
            lecturerSignedAt: new Date(),
          }),
    };

    if (existingIndex >= 0) {
      updatedRecords[existingIndex] = updatedRecord;
    } else {
      updatedRecords.push(updatedRecord);
    }

    saveAttendanceRecords(updatedRecords);
    setSignatureModalOpen(false);
    setEditingRecord(null);
    setSignatureInput("");
    toast.success(
      `${signatureType === "rep" ? "Class Rep" : "Lecturer"} signature saved`,
    );
  };

  // Check if a record can be edited by the current user
  // Signatures are ONLY editable when sessionStarted is true
  const canEditRecord = (record: LecturerAttendanceRecord): boolean => {
    if (!record.sessionStarted) return false; // Must have session started
    if (isAdmin || isRep) return true;
    if (isLecturer) return true;
    return false;
  };

  // Render Level/Semester header info
  const renderHeaderInfo = () => {
    const modules = modulesService.getModulesByLevelAndSemester(
      selectedLevel,
      selectedSemester,
    );
    const currentModule = modules.length > 0 ? modules[0] : null;
    const timetables = modulesService.getTimetablesForLevelSemester(
      selectedLevel,
      selectedSemester,
    );
    const timetable = timetables.length > 0 ? timetables[0] : null;

    return (
      <div className="bg-card border border-border rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <span className="font-semibold">Programme:</span>
              <span className="text-muted-foreground">MBChB</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <span className="font-semibold">Semester:</span>
              <span className="text-muted-foreground">
                {selectedSemester === 1 ? "ONE (1)" : "TWO (2)"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="font-semibold">Year:</span>
              <span className="text-muted-foreground">
                {new Date().getFullYear()}
              </span>
            </div>
          </div>
          {currentModule && (
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="font-semibold">Course:</span>
              <span className="text-muted-foreground">
                {currentModule.name} ({currentModule.code})
              </span>
            </div>
          )}
        </div>
        {currentModule && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Lecturer/Technician:{" "}
                <span className="font-medium text-foreground">
                  {currentModule.subtopics[0]?.lecturerName ||
                    "Prof. Not Assigned"}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

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

  return (
    <div className="space-y-6">
      {/* Header with Level/Semester Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Lecturer Attendance Record</h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Level Selector */}
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

          {/* Semester Selector */}
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

      {/* Programme Info Header */}
      {renderHeaderInfo()}

      {/* Attendance Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12 text-center font-semibold">
                S/N
              </TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Start Time</TableHead>
              <TableHead className="font-semibold">End Time</TableHead>
              <TableHead className="font-semibold text-center">
                Duration (hrs)
              </TableHead>
              <TableHead className="font-semibold">
                Class Rep&apos;s Signature
              </TableHead>
              <TableHead className="font-semibold">
                Lecturer&apos;s Signature
              </TableHead>
              <TableHead className="font-semibold text-center">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {generateRecordsFromTimetable.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canEdit ? 8 : 7}
                  className="text-center py-8 text-muted-foreground"
                >
                  No lecture sessions found for Level {selectedLevel}, Semester{" "}
                  {selectedSemester}.
                  <br />
                  <span className="text-sm">
                    Add activities in the Activities tab to see them here.
                  </span>
                </TableCell>
              </TableRow>
            ) : (
              generateRecordsFromTimetable.map((record, index) => (
                <TableRow
                  key={record.id}
                  className={cn(
                    "transition-colors",
                    record.sessionStarted ? "bg-success/5" : "opacity-60",
                  )}
                >
                  <TableCell className="text-center font-medium">
                    {index + 1}
                  </TableCell>
                  <TableCell>{formatDate(record.date)}</TableCell>
                  <TableCell>{formatTime(record.startTime)}</TableCell>
                  <TableCell>{formatTime(record.endTime)}</TableCell>
                  <TableCell className="text-center">
                    {record.duration}
                  </TableCell>

                  {/* Class Rep Signature */}
                  <TableCell>
                    {record.classRepSignature ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="italic text-muted-foreground">
                          {record.classRepSignature}
                        </span>
                        {canEditRecord(record) && canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => openSignatureModal(record, "rep")}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ) : canEditRecord(record) && canEdit ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openSignatureModal(record, "rep")}
                      >
                        Sign
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* Lecturer Signature */}
                  <TableCell>
                    {record.lecturerSignature ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="italic text-muted-foreground">
                          {record.lecturerSignature}
                        </span>
                        {canEditRecord(record) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() =>
                              openSignatureModal(record, "lecturer")
                            }
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ) : canEditRecord(record) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openSignatureModal(record, "lecturer")}
                      >
                        Sign
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="text-center">
                    {record.sessionStarted ? (
                      <Badge variant="outline" className="bg-success/10">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer Instructions */}
      <div className="text-xs text-muted-foreground bg-muted/30 p-4 rounded-lg border border-border">
        <p className="font-medium mb-2">Instructions:</p>
        <p>
          This form should be signed at the end of each lecturer session by the
          two (2) parties shown above and thereafter kept by the Class
          Representative, who will hand it over to the Coordinator at the end of
          the month.
        </p>
      </div>

      {/* Signature Modal */}
      <Dialog open={signatureModalOpen} onOpenChange={setSignatureModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {signatureType === "rep" ? "Class Rep" : "Lecturer"} Signature
            </DialogTitle>
            <DialogDescription>
              Enter your signature to confirm attendance for this lecture
              session.
            </DialogDescription>
          </DialogHeader>

          {editingRecord && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <p>
                  <strong>Date:</strong> {formatDate(editingRecord.date)}
                </p>
                <p>
                  <strong>Time:</strong> {formatTime(editingRecord.startTime)} -{" "}
                  {formatTime(editingRecord.endTime)}
                </p>
                <p>
                  <strong>Course:</strong> {editingRecord.moduleName} (
                  {editingRecord.moduleCode})
                </p>
                <p>
                  <strong>Lecturer:</strong> {editingRecord.lecturerName}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Enter your signature (type your name):
                </label>
                <Input
                  value={signatureInput}
                  onChange={(e) => setSignatureInput(e.target.value)}
                  placeholder="e.g., Prof. John Doe"
                  className="font-serif italic"
                />
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
              disabled={!signatureInput.trim()}
            >
              Save Signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LecturerAttendanceTab;
