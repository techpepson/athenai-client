import { useState, useEffect, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Loader2,
  Download,
  Info,
  CalendarDays,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { coursesService } from "@/services/courses.services";
import { Role } from "@/enums/enums";
import { useAuth } from "@/contexts/AuthContext";

// Time columns for the timetable grid: 7:30 AM through 8:00 PM
const MORNING_TIMES = ["7:30", "8:30", "9:30", "10:30", "11:30", "12:30"];
const AFTERNOON_TIMES = [
  "13:30",
  "14:30",
  "15:30",
  "16:30",
  "17:30",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
];
const ALL_TIMES = [...MORNING_TIMES, ...AFTERNOON_TIMES];

const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

// Format hour string (e.g. 7:30 -> 7:30 AM, 13:30 -> 1:30 PM)
const formatTimeDisplay = (timeStr: string): string => {
  if (!timeStr) return "";
  const [hourStr, minStr] = timeStr.split(":");
  const hours = parseInt(hourStr);
  const minutes = parseInt(minStr || "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return `${displayHours}:${displayMinutes} ${ampm}`;
};

// Convert string time "HH:MM" to minutes from start of day
const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [hourStr, minStr] = timeStr.split(":");
  const hours = parseInt(hourStr) || 0;
  const minutes = parseInt(minStr) || 0;
  return hours * 60 + minutes;
};

const LEVEL_TEXT: Record<number, string> = {
  100: "text-emerald-500",
  200: "text-blue-500",
  300: "text-purple-500",
  400: "text-amber-500",
  500: "text-rose-500",
  600: "text-indigo-500",
};

const LEVEL_BG: Record<number, string> = {
  100: "bg-emerald-500/10 border-emerald-500/20",
  200: "bg-blue-500/10 border-blue-500/20",
  300: "bg-purple-500/10 border-purple-500/20",
  400: "bg-amber-500/10 border-amber-500/20",
  500: "bg-rose-500/10 border-rose-500/20",
  600: "bg-indigo-500/10 border-indigo-500/20",
};

const TimetableTab = () => {
  const { user } = useAuth();

  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters state
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [semesterFilter, setSemesterFilter] = useState<string>("ALL");
  const [courseFilter, setCourseFilter] = useState<string>("ALL");

  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SYSTEM_ADMIN;

  const loadTimetable = useCallback(async () => {
    setLoading(true);
    try {
      const response = await coursesService.getMyTimetable();
      if (response.success && response.data) {
        const slotsData = Array.isArray(response.data)
          ? response.data
          : response.data.data || [];
        setSlots(slotsData);
      }
    } catch {
      toast.error("Failed to load timetable slots");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  // Derived filter options
  const uniqueCourses = useMemo(() => {
    const courseMap = new Map<string, { id: string; code: string; title: string }>();
    slots.forEach((s) => {
      if (s.course) {
        courseMap.set(s.course.id, s.course);
      }
    });
    return Array.from(courseMap.values());
  }, [slots]);

  // Filtered Slots
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (levelFilter !== "ALL" && String(slot.course?.level) !== levelFilter) {
        return false;
      }
      if (semesterFilter !== "ALL" && String(slot.course?.semester) !== semesterFilter) {
        return false;
      }
      if (courseFilter !== "ALL" && slot.course?.id !== courseFilter) {
        return false;
      }
      return true;
    });
  }, [slots, levelFilter, semesterFilter, courseFilter]);

  const getColSpan = (startTime: string, endTime: string): number => {
    const startIdx = ALL_TIMES.indexOf(startTime);
    const endIdx = ALL_TIMES.indexOf(endTime);
    if (startIdx !== -1 && endIdx !== -1) return Math.max(1, endIdx - startIdx);

    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    const startGridIdx = ALL_TIMES.findIndex(
      (t, i) =>
        timeToMinutes(t) <= startMin &&
        (i + 1 >= ALL_TIMES.length || timeToMinutes(ALL_TIMES[i + 1]) > startMin),
    );
    const endGridIdx = ALL_TIMES.findIndex(
      (t, i) =>
        timeToMinutes(t) <= endMin &&
        (i + 1 >= ALL_TIMES.length || timeToMinutes(ALL_TIMES[i + 1]) > endMin),
    );
    if (startGridIdx === -1 || endGridIdx === -1) return 1;
    return Math.max(1, endGridIdx - startGridIdx + 1);
  };

  const findSlotForColumn = (
    daySlots: any[],
    columnTime: string,
    columnIndex: number,
    timesArray: string[],
  ): any | undefined => {
    const exact = daySlots.find((s) => s.startTime === columnTime);
    if (exact) return exact;

    const colMin = timeToMinutes(columnTime);
    const nextColMin =
      columnIndex + 1 < timesArray.length
        ? timeToMinutes(timesArray[columnIndex + 1])
        : colMin + 60;

    return daySlots.find((s) => {
      const slotMin = timeToMinutes(s.startTime);
      return slotMin >= colMin && slotMin < nextColMin;
    });
  };

  const buildDayRow = (day: string) => {
    const daySlots = filteredSlots.filter(
      (s) => s.day?.toUpperCase() === day.toUpperCase(),
    );
    const placedSlotIds = new Set<string>();
    const cells: {
      type: "slot" | "empty" | "break";
      slot?: any;
      colSpan: number;
      timeIndex: number;
    }[] = [];

    // Morning times
    let i = 0;
    while (i < MORNING_TIMES.length) {
      const time = MORNING_TIMES[i];
      const remaining = daySlots.filter((s) => !placedSlotIds.has(s.id));
      const slot = findSlotForColumn(remaining, time, i, MORNING_TIMES);
      if (slot) {
        placedSlotIds.add(slot.id);
        const span = getColSpan(slot.startTime, slot.endTime);
        const clampedSpan = Math.min(span, MORNING_TIMES.length - i);
        cells.push({ type: "slot", slot, colSpan: clampedSpan, timeIndex: i });
        i += clampedSpan;
      } else {
        cells.push({ type: "empty", colSpan: 1, timeIndex: i });
        i++;
      }
    }

    // Break
    cells.push({ type: "break", colSpan: 1, timeIndex: -1 });

    // Afternoon times
    i = 0;
    while (i < AFTERNOON_TIMES.length) {
      const time = AFTERNOON_TIMES[i];
      const remaining = daySlots.filter((s) => !placedSlotIds.has(s.id));
      const slot = findSlotForColumn(remaining, time, i, AFTERNOON_TIMES);
      if (slot) {
        placedSlotIds.add(slot.id);
        const span = getColSpan(slot.startTime, slot.endTime);
        const clampedSpan = Math.min(span, AFTERNOON_TIMES.length - i);
        cells.push({
          type: "slot",
          slot,
          colSpan: clampedSpan,
          timeIndex: MORNING_TIMES.length + i,
        });
        i += clampedSpan;
      } else {
        cells.push({
          type: "empty",
          colSpan: 1,
          timeIndex: MORNING_TIMES.length + i,
        });
        i++;
      }
    }

    return cells;
  };

  const handleDownloadTimetable = () => {
    if (filteredSlots.length === 0) {
      toast.error("No timetable data to download");
      return;
    }

    const wb = XLSX.utils.book_new();
    const allColumnHeaders = [
      "Day / Time",
      ...MORNING_TIMES.map((t) => formatTimeDisplay(t)),
      "BREAK",
      ...AFTERNOON_TIMES.map((t) => formatTimeDisplay(t)),
    ];

    const rows: string[][] = [];
    rows.push(["EduTrack Consolidated Teaching Timetable"]);
    rows.push([
      `Level Filter: ${levelFilter} | Semester Filter: ${semesterFilter}`,
    ]);
    rows.push([]);
    rows.push(allColumnHeaders);

    DAYS_OF_WEEK.forEach((day) => {
      const daySlots = filteredSlots.filter(
        (s) => s.day?.toUpperCase() === day.toUpperCase(),
      );
      const placedSlotIds = new Set<string>();
      const rowCells: string[] = [day];

      // Morning columns
      let i = 0;
      while (i < MORNING_TIMES.length) {
        const time = MORNING_TIMES[i];
        const remaining = daySlots.filter((s) => !placedSlotIds.has(s.id));
        const slot = findSlotForColumn(remaining, time, i, MORNING_TIMES);
        if (slot) {
          placedSlotIds.add(slot.id);
          const span = getColSpan(slot.startTime, slot.endTime);
          const clampedSpan = Math.min(span, MORNING_TIMES.length - i);
          const label = [
            slot.course?.code,
            slot.course?.title,
            slot.venue ? `(${slot.venue})` : "",
            slot.lecturerName || slot.lecturer?.name || "",
          ]
            .filter(Boolean)
            .join(" — ");
          rowCells.push(label);
          for (let s = 1; s < clampedSpan; s++) {
            rowCells.push("");
          }
          i += clampedSpan;
        } else {
          rowCells.push("");
          i++;
        }
      }

      // Break column
      rowCells.push("");

      // Afternoon columns
      i = 0;
      while (i < AFTERNOON_TIMES.length) {
        const time = AFTERNOON_TIMES[i];
        const remaining = daySlots.filter((s) => !placedSlotIds.has(s.id));
        const slot = findSlotForColumn(remaining, time, i, AFTERNOON_TIMES);
        if (slot) {
          placedSlotIds.add(slot.id);
          const span = getColSpan(slot.startTime, slot.endTime);
          const clampedSpan = Math.min(span, AFTERNOON_TIMES.length - i);
          const label = [
            slot.course?.code,
            slot.course?.title,
            slot.venue ? `(${slot.venue})` : "",
            slot.lecturerName || slot.lecturer?.name || "",
          ]
            .filter(Boolean)
            .join(" — ");
          rowCells.push(label);
          for (let s = 1; s < clampedSpan; s++) {
            rowCells.push("");
          }
          i += clampedSpan;
        } else {
          rowCells.push("");
          i++;
        }
      }

      rows.push(rowCells);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 12 },
      ...allColumnHeaders.slice(1).map(() => ({ wch: 18 })),
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Consolidated Timetable");
    XLSX.writeFile(wb, "EduTrack_Timetable.xlsx");
    toast.success("Consolidated Timetable downloaded successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header Area with Filters */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary animate-pulse" />
              My Timetable
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your personalized weekly schedule for the current semester
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTimetable}
            disabled={filteredSlots.length === 0}
            className="gap-1.5 self-start sm:self-center"
          >
            <Download className="w-4 h-4" />
            Download Excel
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border pt-4">
          {/* Level Filter */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-medium">Level</Label>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Levels</SelectItem>
                <SelectItem value="100">Level 100</SelectItem>
                <SelectItem value="200">Level 200</SelectItem>
                <SelectItem value="300">Level 300</SelectItem>
                <SelectItem value="400">Level 400</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Semester Filter */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-medium">Semester</Label>
            <Select value={semesterFilter} onValueChange={setSemesterFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Semesters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Semesters</SelectItem>
                <SelectItem value="1">Semester 1</SelectItem>
                <SelectItem value="2">Semester 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Course Filter */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-medium">Filter by Course</Label>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Courses</SelectItem>
                {uniqueCourses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} - {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="bg-card rounded-xl border border-border p-12 flex flex-col items-center justify-center space-y-3 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading your timetable...</span>
        </div>
      ) : filteredSlots.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center shadow-sm">
          <CalendarDays className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-foreground mb-2">No Scheduled Classes Found</h4>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You do not have any slots matching your filters or enrolled courses in this semester.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          {/* Timetable Grid */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] border-collapse table-fixed">
              <thead>
                <tr className="bg-secondary/40 border-b border-border">
                  <th className="text-left p-3 text-xs font-bold text-foreground w-32 uppercase border-r border-border">
                    Day / Time
                  </th>
                  {MORNING_TIMES.map((t) => (
                    <th
                      key={t}
                      className="text-center p-3 text-xs font-bold text-foreground min-w-[95px] uppercase border-r border-border"
                    >
                      {formatTimeDisplay(t)}
                    </th>
                  ))}
                  <th className="text-center p-3 text-xs font-bold text-foreground w-14 bg-secondary/60 uppercase border-r border-border">
                    BREAK
                  </th>
                  {AFTERNOON_TIMES.map((t) => (
                    <th
                      key={t}
                      className="text-center p-3 text-xs font-bold text-foreground min-w-[95px] uppercase border-r border-border"
                    >
                      {formatTimeDisplay(t)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS_OF_WEEK.map((day, dayIdx) => {
                  const cells = buildDayRow(day);
                  return (
                    <tr
                      key={day}
                      className={`border-b border-border/80 ${
                        dayIdx % 2 === 0 ? "bg-background" : "bg-secondary/5"
                      }`}
                    >
                      <td className="p-3 text-xs font-bold text-foreground border-r border-border uppercase bg-secondary/10">
                        {day}
                      </td>
                      {cells.map((cell, cellIdx) => {
                        if (cell.type === "break") {
                          return (
                            <td
                              key="break"
                              className="border-r border-border bg-secondary/30"
                              rowSpan={1}
                            />
                          );
                        }

                        if (cell.type === "slot" && cell.slot) {
                          const courseCode = cell.slot.course?.code || "";
                          const courseTitle = cell.slot.course?.title || "";
                          const venue = cell.slot.venue || "";
                          const lecturer =
                            cell.slot.lecturerName || cell.slot.lecturer?.name || "";
                          const level = cell.slot.course?.level || 100;

                          return (
                            <td
                              key={cellIdx}
                              colSpan={cell.colSpan}
                              className="p-1 border-r border-border align-top"
                            >
                              <div
                                className={`p-2.5 rounded-lg border text-left relative group min-h-[64px] flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${
                                  LEVEL_BG[level] || LEVEL_BG[100]
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center justify-between gap-1">
                                    <Badge
                                      variant="outline"
                                      className={`text-[9px] font-bold tracking-wide px-1.5 py-0 ${LEVEL_TEXT[level]}`}
                                    >
                                      {courseCode}
                                    </Badge>
                                    <span className="text-[9px] text-muted-foreground font-mono">
                                      {cell.slot.startTime} - {cell.slot.endTime}
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-bold text-foreground line-clamp-1 mt-1">
                                    {courseTitle}
                                  </p>
                                </div>
                                <div className="mt-2 space-y-0.5 text-[9px] text-muted-foreground">
                                  {venue && (
                                    <p className="flex items-center gap-1">
                                      <MapPin className="w-2.5 h-2.5 text-primary" />
                                      {venue}
                                    </p>
                                  )}
                                  {lecturer && (
                                    <p className="flex items-center gap-1 italic">
                                      <GraduationCap className="w-2.5 h-2.5 text-primary" />
                                      {lecturer}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={cellIdx}
                            className="p-1 border-r border-border"
                          />
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend / Info footer */}
          <div className="px-6 py-4 border-t border-border bg-secondary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium">
              <Info className="w-4 h-4 text-primary" />
              <span>Timetable color badges correspond to the Level of the course:</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {[100, 200, 300, 400].map((lvl) => (
                <span
                  key={lvl}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold border ${LEVEL_BG[lvl]}`}
                >
                  <strong className={LEVEL_TEXT[lvl]}>Level {lvl}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableTab;
