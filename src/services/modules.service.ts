// ==================== Module Types ====================

export interface SubTopic {
    id: string;
    name: string;
    lecturerId?: string;
    lecturerName?: string;
    weeks?: number; // number of weeks allocated
    hoursPerWeek?: number; // hours per week
}

export interface Module {
    id: string;
    code: string;
    name: string;
    credits: number;
    level: number; // 100, 200, 300, 400, 500, 600
    semester: number; // 1 or 2
    subtopics: SubTopic[];
    order?: number; // order within the semester (modules are sequential)
    createdAt: string;
    updatedAt: string;
}

export interface TimetableSlot {
    id: string;
    moduleId: string;
    subtopicId: string;
    day: string; // MONDAY, TUESDAY, etc.
    startTime: string; // e.g. "7:30"
    endTime: string; // e.g. "9:30"
    lecturerId?: string;
    lecturerName?: string;
    venue?: string;
    week?: number; // which week in the module this slot belongs to
    activityType?: string; // LECTURE, PBL, SDL, TUTORIAL, PRACTICAL, etc.
    colSpan?: number; // how many time columns this slot spans
}

export interface ModuleTimetable {
    id: string;
    moduleId: string;
    level: number;
    semester: number;
    academicYear: string;
    totalWeeks: number;
    startDate?: string;
    endDate?: string;
    slots: TimetableSlot[];
}

// ==================== Constants ====================

export const LEVELS = [100, 200, 300, 400, 500, 600];
export const SEMESTERS = [1, 2];
export const DAYS_OF_WEEK = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
];
export const TIME_SLOTS = [
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
];

const MODULES_STORAGE_KEY = "college_modules";
const TIMETABLES_STORAGE_KEY = "college_timetables";

// ==================== Utility ====================

const generateId = (): string =>
    `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

// ==================== Modules Service ====================

class ModulesService {
    // --- Modules CRUD ---

    getModules(): Module[] {
        try {
            const stored = localStorage.getItem(MODULES_STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    getModulesByLevel(level: number): Module[] {
        return this.getModules().filter((m) => m.level === level);
    }

    getModulesByLevelAndSemester(level: number, semester: number): Module[] {
        return this.getModules()
            .filter((m) => m.level === level && m.semester === semester)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    getModuleById(id: string): Module | undefined {
        return this.getModules().find((m) => m.id === id);
    }

    addModule(
        module: Omit<Module, "id" | "createdAt" | "updatedAt">
    ): Module {
        const modules = this.getModules();
        const newModule: Module = {
            ...module,
            id: generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        modules.push(newModule);
        localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(modules));
        return newModule;
    }

    updateModule(
        id: string,
        updates: Partial<Omit<Module, "id" | "createdAt">>
    ): Module | null {
        const modules = this.getModules();
        const index = modules.findIndex((m) => m.id === id);
        if (index === -1) return null;

        modules[index] = {
            ...modules[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(modules));
        return modules[index];
    }

    deleteModule(id: string): boolean {
        const modules = this.getModules();
        const filtered = modules.filter((m) => m.id !== id);
        if (filtered.length === modules.length) return false;
        localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(filtered));
        // Also remove associated timetables
        const timetables = this.getTimetables().filter((t) => t.moduleId !== id);
        localStorage.setItem(TIMETABLES_STORAGE_KEY, JSON.stringify(timetables));
        return true;
    }

    // --- Subtopics ---

    addSubtopic(moduleId: string, subtopic: Omit<SubTopic, "id">): SubTopic | null {
        const modules = this.getModules();
        const index = modules.findIndex((m) => m.id === moduleId);
        if (index === -1) return null;

        const newSubtopic: SubTopic = {
            ...subtopic,
            id: generateId(),
        };
        modules[index].subtopics.push(newSubtopic);
        modules[index].updatedAt = new Date().toISOString();
        localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(modules));
        return newSubtopic;
    }

    updateSubtopic(
        moduleId: string,
        subtopicId: string,
        updates: Partial<Omit<SubTopic, "id">>
    ): boolean {
        const modules = this.getModules();
        const modIndex = modules.findIndex((m) => m.id === moduleId);
        if (modIndex === -1) return false;

        const subIndex = modules[modIndex].subtopics.findIndex(
            (s) => s.id === subtopicId
        );
        if (subIndex === -1) return false;

        modules[modIndex].subtopics[subIndex] = {
            ...modules[modIndex].subtopics[subIndex],
            ...updates,
        };
        modules[modIndex].updatedAt = new Date().toISOString();
        localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(modules));
        return true;
    }

    removeSubtopic(moduleId: string, subtopicId: string): boolean {
        const modules = this.getModules();
        const modIndex = modules.findIndex((m) => m.id === moduleId);
        if (modIndex === -1) return false;

        modules[modIndex].subtopics = modules[modIndex].subtopics.filter(
            (s) => s.id !== subtopicId
        );
        modules[modIndex].updatedAt = new Date().toISOString();
        localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(modules));
        return true;
    }

    // --- Timetable CRUD ---

    getTimetables(): ModuleTimetable[] {
        try {
            const stored = localStorage.getItem(TIMETABLES_STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    getTimetableForModule(moduleId: string): ModuleTimetable | undefined {
        return this.getTimetables().find((t) => t.moduleId === moduleId);
    }

    getTimetablesForLevelSemester(
        level: number,
        semester: number
    ): ModuleTimetable[] {
        return this.getTimetables().filter(
            (t) => t.level === level && t.semester === semester
        );
    }

    saveTimetable(
        timetable: Omit<ModuleTimetable, "id"> & { id?: string }
    ): ModuleTimetable {
        const timetables = this.getTimetables();
        const existingIndex = timetable.id
            ? timetables.findIndex((t) => t.id === timetable.id)
            : timetables.findIndex((t) => t.moduleId === timetable.moduleId);

        const saved: ModuleTimetable = {
            ...timetable,
            id: timetable.id || generateId(),
        };

        if (existingIndex !== -1) {
            timetables[existingIndex] = saved;
        } else {
            timetables.push(saved);
        }
        localStorage.setItem(TIMETABLES_STORAGE_KEY, JSON.stringify(timetables));
        return saved;
    }

    addTimetableSlot(
        timetableId: string,
        slot: Omit<TimetableSlot, "id">
    ): TimetableSlot | null {
        const timetables = this.getTimetables();
        const index = timetables.findIndex((t) => t.id === timetableId);
        if (index === -1) return null;

        const newSlot: TimetableSlot = {
            ...slot,
            id: generateId(),
        };
        timetables[index].slots.push(newSlot);
        localStorage.setItem(TIMETABLES_STORAGE_KEY, JSON.stringify(timetables));
        return newSlot;
    }

    updateTimetableSlot(
        timetableId: string,
        slotId: string,
        updates: Partial<Omit<TimetableSlot, "id">>
    ): boolean {
        const timetables = this.getTimetables();
        const tIndex = timetables.findIndex((t) => t.id === timetableId);
        if (tIndex === -1) return false;

        const sIndex = timetables[tIndex].slots.findIndex((s) => s.id === slotId);
        if (sIndex === -1) return false;

        timetables[tIndex].slots[sIndex] = {
            ...timetables[tIndex].slots[sIndex],
            ...updates,
        };
        localStorage.setItem(TIMETABLES_STORAGE_KEY, JSON.stringify(timetables));
        return true;
    }

    removeTimetableSlot(timetableId: string, slotId: string): boolean {
        const timetables = this.getTimetables();
        const tIndex = timetables.findIndex((t) => t.id === timetableId);
        if (tIndex === -1) return false;

        timetables[tIndex].slots = timetables[tIndex].slots.filter(
            (s) => s.id !== slotId
        );
        localStorage.setItem(TIMETABLES_STORAGE_KEY, JSON.stringify(timetables));
        return true;
    }

    deleteTimetable(timetableId: string): boolean {
        const timetables = this.getTimetables();
        const filtered = timetables.filter((t) => t.id !== timetableId);
        if (filtered.length === timetables.length) return false;
        localStorage.setItem(TIMETABLES_STORAGE_KEY, JSON.stringify(filtered));
        return true;
    }
}

export const modulesService = new ModulesService();
