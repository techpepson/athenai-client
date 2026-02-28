import { useState, useEffect, useCallback } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Clock,
  ListTree,
  User,
  Layers,
  Calendar,
  MapPin,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  modulesService,
  Module,
  SubTopic,
  LEVELS,
  SEMESTERS,
  DAYS_OF_WEEK,
  formatTimeDisplay,
} from "@/services/modules.service";
import { usersServices } from "@/services/users.services";
import { IUserPublic } from "@/interface/user.interface";
import { Role } from "@/enums/enums";

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

// Time options for dropdowns (7:00 AM to 8:00 PM)
const TIME_OPTIONS = [
  "7:00",
  "7:30",
  "8:00",
  "8:30",
  "9:00",
  "9:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "1:00",
  "1:30",
  "2:00",
  "2:30",
  "3:00",
  "3:30",
  "4:00",
  "4:30",
  "5:00",
  "5:30",
  "6:00",
  "6:30",
  "19:00",
  "19:30",
  "20:00",
];

const LEVEL_COLORS: Record<number, string> = {
  100: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30",
  200: "from-blue-500/20 to-blue-600/5 border-blue-500/30",
  300: "from-purple-500/20 to-purple-600/5 border-purple-500/30",
  400: "from-amber-500/20 to-amber-600/5 border-amber-500/30",
  500: "from-rose-500/20 to-rose-600/5 border-rose-500/30",
  600: "from-indigo-500/20 to-indigo-600/5 border-indigo-500/30",
};

const LEVEL_BADGE_COLORS: Record<number, string> = {
  100: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  200: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  300: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  400: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  500: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  600: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
};

const LEVEL_ICON_COLORS: Record<number, string> = {
  100: "text-emerald-500",
  200: "text-blue-500",
  300: "text-purple-500",
  400: "text-amber-500",
  500: "text-rose-500",
  600: "text-indigo-500",
};

const ModulesManagement = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [staffList, setStaffList] = useState<IUserPublic[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number>(100);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(),
  );

  // Module modal
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleCode, setModuleCode] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [moduleCredits, setModuleCredits] = useState("3");
  const [moduleLevel, setModuleLevel] = useState("100");
  const [moduleSemester, setModuleSemester] = useState("1");

  // Subtopic modal
  const [subtopicModalOpen, setSubtopicModalOpen] = useState(false);
  const [editingSubtopic, setEditingSubtopic] = useState<SubTopic | null>(null);
  const [subtopicModuleId, setSubtopicModuleId] = useState("");
  const [subtopicName, setSubtopicName] = useState("");
  const [subtopicLecturerId, setSubtopicLecturerId] = useState("");
  const [subtopicWeeks, setSubtopicWeeks] = useState("2");
  const [subtopicActivityType, setSubtopicActivityType] = useState("LECTURE");
  // Timetable slot fields (auto-create slot when adding subtopic)
  const [subtopicDay, setSubtopicDay] = useState("");
  const [subtopicStartTime, setSubtopicStartTime] = useState("7:30");
  const [subtopicEndTime, setSubtopicEndTime] = useState("9:30");
  const [subtopicVenue, setSubtopicVenue] = useState("");
  const [subtopicSlotWeek, setSubtopicSlotWeek] = useState("1");
  const [subtopicAcademicYear, setSubtopicAcademicYear] = useState(
    `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
  );

  // Delete dialogs
  const [deleteModuleDialogOpen, setDeleteModuleDialogOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const [deleteSubtopicDialogOpen, setDeleteSubtopicDialogOpen] =
    useState(false);
  const [subtopicToDelete, setSubtopicToDelete] = useState<{
    moduleId: string;
    subtopic: SubTopic;
  } | null>(null);

  useEffect(() => {
    loadModules();
    loadStaff();
  }, []);

  const loadModules = useCallback(async () => {
    setLoading(true);
    try {
      const response = await modulesService.getModules();
      if (response.success && response.data?.data) {
        setModules(response.data.data);
      }
    } catch {
      toast.error("Failed to load modules");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStaff = async () => {
    const response = await usersServices.getAllUsers();
    if (response.success && response.data?.users) {
      setStaffList(
        response.data.users.filter(
          (u) => u.role === Role.LECTURER || u.role === Role.STAFF,
        ),
      );
    }
  };

  const toggleModuleExpand = (moduleId: string) => {
    setExpandedModules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  // --- Module CRUD ---

  const openAddModuleModal = () => {
    setEditingModule(null);
    setModuleCode("");
    setModuleName("");
    setModuleCredits("3");
    setModuleLevel(String(selectedLevel));
    setModuleSemester("1");
    setModuleModalOpen(true);
  };

  const openEditModuleModal = (mod: Module) => {
    setEditingModule(mod);
    setModuleCode(mod.code);
    setModuleName(mod.name);
    setModuleCredits(String(mod.credits));
    setModuleLevel(String(mod.level));
    setModuleSemester(String(mod.semester));
    setModuleModalOpen(true);
  };

  const handleSaveModule = async () => {
    if (!moduleCode.trim() || !moduleName.trim()) {
      toast.error("Please fill in module code and name");
      return;
    }

    setSaving(true);
    try {
      if (editingModule) {
        const res = await modulesService.updateModule(editingModule.id, {
          code: moduleCode.trim().toUpperCase(),
          name: moduleName.trim(),
          credits: parseInt(moduleCredits) || 3,
          level: parseInt(moduleLevel),
          semester: parseInt(moduleSemester),
        });
        if (res.success) {
          toast.success(`Module "${moduleName}" updated successfully`);
        } else {
          toast.error(res.error || "Failed to update module");
          return;
        }
      } else {
        const res = await modulesService.addModule({
          code: moduleCode.trim().toUpperCase(),
          name: moduleName.trim(),
          credits: parseInt(moduleCredits) || 3,
          level: parseInt(moduleLevel),
          semester: parseInt(moduleSemester),
        });
        if (res.success) {
          toast.success(`Module "${moduleName}" added successfully`);
        } else {
          toast.error(res.error || "Failed to add module");
          return;
        }
      }

      setModuleModalOpen(false);
      await loadModules();
    } catch {
      toast.error("Failed to save module");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModule = async () => {
    if (!moduleToDelete) return;
    setSaving(true);
    try {
      const res = await modulesService.deleteModule(moduleToDelete.id);
      if (res.success) {
        toast.success(`Module "${moduleToDelete.name}" deleted`);
      } else {
        toast.error(res.error || "Failed to delete module");
      }
      setDeleteModuleDialogOpen(false);
      setModuleToDelete(null);
      await loadModules();
    } catch {
      toast.error("Failed to delete module");
    } finally {
      setSaving(false);
    }
  };

  // --- Subtopic CRUD ---

  const openAddSubtopicModal = (moduleId: string) => {
    setEditingSubtopic(null);
    setSubtopicModuleId(moduleId);
    setSubtopicName("");
    setSubtopicLecturerId("");
    setSubtopicWeeks("2");
    setSubtopicActivityType("LECTURE");
    setSubtopicDay("");
    setSubtopicStartTime("7:30");
    setSubtopicEndTime("9:30");
    setSubtopicVenue("");
    setSubtopicSlotWeek("1");
    setSubtopicModalOpen(true);
  };

  const openEditSubtopicModal = (moduleId: string, subtopic: SubTopic) => {
    setEditingSubtopic(subtopic);
    setSubtopicModuleId(moduleId);
    setSubtopicName(subtopic.name);
    setSubtopicLecturerId(subtopic.lecturerId || "");
    setSubtopicWeeks(String(subtopic.weeks || 2));
    setSubtopicActivityType(subtopic.activityType || "LECTURE");
    // Clear slot fields for edit (slot editing is done in Timetable tab)
    setSubtopicDay("");
    setSubtopicStartTime("7:30");
    setSubtopicEndTime("9:30");
    setSubtopicVenue("");
    setSubtopicSlotWeek("1");
    setSubtopicModalOpen(true);
  };

  const handleSaveSubtopic = async () => {
    if (!subtopicName.trim()) {
      toast.error("Please fill in the subtopic name");
      return;
    }

    setSaving(true);
    try {
      if (editingSubtopic) {
        const res = await modulesService.updateSubtopic(
          subtopicModuleId,
          editingSubtopic.id,
          {
            name: subtopicName.trim(),
            lecturerId:
              subtopicLecturerId && subtopicLecturerId !== "none"
                ? subtopicLecturerId
                : undefined,
            weeks: parseInt(subtopicWeeks) || 2,
          },
        );
        if (res.success) {
          toast.success(`Subtopic "${subtopicName}" updated`);
        } else {
          toast.error(res.error || "Failed to update subtopic");
          return;
        }
      } else {
        // Build slot creation fields if day is selected
        const slotFields =
          subtopicDay && subtopicDay !== "none"
            ? {
                day: subtopicDay,
                startTime: subtopicStartTime,
                endTime: subtopicEndTime,
                activityType: subtopicActivityType,
                venue: subtopicVenue || undefined,
                academicYear: subtopicAcademicYear,
                slotWeek: parseInt(subtopicSlotWeek) || 1,
              }
            : {};

        const res = await modulesService.addSubtopic(subtopicModuleId, {
          name: subtopicName.trim(),
          lecturerId:
            subtopicLecturerId && subtopicLecturerId !== "none"
              ? subtopicLecturerId
              : undefined,
          weeks: parseInt(subtopicWeeks) || 2,
          hoursPerWeek: 1,
          ...slotFields,
        });
        if (res.success) {
          const slotCreated = subtopicDay && subtopicDay !== "none";
          toast.success(
            `Subtopic "${subtopicName}" added${slotCreated ? " with timetable slot" : ""}`,
          );
        } else {
          toast.error(res.error || "Failed to add subtopic");
          return;
        }
      }

      setSubtopicModalOpen(false);
      await loadModules();
    } catch {
      toast.error("Failed to save subtopic");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubtopic = async () => {
    if (!subtopicToDelete) return;
    setSaving(true);
    try {
      const res = await modulesService.removeSubtopic(
        subtopicToDelete.moduleId,
        subtopicToDelete.subtopic.id,
      );
      if (res.success) {
        toast.success(`Subtopic "${subtopicToDelete.subtopic.name}" removed`);
      } else {
        toast.error(res.error || "Failed to remove subtopic");
      }
      setDeleteSubtopicDialogOpen(false);
      setSubtopicToDelete(null);
      await loadModules();
    } catch {
      toast.error("Failed to remove subtopic");
    } finally {
      setSaving(false);
    }
  };

  // --- Render helpers ---

  const levelModules = modules.filter((m) => m.level === selectedLevel);
  const semester1Modules = levelModules
    .filter((m) => m.semester === 1)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const semester2Modules = levelModules
    .filter((m) => m.semester === 2)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const totalCredits = (mods: Module[]) =>
    mods.reduce((sum, m) => sum + m.credits, 0);

  const renderModuleCard = (mod: Module) => {
    const isExpanded = expandedModules.has(mod.id);
    const color = LEVEL_COLORS[mod.level] || LEVEL_COLORS[100];
    const iconColor = LEVEL_ICON_COLORS[mod.level] || LEVEL_ICON_COLORS[100];

    return (
      <div
        key={mod.id}
        className={`border rounded-xl overflow-hidden transition-all duration-300 bg-gradient-to-br ${color} hover:shadow-lg`}
      >
        {/* Module Header */}
        <div
          className="p-4 cursor-pointer"
          onClick={() => toggleModuleExpand(mod.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className={`mt-0.5 ${iconColor}`}>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="text-xs font-mono tracking-wider"
                  >
                    {mod.code}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs bg-primary/5 border-primary/20 text-primary"
                  >
                    {mod.credits} Credits
                  </Badge>
                </div>
                <h4 className="font-semibold text-foreground mt-1.5 text-sm leading-tight">
                  {mod.name}
                </h4>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ListTree className="w-3 h-3" />
                    {mod.subtopics.length} subtopic
                    {mod.subtopics.length !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {mod.subtopics.reduce(
                      (s, st) => s + (st.weeks || 0),
                      0,
                    )}{" "}
                    weeks total
                  </span>
                </div>
              </div>
            </div>
            <div
              className="flex items-center gap-1 ml-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openEditModuleModal(mod)}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setModuleToDelete(mod);
                  setDeleteModuleDialogOpen(true);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Subtopics List */}
        {isExpanded && (
          <div className="border-t border-border/40 bg-background/60 backdrop-blur-sm">
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Subtopics / Topics
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => openAddSubtopicModal(mod.id)}
                >
                  <Plus className="w-3 h-3" />
                  Add Subtopic
                </Button>
              </div>

              {mod.subtopics.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <ListTree className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No subtopics added yet</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs"
                    onClick={() => openAddSubtopicModal(mod.id)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add first subtopic
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {mod.subtopics.map((subtopic, idx) => (
                    <div
                      key={subtopic.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/50 hover:border-border transition-colors group"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {subtopic.name}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {subtopic.lecturerName && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {subtopic.lecturerName}
                            </span>
                          )}
                          {subtopic.weeks && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {subtopic.weeks} week
                              {subtopic.weeks !== 1 ? "s" : ""}
                            </span>
                          )}
                          {subtopic.activityType && (
                            <Badge variant="outline" className="text-xs">
                              {ACTIVITY_LABELS[subtopic.activityType] ||
                                subtopic.activityType}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            openEditSubtopicModal(mod.id, subtopic)
                          }
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setSubtopicToDelete({
                              moduleId: mod.id,
                              subtopic,
                            });
                            setDeleteSubtopicDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSemesterGroup = (semester: number, mods: Module[]) => (
    <div key={semester} className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-primary" />
          <h4 className="font-semibold text-foreground text-sm">
            Semester {semester}
          </h4>
          <Badge variant="secondary" className="text-xs">
            {mods.length} module{mods.length !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {totalCredits(mods)} credits
          </Badge>
        </div>
      </div>

      {mods.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-xl bg-secondary/20">
          <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No modules added for Semester {semester}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              setModuleSemester(String(semester));
              openAddModuleModal();
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Module
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {mods.map((mod) => renderModuleCard(mod))}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Module Add/Edit Modal */}
      <Dialog open={moduleModalOpen} onOpenChange={setModuleModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingModule ? "Edit Module" : "Add New Module"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="moduleCode">Module Code *</Label>
                <Input
                  id="moduleCode"
                  placeholder="e.g., CMPC 101"
                  value={moduleCode}
                  onChange={(e) => setModuleCode(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="moduleCredits">Credits</Label>
                <Input
                  id="moduleCredits"
                  type="number"
                  min="1"
                  max="15"
                  value={moduleCredits}
                  onChange={(e) => setModuleCredits(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="moduleName">Module Name *</Label>
              <Input
                id="moduleName"
                placeholder="e.g., Human Body Structure and Function I"
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Level</Label>
                <Select value={moduleLevel} onValueChange={setModuleLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((level) => (
                      <SelectItem key={level} value={String(level)}>
                        Level {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Semester</Label>
                <Select
                  value={moduleSemester}
                  onValueChange={setModuleSemester}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map((sem) => (
                      <SelectItem key={sem} value={String(sem)}>
                        Semester {sem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModuleModalOpen(false);
                setEditingModule(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveModule} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingModule ? "Update Module" : "Add Module"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subtopic Add/Edit Modal */}
      <Dialog open={subtopicModalOpen} onOpenChange={setSubtopicModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingSubtopic ? "Edit Subtopic" : "Add Subtopic"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Activity Type</Label>
            <Select
              value={subtopicActivityType}
              onValueChange={setSubtopicActivityType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select activity type" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {ACTIVITY_LABELS[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label htmlFor="subtopicName">Subtopic / Topic Name *</Label>
              <Input
                id="subtopicName"
                placeholder="e.g., Anatomy of the Upper Limb"
                value={subtopicName}
                onChange={(e) => setSubtopicName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Lecturer</Label>
              <Select
                value={subtopicLecturerId}
                onValueChange={setSubtopicLecturerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a lecturer (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No lecturer assigned</SelectItem>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtopicWeeks">Duration (Weeks)</Label>
              <Input
                id="subtopicWeeks"
                type="number"
                min="1"
                max="20"
                value={subtopicWeeks}
                onChange={(e) => setSubtopicWeeks(e.target.value)}
              />
            </div>

            {/* Auto-create timetable slot section (only for new subtopics) */}
            {!editingSubtopic && (
              <div className="space-y-3 border-t pt-4">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Timetable Slot (Optional)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Select a day to automatically create a timetable slot for this
                  subtopic.
                </p>

                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select value={subtopicDay} onValueChange={setSubtopicDay}>
                    <SelectTrigger>
                      <SelectValue placeholder="No timetable slot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No timetable slot</SelectItem>
                      {DAYS_OF_WEEK.map((d) => (
                        <SelectItem key={d} value={d.toUpperCase()}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {subtopicDay && subtopicDay !== "none" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Select
                          value={subtopicStartTime}
                          onValueChange={setSubtopicStartTime}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((t) => (
                              <SelectItem key={t} value={t}>
                                {formatTimeDisplay(t)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Select
                          value={subtopicEndTime}
                          onValueChange={setSubtopicEndTime}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((t) => (
                              <SelectItem key={t} value={t}>
                                {formatTimeDisplay(t)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Venue (Optional)</Label>
                        <Input
                          placeholder="e.g., Lecture Hall A"
                          value={subtopicVenue}
                          onChange={(e) => setSubtopicVenue(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Week</Label>
                        <Select
                          value={subtopicSlotWeek}
                          onValueChange={setSubtopicSlotWeek}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Week" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 20 }, (_, i) => i + 1).map(
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
                      <Label>Academic Year</Label>
                      <Input
                        placeholder="e.g., 2025/2026"
                        value={subtopicAcademicYear}
                        onChange={(e) =>
                          setSubtopicAcademicYear(e.target.value)
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSubtopicModalOpen(false);
                setEditingSubtopic(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveSubtopic} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingSubtopic ? "Update Subtopic" : "Add Subtopic"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Module Confirmation */}
      <AlertDialog
        open={deleteModuleDialogOpen}
        onOpenChange={setDeleteModuleDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Module?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{moduleToDelete?.name}" (
              {moduleToDelete?.code})? This will also remove all subtopics and
              timetable data associated with this module. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModule}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Module
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Subtopic Confirmation */}
      <AlertDialog
        open={deleteSubtopicDialogOpen}
        onOpenChange={setDeleteSubtopicDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Subtopic?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{subtopicToDelete?.subtopic.name}
              "? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubtopic}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Subtopic
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Content */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Module Management
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add and manage modules, subtopics, and lecturer assignments for
              each level and semester
            </p>
          </div>
          <Button onClick={openAddModuleModal}>
            <Plus className="w-4 h-4 mr-2" />
            Add Module
          </Button>
        </div>

        {/* Level Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {LEVELS.map((level) => {
            const count = modules.filter((m) => m.level === level).length;
            const badgeColor =
              LEVEL_BADGE_COLORS[level] || LEVEL_BADGE_COLORS[100];
            return (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all duration-200 whitespace-nowrap ${
                  selectedLevel === level
                    ? `${badgeColor} border-current shadow-sm scale-[1.02]`
                    : "bg-secondary/50 border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span className="font-medium text-sm">Level {level}</span>
                {count > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-xs h-5 px-1.5 min-w-[1.25rem] flex items-center justify-center"
                  >
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Level Header */}
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${LEVEL_BADGE_COLORS[selectedLevel] || LEVEL_BADGE_COLORS[100]}`}
          >
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              Level {selectedLevel}
            </h3>
            <p className="text-xs text-muted-foreground">
              {levelModules.length} module{levelModules.length !== 1 ? "s" : ""}{" "}
              · {totalCredits(levelModules)} total credits
            </p>
          </div>
        </div>

        {/* Semesters */}
        <div className="space-y-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading modules...
              </span>
            </div>
          ) : (
            <>
              {renderSemesterGroup(1, semester1Modules)}
              {renderSemesterGroup(2, semester2Modules)}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ModulesManagement;
