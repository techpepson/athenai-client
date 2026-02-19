import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  GraduationCap,
  Layers,
  User,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  MapPin,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  ListTree,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  modulesService,
  Module,
  ModuleTimetable,
  TimetableSlot,
  LEVELS,
  SEMESTERS,
  DAYS_OF_WEEK,
} from "@/services/modules.service";
import { usersServices } from "@/services/users.services";
import { IUserPublic } from "@/interface/user.interface";
import { Role } from "@/enums/enums";
import { useAuth } from "@/contexts/AuthContext";

// Activity types matching medical school format
const ACTIVITY_TYPES = [
  "LECTURE",
  "PBL",
  "SDL",
  "TUTORIAL",
  "PRACTICAL",
  "CLIN SKILLS",
  "ANATOMY PRACTICAL",
  "BIOCHEMISTRY PRACTICAL",
  "SPORTS",
  "COMMUNITY VISIT",
  "EXAM",
  "OTHER",
];

const ACTIVITY_LABELS: Record<string, string> = {
  LECTURE: "Lecture",
  PBL: "Problem-Based Learning",
  SDL: "Self-Directed Learning",
  TUTORIAL: "Tutorial",
  PRACTICAL: "Practical",
  "CLIN SKILLS": "Clinical Skills",
  "ANATOMY PRACTICAL": "Anatomy Practical",
  "BIOCHEMISTRY PRACTICAL": "Biochemistry Practical",
  SPORTS: "Sports",
  "COMMUNITY VISIT": "Community Visit",
  EXAM: "Examination",
  OTHER: "Other",
};

// Time columns matching the sample: 7.30 through 5.30
const MORNING_TIMES = ["7:30", "8:30", "9:30", "10:30", "11:30", "12:30"];
const AFTERNOON_TIMES = ["1:30", "2:30", "3:30", "4:30", "5:30"];
const ALL_TIMES = [...MORNING_TIMES, ...AFTERNOON_TIMES];

const ACTIVITY_COLORS: Record<string, string> = {
  LECTURE: "bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-300",
  PBL: "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300",
  SDL: "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
  TUTORIAL:
    "bg-purple-500/15 border-purple-500/30 text-purple-700 dark:text-purple-300",
  PRACTICAL:
    "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300",
  "CLIN SKILLS":
    "bg-cyan-500/15 border-cyan-500/30 text-cyan-700 dark:text-cyan-300",
  "ANATOMY PRACTICAL":
    "bg-pink-500/15 border-pink-500/30 text-pink-700 dark:text-pink-300",
  "BIOCHEMISTRY PRACTICAL":
    "bg-orange-500/15 border-orange-500/30 text-orange-700 dark:text-orange-300",
  SPORTS:
    "bg-green-500/15 border-green-500/30 text-green-700 dark:text-green-300",
  "COMMUNITY VISIT":
    "bg-teal-500/15 border-teal-500/30 text-teal-700 dark:text-teal-300",
  EXAM: "bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-300",
  OTHER: "bg-gray-500/15 border-gray-500/30 text-gray-700 dark:text-gray-300",
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

const LEVEL_ACCENT: Record<number, string> = {
  100: "bg-emerald-500",
  200: "bg-blue-500",
  300: "bg-purple-500",
  400: "bg-amber-500",
  500: "bg-rose-500",
  600: "bg-indigo-500",
};

interface WeekSlot extends TimetableSlot {
  week: number;
  activityType: string;
  colSpan: number; // how many time columns this slot spans
}

const TimetableTab = () => {
  const { user } = useAuth();

  // Role-based access control
  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SYSTEM_ADMIN;
  const isRep = user?.role === Role.REP;
  const canEdit = isAdmin || isRep;

  // Get student's level (default to 100 if not set)
  // For REP/STUDENT, they should only see their own level
  const userLevel = user?.student?.level || 100;

  // Determine which levels to show
  const availableLevels = isAdmin ? LEVELS : [userLevel];

  const [selectedLevel, setSelectedLevel] = useState<number>(
    isAdmin ? 100 : userLevel,
  );
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [modules, setModules] = useState<Module[]>([]);
  const [timetables, setTimetables] = useState<ModuleTimetable[]>([]);
  const [staffList, setStaffList] = useState<IUserPublic[]>([]);

  // Slot modal
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [slotDay, setSlotDay] = useState("MONDAY");
  const [slotStartTime, setSlotStartTime] = useState("7:30");
  const [slotEndTime, setSlotEndTime] = useState("9:30");
  const [slotActivityType, setSlotActivityType] = useState("LECTURE");
  const [slotSubtopicId, setSlotSubtopicId] = useState("");
  const [slotLecturerId, setSlotLecturerId] = useState("");
  const [slotVenue, setSlotVenue] = useState("");
  const [slotWeek, setSlotWeek] = useState("1");

  // Timetable settings modal
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [timetableWeeks, setTimetableWeeks] = useState("4");
  const [timetableStartDate, setTimetableStartDate] = useState("");
  const [timetableEndDate, setTimetableEndDate] = useState("");
  const [timetableAcademicYear, setTimetableAcademicYear] = useState(
    `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const filtered = modules.filter(
      (m) => m.level === selectedLevel && m.semester === selectedSemester,
    );
    if (filtered.length > 0) {
      setSelectedModuleId(filtered[0].id);
    } else {
      setSelectedModuleId("");
    }
    setSelectedWeek(1);
  }, [selectedLevel, selectedSemester, modules]);

  const loadData = async () => {
    setModules(modulesService.getModules());
    setTimetables(modulesService.getTimetables());
    const response = await usersServices.getAllUsers();
    if (response.success && response.data?.users) {
      setStaffList(
        response.data.users.filter(
          (u) => u.role === Role.LECTURER || u.role === Role.STAFF,
        ),
      );
    }
  };

  const filteredModules = useMemo(
    () =>
      modules
        .filter(
          (m) => m.level === selectedLevel && m.semester === selectedSemester,
        )
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    [modules, selectedLevel, selectedSemester],
  );

  const selectedModule = useMemo(
    () => modules.find((m) => m.id === selectedModuleId),
    [modules, selectedModuleId],
  );

  const currentTimetable = useMemo(
    () =>
      selectedModuleId
        ? timetables.find((t) => t.moduleId === selectedModuleId)
        : undefined,
    [timetables, selectedModuleId],
  );

  const totalWeeks = currentTimetable?.totalWeeks || 4;

  // --- Timetable CRUD ---

  const ensureTimetable = (): ModuleTimetable => {
    if (currentTimetable) return currentTimetable;

    const newTimetable = modulesService.saveTimetable({
      moduleId: selectedModuleId,
      level: selectedLevel,
      semester: selectedSemester,
      academicYear: timetableAcademicYear,
      totalWeeks: parseInt(timetableWeeks) || 4,
      startDate: timetableStartDate || undefined,
      endDate: timetableEndDate || undefined,
      slots: [],
    });
    setTimetables(modulesService.getTimetables());
    return newTimetable;
  };

  const openAddSlotModal = (day?: string, time?: string) => {
    if (!selectedModuleId) {
      toast.error("Please select a module first");
      return;
    }
    if (!selectedModule?.subtopics.length) {
      toast.error(
        "Please add subtopics to this module first (in Settings → Modules)",
      );
      return;
    }
    setEditingSlot(null);
    setSlotDay(day || "MONDAY");
    setSlotStartTime(time || "7:30");
    setSlotEndTime(time ? getNextTime(time, 2) : "9:30");
    setSlotActivityType("LECTURE");
    setSlotSubtopicId(selectedModule?.subtopics[0]?.id || "");
    setSlotLecturerId("");
    setSlotVenue("");
    setSlotWeek(String(selectedWeek));
    setSlotModalOpen(true);
  };

  const openEditSlotModal = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setSlotDay((slot as WeekSlot).day || "MONDAY");
    setSlotStartTime(slot.startTime);
    setSlotEndTime(slot.endTime);
    setSlotActivityType((slot as WeekSlot).activityType || "LECTURE");
    setSlotSubtopicId(slot.subtopicId);
    setSlotLecturerId(slot.lecturerId || "");
    setSlotVenue(slot.venue || "");
    setSlotWeek(String((slot as WeekSlot).week || selectedWeek));
    setSlotModalOpen(true);
  };

  const getNextTime = (startTime: string, count: number): string => {
    const idx = ALL_TIMES.indexOf(startTime);
    if (idx === -1) return startTime;
    const nextIdx = Math.min(idx + count, ALL_TIMES.length - 1);
    return ALL_TIMES[nextIdx];
  };

  const getColSpan = (startTime: string, endTime: string): number => {
    const startIdx = ALL_TIMES.indexOf(startTime);
    const endIdx = ALL_TIMES.indexOf(endTime);
    if (startIdx === -1 || endIdx === -1) return 1;
    return Math.max(1, endIdx - startIdx);
  };

  const handleSaveSlot = () => {
    if (!slotSubtopicId) {
      toast.error("Please select a subtopic");
      return;
    }

    const timetable = ensureTimetable();
    const lecturer = staffList.find((s) => s.id === slotLecturerId);
    const subtopic = selectedModule?.subtopics.find(
      (s) => s.id === slotSubtopicId,
    );

    const slotData: Record<string, unknown> = {
      day: slotDay,
      startTime: slotStartTime,
      endTime: slotEndTime,
      subtopicId: slotSubtopicId,
      moduleId: selectedModuleId,
      lecturerId: slotLecturerId || subtopic?.lecturerId || undefined,
      lecturerName: lecturer?.name || subtopic?.lecturerName || undefined,
      venue: slotVenue || undefined,
      week: parseInt(slotWeek) || selectedWeek,
      activityType: slotActivityType,
      colSpan: getColSpan(slotStartTime, slotEndTime),
    };

    if (editingSlot) {
      modulesService.updateTimetableSlot(
        timetable.id,
        editingSlot.id,
        slotData as Partial<TimetableSlot>,
      );
      toast.success("Time slot updated");
    } else {
      modulesService.addTimetableSlot(
        timetable.id,
        slotData as Omit<TimetableSlot, "id">,
      );
      toast.success("Time slot added");
    }

    setSlotModalOpen(false);
    setTimetables(modulesService.getTimetables());
  };

  const handleDeleteSlot = (slotId: string) => {
    if (!currentTimetable) return;
    modulesService.removeTimetableSlot(currentTimetable.id, slotId);
    toast.success("Time slot removed");
    setTimetables(modulesService.getTimetables());
  };

  const handleSaveTimetableSettings = () => {
    if (!selectedModuleId) return;

    const timetable = ensureTimetable();
    modulesService.saveTimetable({
      ...timetable,
      totalWeeks: parseInt(timetableWeeks) || 4,
      startDate: timetableStartDate || undefined,
      endDate: timetableEndDate || undefined,
      academicYear: timetableAcademicYear,
    });
    toast.success("Timetable settings saved");
    setSettingsModalOpen(false);
    setTimetables(modulesService.getTimetables());
  };

  const openTimetableSettings = () => {
    if (currentTimetable) {
      setTimetableWeeks(String(currentTimetable.totalWeeks));
      setTimetableStartDate(currentTimetable.startDate || "");
      setTimetableEndDate(currentTimetable.endDate || "");
      setTimetableAcademicYear(
        currentTimetable.academicYear || timetableAcademicYear,
      );
    }
    setSettingsModalOpen(true);
  };

  // Get slots for current week and day
  const getWeekSlots = (day: string, week: number): WeekSlot[] => {
    if (!currentTimetable) return [];
    return (currentTimetable.slots as unknown as WeekSlot[]).filter(
      (s) =>
        s.day?.toUpperCase() === day.toUpperCase() &&
        (s.week === week || !s.week),
    );
  };

  // Build the row data for a given day
  const buildDayRow = (day: string, week: number) => {
    const daySlots = getWeekSlots(day, week);
    const cells: {
      type: "slot" | "empty" | "break";
      slot?: WeekSlot;
      colSpan: number;
      timeIndex: number;
    }[] = [];

    // Process morning times (indices 0-5)
    let i = 0;
    while (i < MORNING_TIMES.length) {
      const time = MORNING_TIMES[i];
      const slot = daySlots.find((s) => s.startTime === time);
      if (slot) {
        const span = slot.colSpan || getColSpan(slot.startTime, slot.endTime);
        // Clamp span to morning section
        const clampedSpan = Math.min(span, MORNING_TIMES.length - i);
        cells.push({ type: "slot", slot, colSpan: clampedSpan, timeIndex: i });
        i += clampedSpan;
      } else {
        cells.push({ type: "empty", colSpan: 1, timeIndex: i });
        i++;
      }
    }

    // Break cell
    cells.push({ type: "break", colSpan: 1, timeIndex: -1 });

    // Process afternoon times (indices 0-4)
    i = 0;
    while (i < AFTERNOON_TIMES.length) {
      const time = AFTERNOON_TIMES[i];
      const slot = daySlots.find((s) => s.startTime === time);
      if (slot) {
        const span = slot.colSpan || getColSpan(slot.startTime, slot.endTime);
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

  // Get topics and facilitators for a specific week
  const getWeekTopicsAndFacilitators = (week: number) => {
    if (!currentTimetable || !selectedModule) return [];

    const weekSlots = (currentTimetable.slots as unknown as WeekSlot[]).filter(
      (s) => (s.week === week || !s.week) && s.activityType === "LECTURE",
    );

    // Group by subtopic
    const topicMap = new Map<
      string,
      { subtopicName: string; lecturerName: string; slots: WeekSlot[] }
    >();

    weekSlots.forEach((slot) => {
      const subtopic = selectedModule.subtopics.find(
        (st) => st.id === slot.subtopicId,
      );
      if (!subtopic) return;

      const key = slot.subtopicId;
      if (!topicMap.has(key)) {
        topicMap.set(key, {
          subtopicName: subtopic.name,
          lecturerName: slot.lecturerName || subtopic.lecturerName || "TBA",
          slots: [],
        });
      }
      topicMap.get(key)!.slots.push(slot);
    });

    return Array.from(topicMap.values());
  };

  // Total module weeks
  const totalModuleWeeks = selectedModule
    ? selectedModule.subtopics.reduce((sum, st) => sum + (st.weeks || 0), 0)
    : 0;

  const currentModuleIndex = filteredModules.findIndex(
    (m) => m.id === selectedModuleId,
  );

  // Date range for current week
  const getWeekDateRange = (week: number): string => {
    if (!currentTimetable?.startDate) return "";
    const start = new Date(currentTimetable.startDate);
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + (week - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const formatDate = (d: Date) => {
      const day = d.getDate();
      const suffix =
        day === 1 || day === 21 || day === 31
          ? "st"
          : day === 2 || day === 22
            ? "nd"
            : day === 3 || day === 23
              ? "rd"
              : "th";
      return `${day}${suffix} ${d.toLocaleDateString("en-US", { month: "long" })}, ${d.getFullYear()}`;
    };

    return `${formatDate(weekStart)} – ${formatDate(weekEnd)}`;
  };

  return (
    <>
      {/* Slot Add/Edit Modal */}
      <Dialog open={slotModalOpen} onOpenChange={setSlotModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {editingSlot ? "Edit Time Slot" : "Add Time Slot"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Activity Type</Label>
                <Select
                  value={slotActivityType}
                  onValueChange={setSlotActivityType}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Week</Label>
                <Select value={slotWeek} onValueChange={setSlotWeek}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(
                      (w) => (
                        <SelectItem key={w} value={String(w)}>
                          Week {w}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Subtopic / Topic{" "}
                <span className="text-muted-foreground">(for lectures)</span>
              </Label>
              <Select value={slotSubtopicId} onValueChange={setSlotSubtopicId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a subtopic" />
                </SelectTrigger>
                <SelectContent>
                  {selectedModule?.subtopics.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Day</Label>
              <Select value={slotDay} onValueChange={setSlotDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((d) => (
                    <SelectItem key={d} value={d.toUpperCase()}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Select value={slotStartTime} onValueChange={setSlotStartTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_TIMES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Select value={slotEndTime} onValueChange={setSlotEndTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_TIMES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Lecturer / Facilitator</Label>
              <Select value={slotLecturerId} onValueChange={setSlotLecturerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Use subtopic lecturer</SelectItem>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Venue (Optional)</Label>
              <Input
                placeholder="e.g., Lecture Hall A"
                value={slotVenue}
                onChange={(e) => setSlotVenue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlotModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSlot}>
              {editingSlot ? "Update Slot" : "Add Slot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Timetable Settings Modal */}
      <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Module Timetable Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Input
                placeholder="e.g., 2025/2026"
                value={timetableAcademicYear}
                onChange={(e) => setTimetableAcademicYear(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Total Weeks</Label>
              <Input
                type="number"
                min="1"
                max="24"
                value={timetableWeeks}
                onChange={(e) => setTimetableWeeks(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={timetableStartDate}
                  onChange={(e) => setTimetableStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={timetableEndDate}
                  onChange={(e) => setTimetableEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSettingsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTimetableSettings}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        {/* Header Area with Filters */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                Teaching Timetable
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Semester-based teaching timetable for each module and level
              </p>
            </div>
          </div>

          {/* Level & Semester Selectors */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                Level:
              </Label>
              {isAdmin ? (
                <div className="flex gap-1.5">
                  {LEVELS.map((level) => (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(level)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border ${
                        selectedLevel === level
                          ? `${LEVEL_BG[level]} ${LEVEL_TEXT[level]} shadow-sm`
                          : "bg-secondary/50 border-border text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              ) : (
                <Badge
                  variant="outline"
                  className={`${LEVEL_BG[userLevel]} ${LEVEL_TEXT[userLevel]}`}
                >
                  Level {userLevel}
                </Badge>
              )}
            </div>

            <div className="w-px bg-border self-stretch" />

            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                Semester:
              </Label>
              <div className="flex gap-1.5">
                {SEMESTERS.map((sem) => (
                  <button
                    key={sem}
                    onClick={() => setSelectedSemester(sem)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                      selectedSemester === sem
                        ? "bg-primary/10 border-primary/20 text-primary shadow-sm"
                        : "bg-secondary/50 border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    Sem {sem}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Module Selector */}
          {filteredModules.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <Label className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                Module:
              </Label>
              <Select
                value={selectedModuleId}
                onValueChange={(v) => {
                  setSelectedModuleId(v);
                  setSelectedWeek(1);
                }}
              >
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Select a module" />
                </SelectTrigger>
                <SelectContent>
                  {filteredModules.map((mod, idx) => (
                    <SelectItem key={mod.id} value={mod.id}>
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          #{idx + 1}
                        </span>
                        <span className="font-mono text-xs">{mod.code}</span>
                        <span>{mod.name}</span>
                        <Badge variant="outline" className="text-xs ml-1">
                          {mod.credits} cr
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openTimetableSettings}
                  className="gap-1"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Settings
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Module Sequence */}
        {filteredModules.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-5">
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Module Sequence — Level {selectedLevel}, Semester{" "}
              {selectedSemester}
              <span className="text-xs">
                (Modules are taught one at a time)
              </span>
            </h4>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {filteredModules.map((mod, idx) => {
                const isSelected = mod.id === selectedModuleId;
                const accentColor =
                  LEVEL_ACCENT[selectedLevel] || LEVEL_ACCENT[100];
                return (
                  <div key={mod.id} className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedModuleId(mod.id);
                        setSelectedWeek(1);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all whitespace-nowrap ${
                        isSelected
                          ? "bg-primary/10 border-primary/30 shadow-sm ring-1 ring-primary/20"
                          : "bg-secondary/30 border-border hover:bg-secondary/60"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${accentColor}`}
                      >
                        {idx + 1}
                      </div>
                      <div className="text-left">
                        <p
                          className={`text-xs font-mono ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {mod.code}
                        </p>
                        <p
                          className={`text-xs font-medium truncate max-w-[140px] ${isSelected ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {mod.name}
                        </p>
                      </div>
                    </button>
                    {idx < filteredModules.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Modules */}
        {filteredModules.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-foreground mb-2">
              No Modules Found
            </h4>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              No modules have been added for Level {selectedLevel}, Semester{" "}
              {selectedSemester}. Go to <strong>Settings → Modules</strong> to
              add modules first.
            </p>
          </div>
        )}

        {/* Timetable for Selected Module */}
        {selectedModule && (
          <>
            {/* Timetable Header — styled like the sample */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Title Block */}
              <div className="text-center py-4 border-b border-border bg-secondary/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Teaching Timetable for Semester {selectedSemester}
                </p>
                <p className="text-sm font-bold text-foreground mt-1">
                  Module: {selectedModule.code}:{" "}
                  {selectedModule.name.toUpperCase()}
                </p>
                <div className="flex items-center justify-center gap-2 mt-1.5">
                  <Badge
                    variant="outline"
                    className={`text-xs ${LEVEL_BG[selectedLevel]} ${LEVEL_TEXT[selectedLevel]}`}
                  >
                    Level {selectedLevel}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {selectedModule.credits} Credits
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {totalModuleWeeks || totalWeeks} Weeks
                  </Badge>
                  {currentTimetable?.academicYear && (
                    <Badge variant="secondary" className="text-xs">
                      {currentTimetable.academicYear}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Week Selector */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/10">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={selectedWeek <= 1}
                  onClick={() => setSelectedWeek((w) => Math.max(1, w - 1))}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <div className="text-center">
                  <p className="text-sm font-bold text-foreground">
                    WEEK {selectedWeek}
                    {selectedWeek === 1 && " (FIRST WEEK)"}
                    {selectedWeek === totalWeeks && " (LAST WEEK)"}
                  </p>
                  {getWeekDateRange(selectedWeek) && (
                    <p className="text-xs text-muted-foreground">
                      {getWeekDateRange(selectedWeek)}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={selectedWeek >= totalWeeks}
                  onClick={() =>
                    setSelectedWeek((w) => Math.min(totalWeeks, w + 1))
                  }
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {/* Week number pills */}
              <div className="flex items-center justify-center gap-1 px-4 py-2 border-b border-border bg-background">
                {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(
                  (w) => (
                    <button
                      key={w}
                      onClick={() => setSelectedWeek(w)}
                      className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                        selectedWeek === w
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {w}
                    </button>
                  ),
                )}
              </div>

              {/* Timetable Grid */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr className="bg-secondary/50">
                      <th className="text-left p-2.5 text-xs font-bold text-foreground border border-border/50 w-28 uppercase">
                        Day / Time
                      </th>
                      {MORNING_TIMES.map((t) => (
                        <th
                          key={t}
                          className="text-center p-2.5 text-xs font-bold text-foreground border border-border/50 min-w-[80px] uppercase"
                        >
                          {t}
                        </th>
                      ))}
                      <th className="text-center p-2.5 text-xs font-bold text-foreground border border-border/50 w-12 bg-secondary/80 uppercase writing-vertical">
                        <div className="flex items-center justify-center">
                          <span
                            className="text-[10px] font-bold tracking-widest"
                            style={{
                              writingMode: "vertical-rl",
                              textOrientation: "mixed",
                            }}
                          >
                            BREAK
                          </span>
                        </div>
                      </th>
                      {AFTERNOON_TIMES.map((t) => (
                        <th
                          key={t}
                          className="text-center p-2.5 text-xs font-bold text-foreground border border-border/50 min-w-[80px] uppercase"
                        >
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS_OF_WEEK.map((day, dayIdx) => {
                      const cells = buildDayRow(day, selectedWeek);
                      return (
                        <tr
                          key={day}
                          className={
                            dayIdx % 2 === 0
                              ? "bg-background"
                              : "bg-secondary/5"
                          }
                        >
                          <td className="p-2.5 text-xs font-bold text-foreground border border-border/50 uppercase">
                            {day}
                          </td>
                          {cells.map((cell, cellIdx) => {
                            if (cell.type === "break") {
                              return (
                                <td
                                  key="break"
                                  className="border border-border/50 bg-secondary/30"
                                  rowSpan={1}
                                />
                              );
                            }

                            if (cell.type === "slot" && cell.slot) {
                              const actColor =
                                ACTIVITY_COLORS[cell.slot.activityType] ||
                                ACTIVITY_COLORS["OTHER"];
                              return (
                                <td
                                  key={cellIdx}
                                  colSpan={cell.colSpan}
                                  className={`p-1.5 border border-border/50 align-top`}
                                >
                                  <div
                                    className={`p-2 rounded-md border text-center relative group cursor-default min-h-[52px] flex flex-col items-center justify-center ${actColor}`}
                                  >
                                    <p className="text-[11px] font-bold uppercase leading-tight">
                                      {cell.slot.activityType}
                                    </p>
                                    {cell.slot.activityType === "LECTURE" && (
                                      <p className="text-[9px] mt-0.5 opacity-80 truncate max-w-full">
                                        {selectedModule?.subtopics.find(
                                          (s) => s.id === cell.slot!.subtopicId,
                                        )?.name || ""}
                                      </p>
                                    )}
                                    {cell.slot.venue && (
                                      <p className="text-[9px] mt-0.5 opacity-60 flex items-center gap-0.5">
                                        <MapPin className="w-2 h-2" />
                                        {cell.slot.venue}
                                      </p>
                                    )}
                                    {/* Hover actions - only for editors */}
                                    {canEdit && (
                                      <div className="absolute top-0.5 right-0.5 flex opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 rounded-md">
                                        <button
                                          className="p-1 rounded hover:bg-black/10"
                                          onClick={() =>
                                            openEditSlotModal(cell.slot!)
                                          }
                                        >
                                          <Pencil className="w-2.5 h-2.5" />
                                        </button>
                                        <button
                                          className="p-1 rounded hover:bg-red-500/20 text-red-500"
                                          onClick={() =>
                                            handleDeleteSlot(cell.slot!.id)
                                          }
                                        >
                                          <Trash2 className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              );
                            }

                            // Empty cell - only clickable for editors
                            return (
                              <td
                                key={cellIdx}
                                className={`p-1.5 border border-border/50 align-top ${canEdit ? "cursor-pointer hover:bg-primary/5" : ""} transition-colors`}
                                onClick={
                                  canEdit
                                    ? () =>
                                        openAddSlotModal(
                                          day.toUpperCase(),
                                          ALL_TIMES[cell.timeIndex],
                                        )
                                    : undefined
                                }
                              />
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend / Key */}
              <div className="px-4 py-3 border-t border-border bg-secondary/10">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <Info className="w-3.5 h-3.5" />
                  <span className="font-medium">KEY:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
                    <span
                      key={key}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${ACTIVITY_COLORS[key]}`}
                    >
                      <strong>{key}</strong> = {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Empty state for timetable */}
              {(!currentTimetable ||
                getWeekSlots("MONDAY", selectedWeek).length +
                  getWeekSlots("TUESDAY", selectedWeek).length +
                  getWeekSlots("WEDNESDAY", selectedWeek).length +
                  getWeekSlots("THURSDAY", selectedWeek).length +
                  getWeekSlots("FRIDAY", selectedWeek).length ===
                  0) && (
                <div className="p-6 text-center border-t border-border">
                  <CalendarDays className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">
                    No activities scheduled for Week {selectedWeek}.
                    {canEdit && " Click on an empty cell to add a time slot."}
                  </p>
                  {canEdit && (
                    <Button
                      size="sm"
                      onClick={() => openAddSlotModal()}
                      className="gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Time Slot
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Lecture Topics and Facilitators */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border bg-secondary/30">
                <h4 className="font-bold text-foreground text-sm uppercase tracking-wide flex items-center gap-2">
                  <ListTree className="w-4 h-4 text-primary" />
                  The Lecture Topics and Facilitators for Week {selectedWeek}
                </h4>
              </div>
              <div className="p-4">
                {getWeekTopicsAndFacilitators(selectedWeek).length > 0 ? (
                  <div className="space-y-3">
                    {getWeekTopicsAndFacilitators(selectedWeek).map(
                      (topic, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20 border border-border/50"
                        >
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {topic.subtopicName}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <User className="w-3 h-3" />
                              Facilitator: {topic.lecturerName}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              {topic.slots.length} session
                              {topic.slots.length !== 1 ? "s" : ""} this week
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      No lecture topics scheduled for Week {selectedWeek}.
                    </p>
                    <p className="text-xs mt-1">
                      Add LECTURE type slots in the timetable above to see
                      topics and facilitators here.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Module Subtopics Summary */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Module Subtopics Overview
              </h4>
              {selectedModule.subtopics.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 text-xs font-medium text-muted-foreground">
                          #
                        </th>
                        <th className="text-left p-2 text-xs font-medium text-muted-foreground">
                          Subtopic / Topic
                        </th>
                        <th className="text-left p-2 text-xs font-medium text-muted-foreground">
                          Lecturer / Facilitator
                        </th>
                        <th className="text-center p-2 text-xs font-medium text-muted-foreground">
                          Weeks
                        </th>
                        <th className="text-center p-2 text-xs font-medium text-muted-foreground">
                          Hrs/Wk
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedModule.subtopics.map((st, idx) => (
                        <tr
                          key={st.id}
                          className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
                        >
                          <td className="p-2 text-xs text-muted-foreground">
                            {idx + 1}
                          </td>
                          <td className="p-2 text-xs font-medium text-foreground">
                            {st.name}
                          </td>
                          <td className="p-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {st.lecturerName || "TBA"}
                            </span>
                          </td>
                          <td className="p-2 text-xs text-center text-muted-foreground">
                            {st.weeks || "-"}
                          </td>
                          <td className="p-2 text-xs text-center text-muted-foreground">
                            {st.hoursPerWeek || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border bg-secondary/20">
                        <td colSpan={3} className="p-2 text-xs font-medium">
                          Total
                        </td>
                        <td className="p-2 text-xs text-center font-medium">
                          {totalModuleWeeks}
                        </td>
                        <td className="p-2 text-xs text-center font-medium">
                          —
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No subtopics added. Go to <strong>Settings → Modules</strong>{" "}
                  to add subtopics.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default TimetableTab;
