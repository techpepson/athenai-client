// ==================== Module Types ====================

import { api, ApiResponse } from "@/apis/api";
import { UtilServices } from "./utils.services";

export interface ScheduledDay {
  id?: string;
  subtopicId?: string;
  day: string; // Date string in ISO format (e.g. "2026-02-28") or day name (e.g. "MONDAY")
  startTime: string; // e.g. "7:30"
  endTime: string; // e.g. "9:30"
}

export interface SubTopic {
  id: string;
  name: string;
  moduleId?: string;
  lecturerId?: string;
  lecturerName?: string;
  weeks?: number; // number of weeks allocated
  hoursPerWeek?: number; // hours per week (deprecated - kept for backwards compatibility)
  activityType?: string; // LECTURE, PBL, SDL, TUTORIAL, PRACTICAL, etc.
  scheduledDays?: ScheduledDay[]; // days and times when this topic is scheduled
  lecturer?: { id: string; name: string }; // populated relation from backend
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
  timetableId?: string;
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
  subtopic?: SubTopic; // populated relation from backend
  lecturer?: { id: string; name: string }; // populated relation from backend
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
  module?: Module; // populated relation from backend
}

// ==================== Backend response wrappers ====================

export interface BackendResponse<T> {
  success: boolean;
  data: T;
  message?: string;
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
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
];

// ==================== Time Display Helper ====================

/**
 * Format a time string for display with AM/PM.
 * Handles both 12-hour (e.g. "1:30" = PM) and 24-hour (e.g. "19:30") formats.
 */
export const formatTimeDisplay = (time: string): string => {
  const [h, m] = time.split(":").map(Number);
  const mins = String(m).padStart(2, "0");
  if (h >= 13) return `${h - 12}:${mins} PM`;
  if (h === 12) return `12:${mins} PM`;
  if (h >= 7) return `${h}:${mins} AM`;
  return `${h}:${mins} PM`; // 1-6 assumed PM
};

/**
 * Convert a time string ("7:30", "1:30", "19:00") to total minutes since midnight.
 * Handles the mixed 12h/24h format used in the timetable grid:
 *  - 7-12  → AM (7:30 = 450, 12:30 = 750)
 *  - 1-6   → PM (1:30 = 810, 6:30 = 1110)
 *  - 13-23 → 24h (19:00 = 1140, 20:00 = 1200)
 */
export const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  if (h >= 13) return h * 60 + m; // 24-hour (19:00 etc.)
  if (h >= 7) return h * 60 + m; // AM (7:30 – 12:30)
  return (h + 12) * 60 + m; // PM (1:00 – 6:59)
};

// ==================== Modules Service ====================

class ModulesService {
  private readonly basePath = "/activities";
  private utilService = new UtilServices();

  private async getToken(): Promise<string | null> {
    return this.utilService.getTokenFromLocalStorage();
  }

  /**
   * Normalize a subtopic from the backend to match the frontend interface.
   * The backend may return `lecturer` as a relation; we flatten it to lecturerName.
   */
  private normalizeSubtopic(st: SubTopic): SubTopic {
    return {
      ...st,
      lecturerName: st.lecturerName || st.lecturer?.name,
      lecturerId: st.lecturerId || st.lecturer?.id,
    };
  }

  /**
   * Normalize a module from the backend.
   */
  private normalizeModule(mod: Module): Module {
    return {
      ...mod,
      subtopics: (mod.subtopics || []).map((st) => this.normalizeSubtopic(st)),
    };
  }

  /**
   * Normalize a timetable slot from the backend.
   */
  private normalizeSlot(slot: TimetableSlot): TimetableSlot {
    return {
      ...slot,
      lecturerName: slot.lecturerName || slot.lecturer?.name,
      lecturerId: slot.lecturerId || slot.lecturer?.id,
    };
  }

  /**
   * Normalize a timetable from the backend.
   */
  private normalizeTimetable(tt: ModuleTimetable): ModuleTimetable {
    return {
      ...tt,
      slots: (tt.slots || []).map((s) => this.normalizeSlot(s)),
    };
  }

  // --- Modules CRUD ---

  /**
   * Get all modules, optionally filtered by level and semester.
   * GET /activities/modules?level=&semester=
   */
  async getModules(
    level?: number,
    semester?: number,
  ): Promise<ApiResponse<BackendResponse<Module[]>>> {
    const token = await this.getToken();
    const params: Record<string, string | number | boolean> = {};
    if (level !== undefined) params.level = level;
    if (semester !== undefined) params.semester = semester;

    const response = await api.get<BackendResponse<Module[]>>(
      `${this.basePath}/modules`,
      token || undefined,
      { params },
    );

    // Normalize modules
    if (response.success && response.data?.data) {
      response.data.data = response.data.data.map((m) =>
        this.normalizeModule(m),
      );
    }

    return response;
  }

  /**
   * Get modules filtered by level.
   * GET /activities/modules?level=
   */
  async getModulesByLevel(
    level: number,
  ): Promise<ApiResponse<BackendResponse<Module[]>>> {
    return this.getModules(level);
  }

  /**
   * Get modules filtered by level and semester.
   * GET /activities/modules?level=&semester=
   */
  async getModulesByLevelAndSemester(
    level: number,
    semester: number,
  ): Promise<ApiResponse<BackendResponse<Module[]>>> {
    return this.getModules(level, semester);
  }

  /**
   * Get a single module by ID.
   * GET /activities/modules/:id
   */
  async getModuleById(
    id: string,
  ): Promise<ApiResponse<BackendResponse<Module>>> {
    const token = await this.getToken();
    const response = await api.get<BackendResponse<Module>>(
      `${this.basePath}/modules/${id}`,
      token || undefined,
    );

    if (response.success && response.data?.data) {
      response.data.data = this.normalizeModule(response.data.data);
    }

    return response;
  }

  /**
   * Create a new module.
   * POST /activities/create-modules
   */
  async addModule(module: {
    code: string;
    name: string;
    credits: number;
    level: number;
    semester: number;
    order?: number;
  }): Promise<ApiResponse<BackendResponse<Module>>> {
    const token = await this.getToken();
    const response = await api.post<BackendResponse<Module>>(
      `${this.basePath}/create-modules`,
      module,
      token || undefined,
    );

    if (response.success && response.data?.data) {
      response.data.data = this.normalizeModule(response.data.data);
    }

    return response;
  }

  /**
   * Update a module.
   * PATCH /activities/update-modules/:id
   */
  async updateModule(
    id: string,
    updates: Partial<{
      code: string;
      name: string;
      credits: number;
      level: number;
      semester: number;
      order: number;
    }>,
  ): Promise<ApiResponse<BackendResponse<Module>>> {
    const token = await this.getToken();
    const response = await api.patch<BackendResponse<Module>>(
      `${this.basePath}/update-modules/${id}`,
      updates,
      token || undefined,
    );

    if (response.success && response.data?.data) {
      response.data.data = this.normalizeModule(response.data.data);
    }

    return response;
  }

  /**
   * Delete a module.
   * DELETE /activities/modules/:id
   */
  async deleteModule(
    id: string,
  ): Promise<ApiResponse<BackendResponse<Module>>> {
    const token = await this.getToken();
    return api.delete<BackendResponse<Module>>(
      `${this.basePath}/modules/${id}`,
      token || undefined,
    );
  }

  // --- Subtopics ---

  /**
   * Get subtopics for a module.
   * GET /activities/modules/:moduleId/get-subtopics
   */
  async getSubtopics(
    moduleId: string,
  ): Promise<ApiResponse<BackendResponse<SubTopic[]>>> {
    const token = await this.getToken();
    const response = await api.get<BackendResponse<SubTopic[]>>(
      `${this.basePath}/modules/${moduleId}/get-subtopics`,
      token || undefined,
    );

    if (response.success && response.data?.data) {
      response.data.data = response.data.data.map((st) =>
        this.normalizeSubtopic(st),
      );
    }

    return response;
  }

  /**
   * Create a subtopic for a module.
   * POST /activities/modules/:moduleId/create-subtopic
   */
  async addSubtopic(
    moduleId: string,
    subtopic: {
      name: string;
      lecturerId?: string;
      weeks?: number;
      hoursPerWeek?: number;
      // Auto-create timetable slot fields (backend creates slot when day+startTime+endTime provided)
      day?: string;
      startTime?: string;
      endTime?: string;
      activityType?: string;
      venue?: string;
      academicYear?: string;
      slotWeek?: number;
      colSpan?: number;
    },
  ): Promise<ApiResponse<BackendResponse<SubTopic>>> {
    const token = await this.getToken();
    const response = await api.post<BackendResponse<SubTopic>>(
      `${this.basePath}/modules/${moduleId}/create-subtopic`,
      subtopic,
      token || undefined,
    );

    if (response.success && response.data?.data) {
      // Backend returns { subtopic, timetableSlot? } — extract the subtopic
      const rawData = response.data.data as any;
      const subtopic = rawData.subtopic || rawData;
      response.data.data = this.normalizeSubtopic(subtopic);
    }

    return response;
  }

  /**
   * Update a subtopic.
   * PATCH /activities/modules/:moduleId/update-subtopic/:id
   */
  async updateSubtopic(
    moduleId: string,
    subtopicId: string,
    updates: Partial<{
      name: string;
      lecturerId: string;
      weeks: number;
      hoursPerWeek: number;
      order: number;
    }>,
  ): Promise<ApiResponse<BackendResponse<SubTopic>>> {
    const token = await this.getToken();
    const response = await api.patch<BackendResponse<SubTopic>>(
      `${this.basePath}/modules/${moduleId}/update-subtopic/${subtopicId}`,
      updates,
      token || undefined,
    );

    if (response.success && response.data?.data) {
      response.data.data = this.normalizeSubtopic(response.data.data);
    }

    return response;
  }

  /**
   * Delete a subtopic.
   * DELETE /activities/modules/:moduleId/subtopics/:id
   */
  async removeSubtopic(
    moduleId: string,
    subtopicId: string,
  ): Promise<ApiResponse<BackendResponse<SubTopic>>> {
    const token = await this.getToken();
    return api.delete<BackendResponse<SubTopic>>(
      `${this.basePath}/modules/${moduleId}/subtopics/${subtopicId}`,
      token || undefined,
    );
  }

  // --- Timetable CRUD ---

  /**
   * Get timetables, optionally filtered by level, semester, and academicYear.
   * GET /activities/timetables?level=&semester=&academicYear=
   */
  async getTimetables(
    level?: number,
    semester?: number,
    academicYear?: string,
  ): Promise<ApiResponse<BackendResponse<ModuleTimetable[]>>> {
    const token = await this.getToken();
    const params: Record<string, string | number | boolean> = {};
    if (level !== undefined) params.level = level;
    if (semester !== undefined) params.semester = semester;
    if (academicYear) params.academicYear = academicYear;

    const response = await api.get<BackendResponse<ModuleTimetable[]>>(
      `${this.basePath}/timetables`,
      token || undefined,
      { params },
    );

    if (response.success && response.data?.data) {
      response.data.data = response.data.data.map((tt) =>
        this.normalizeTimetable(tt),
      );
    }

    return response;
  }

  /**
   * Get a single timetable by ID.
   * GET /activities/timetables/:id
   */
  async getTimetableById(
    id: string,
  ): Promise<ApiResponse<BackendResponse<ModuleTimetable>>> {
    const token = await this.getToken();
    const response = await api.get<BackendResponse<ModuleTimetable>>(
      `${this.basePath}/timetables/${id}`,
      token || undefined,
    );

    if (response.success && response.data?.data) {
      response.data.data = this.normalizeTimetable(response.data.data);
    }

    return response;
  }

  /**
   * Get the timetable for a specific module.
   * GET /activities/modules/:moduleId/timetable?academicYear=
   */
  async getTimetableForModule(
    moduleId: string,
    academicYear?: string,
  ): Promise<ApiResponse<BackendResponse<ModuleTimetable>>> {
    const token = await this.getToken();
    const params: Record<string, string | number | boolean> = {};
    if (academicYear) params.academicYear = academicYear;

    const response = await api.get<BackendResponse<ModuleTimetable>>(
      `${this.basePath}/modules/${moduleId}/timetable`,
      token || undefined,
      { params },
    );

    if (response.success && response.data?.data) {
      response.data.data = this.normalizeTimetable(response.data.data);
    }

    return response;
  }

  /**
   * Create a new timetable (or upsert via backend).
   * POST /activities/create-timetable
   */
  async createTimetable(timetable: {
    moduleId: string;
    level: number;
    semester: number;
    academicYear: string;
    totalWeeks: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<BackendResponse<ModuleTimetable>>> {
    const token = await this.getToken();
    const response = await api.post<BackendResponse<ModuleTimetable>>(
      `${this.basePath}/create-timetable`,
      timetable,
      token || undefined,
    );

    if (response.success && response.data?.data) {
      response.data.data = this.normalizeTimetable(response.data.data);
    }

    return response;
  }

  /**
   * Update an existing timetable.
   * PATCH /activities/update-timetable/:id
   */
  async updateTimetable(
    id: string,
    updates: Partial<{
      academicYear: string;
      totalWeeks: number;
      startDate: string;
      endDate: string;
    }>,
  ): Promise<ApiResponse<BackendResponse<ModuleTimetable>>> {
    const token = await this.getToken();
    const response = await api.patch<BackendResponse<ModuleTimetable>>(
      `${this.basePath}/update-timetable/${id}`,
      updates,
      token || undefined,
    );

    if (response.success && response.data?.data) {
      response.data.data = this.normalizeTimetable(response.data.data);
    }

    return response;
  }

  /**
   * Delete a timetable.
   * DELETE /activities/timetables/:id
   */
  async deleteTimetable(
    id: string,
  ): Promise<ApiResponse<BackendResponse<ModuleTimetable>>> {
    const token = await this.getToken();
    return api.delete<BackendResponse<ModuleTimetable>>(
      `${this.basePath}/timetables/${id}`,
      token || undefined,
    );
  }

  // --- Timetable Slots ---

  /**
   * Get slots for a timetable, optionally filtered by week.
   * GET /activities/timetables/:timetableId/slots?week=
   */
  async getTimetableSlots(
    timetableId: string,
    week?: number,
  ): Promise<ApiResponse<BackendResponse<TimetableSlot[]>>> {
    const token = await this.getToken();
    const params: Record<string, string | number | boolean> = {};
    if (week !== undefined) params.week = week;

    const response = await api.get<BackendResponse<TimetableSlot[]>>(
      `${this.basePath}/timetables/${timetableId}/slots`,
      token || undefined,
      { params },
    );

    if (response.success && response.data?.data) {
      response.data.data = response.data.data.map((s) => this.normalizeSlot(s));
    }

    return response;
  }

  /**
   * Add a slot to a timetable.
   * POST /activities/timetables/:timetableId/slots
   */
  async addTimetableSlot(
    timetableId: string,
    slot: {
      moduleId: string;
      subtopicId: string;
      day: string;
      startTime: string;
      endTime: string;
      lecturerId?: string;
      venue?: string;
      week?: number;
      activityType?: string;
      colSpan?: number;
    },
  ): Promise<ApiResponse<BackendResponse<TimetableSlot>>> {
    const token = await this.getToken();
    const response = await api.post<BackendResponse<TimetableSlot>>(
      `${this.basePath}/timetables/${timetableId}/slots`,
      slot,
      token || undefined,
    );

    if (response.success && response.data?.data) {
      response.data.data = this.normalizeSlot(response.data.data);
    }

    return response;
  }

  /**
   * Update a timetable slot.
   * PATCH /activities/timetables/:timetableId/slots/:id
   */
  async updateTimetableSlot(
    timetableId: string,
    slotId: string,
    updates: Partial<{
      day: string;
      startTime: string;
      endTime: string;
      subtopicId: string;
      moduleId: string;
      lecturerId: string;
      venue: string;
      week: number;
      activityType: string;
      colSpan: number;
    }>,
  ): Promise<ApiResponse<BackendResponse<TimetableSlot>>> {
    const token = await this.getToken();
    const response = await api.patch<BackendResponse<TimetableSlot>>(
      `${this.basePath}/timetables/${timetableId}/slots/${slotId}`,
      updates,
      token || undefined,
    );

    if (response.success && response.data?.data) {
      response.data.data = this.normalizeSlot(response.data.data);
    }

    return response;
  }

  /**
   * Remove a timetable slot.
   * DELETE /activities/timetables/:timetableId/slots/:id
   */
  async removeTimetableSlot(
    timetableId: string,
    slotId: string,
  ): Promise<ApiResponse<BackendResponse<TimetableSlot>>> {
    const token = await this.getToken();
    return api.delete<BackendResponse<TimetableSlot>>(
      `${this.basePath}/timetables/${timetableId}/slots/${slotId}`,
      token || undefined,
    );
  }

  // --- Lecturer Schedule ---

  /**
   * Get a lecturer's teaching schedule.
   * GET /activities/lecturers/:lecturerId/schedule
   */
  async getLecturerSchedule(
    lecturerId: string,
  ): Promise<ApiResponse<BackendResponse<TimetableSlot[]>>> {
    const token = await this.getToken();
    const response = await api.get<BackendResponse<TimetableSlot[]>>(
      `${this.basePath}/lecturers/${lecturerId}/schedule`,
      token || undefined,
    );

    if (response.success && response.data?.data) {
      response.data.data = response.data.data.map((s) => this.normalizeSlot(s));
    }

    return response;
  }
}

export const modulesService = new ModulesService();
