/**
 * AttendanceContext - Shared state for the Student Attendance Management System
 * Manages:
 * - Active sessions (started / not started)
 * - Per-student sign-in records
 * - Module enrollment per student
 * - Real-time updates when Class Rep modifies attendance
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  getEnrolledModules,
  setEnrolledModules as saveEnrolledModules,
  getStudentLevel,
  getAttendanceRecords,
  saveAttendanceRecords,
  AttendanceRecord,
  AttendanceStatus,
  MOCK_STUDENTS,
} from "@/data/mockAttendanceData";
import {
  modulesService,
  TimetableSlot,
  Module,
} from "@/services/modules.service";

// Active session info
export interface ActiveSession {
  sessionId: string;
  slotId: string;
  moduleCode: string;
  moduleName: string;
  topic: string;
  date: string;
  week: number;
  startTime: string;
  endTime: string;
  startedAt: string;
  startedBy: string; // Class Rep who started
  isActive: boolean;
}

// Storage keys
const ACTIVE_SESSIONS_KEY = "active_sessions";
const AUTO_ENROLLED_KEY = "auto_enrolled_flag";

interface AttendanceContextType {
  // Module enrollment
  enrolledModules: string[];
  availableModules: Module[];
  enrollModule: (moduleCode: string) => void;
  unenrollModule: (moduleCode: string) => void;
  setAllEnrolledModules: (moduleCodes: string[]) => void;
  autoEnrollByLevel: () => void;

  // Active sessions
  activeSessions: ActiveSession[];
  startSession: (
    session: Omit<ActiveSession, "startedAt" | "isActive">,
  ) => void;
  endSession: (sessionId: string) => void;
  isSessionActive: (sessionId: string) => boolean;
  getActiveSession: (sessionId: string) => ActiveSession | undefined;

  // Attendance records
  attendanceRecords: AttendanceRecord[];
  signIn: (sessionId: string, studentId: string, studentName: string) => void;
  markAttendance: (
    sessionId: string,
    studentId: string,
    studentName: string,
    status: AttendanceStatus,
  ) => void;
  getStudentAttendance: (studentId: string) => AttendanceRecord[];
  getSessionAttendance: (sessionId: string) => AttendanceRecord[];
  refreshRecords: () => void;

  // Timetable sessions (from modules)
  timetableSessions: ActiveSession[];
  loadTimetableSessions: () => void;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(
  undefined,
);

// Get active sessions from localStorage
const getStoredActiveSessions = (): ActiveSession[] => {
  try {
    const stored = localStorage.getItem(ACTIVE_SESSIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save active sessions to localStorage
const saveActiveSessions = (sessions: ActiveSession[]): void => {
  localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(sessions));
};

export const AttendanceProvider = ({ children }: { children: ReactNode }) => {
  // Module enrollment state
  const [enrolledModules, setEnrolledModulesState] = useState<string[]>([]);
  const [availableModules, setAvailableModules] = useState<Module[]>([]);

  // Active sessions state
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);

  // Attendance records state
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);

  // Timetable sessions (derived from modules)
  const [timetableSessions, setTimetableSessions] = useState<ActiveSession[]>(
    [],
  );

  // Initialize on mount
  useEffect(() => {
    // Load enrolled modules
    const enrolled = getEnrolledModules();
    setEnrolledModulesState(enrolled);

    // Load active sessions
    setActiveSessions(getStoredActiveSessions());

    // Load attendance records
    setAttendanceRecords(getAttendanceRecords());

    // Load available modules for student's level
    const level = getStudentLevel();
    const levelModules = modulesService.getModulesByLevel(level);
    setAvailableModules(levelModules);

    // Auto-enroll if not done before
    const autoEnrolled = localStorage.getItem(AUTO_ENROLLED_KEY);
    if (!autoEnrolled && enrolled.length === 0 && levelModules.length > 0) {
      const allCodes = levelModules.map((m) => m.code);
      saveEnrolledModules(allCodes);
      setEnrolledModulesState(allCodes);
      localStorage.setItem(AUTO_ENROLLED_KEY, "true");
    }
  }, []);

  // Load timetable sessions from modules
  const loadTimetableSessions = useCallback(() => {
    const enrolled = getEnrolledModules();
    const modules = modulesService
      .getModules()
      .filter((m) => enrolled.includes(m.code));
    const timetables = modulesService.getTimetables();

    const sessions: ActiveSession[] = [];
    const today = new Date();
    const currentYear = today.getFullYear();

    modules.forEach((mod) => {
      // Find timetable for this module
      const timetable = timetables.find((t) => t.moduleId === mod.id);
      if (!timetable) return;

      // Get unique slots (ignoring week - we'll generate for all weeks)
      const uniqueSlots = timetable.slots.filter(
        (slot) => slot.activityType === "LECTURE",
      );

      // Generate sessions for ALL weeks (cumulative attendance)
      for (let week = 1; week <= timetable.totalWeeks; week++) {
        uniqueSlots.forEach((slot) => {
          // Skip if this slot specifies a different week
          if (slot.week && slot.week !== week) return;

          // Calculate actual date for this slot based on week
          const weekStartDate = timetable.startDate
            ? new Date(timetable.startDate)
            : new Date(currentYear, 1, 3); // Default to Feb 3

          // Find day offset
          const days = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ];
          const dayIndex = days.findIndex(
            (d) => d.toUpperCase() === slot.day.toUpperCase(),
          );

          // Calculate the date for this week
          const weekOffset = week - 1;
          const slotDate = new Date(weekStartDate);
          slotDate.setDate(
            slotDate.getDate() +
              weekOffset * 7 +
              (dayIndex > 0 ? dayIndex - 1 : 0),
          );

          const subtopic = mod.subtopics.find((s) => s.id === slot.subtopicId);

          sessions.push({
            sessionId: `slot-${slot.id}-week${week}`,
            slotId: slot.id,
            moduleCode: mod.code,
            moduleName: mod.name,
            topic: subtopic?.name || slot.activityType || "Lecture",
            date: slotDate.toISOString().split("T")[0],
            week: week,
            startTime: slot.startTime,
            endTime: slot.endTime,
            startedAt: "",
            startedBy: "",
            isActive: false,
          });
        });
      }
    });

    // Merge with actually active sessions
    const active = getStoredActiveSessions();
    const merged = sessions.map((s) => {
      const activeSession = active.find(
        (a) => a.slotId === s.slotId || a.sessionId === s.sessionId,
      );
      if (activeSession) {
        return { ...s, ...activeSession };
      }
      return s;
    });

    setTimetableSessions(merged);
  }, []);

  // Refresh records from localStorage
  const refreshRecords = useCallback(() => {
    setAttendanceRecords(getAttendanceRecords());
    setActiveSessions(getStoredActiveSessions());
    setEnrolledModulesState(getEnrolledModules());
  }, []);

  // Auto-enroll all modules for student's level
  const autoEnrollByLevel = useCallback(() => {
    const level = getStudentLevel();
    const levelModules = modulesService.getModulesByLevel(level);
    const allCodes = levelModules.map((m) => m.code);
    saveEnrolledModules(allCodes);
    setEnrolledModulesState(allCodes);
    localStorage.setItem(AUTO_ENROLLED_KEY, "true");
  }, []);

  // Enroll a single module
  const enrollModule = useCallback((moduleCode: string) => {
    const current = getEnrolledModules();
    if (!current.includes(moduleCode)) {
      const updated = [...current, moduleCode];
      saveEnrolledModules(updated);
      setEnrolledModulesState(updated);
    }
  }, []);

  // Unenroll a module
  const unenrollModule = useCallback((moduleCode: string) => {
    const current = getEnrolledModules();
    const updated = current.filter((code) => code !== moduleCode);
    saveEnrolledModules(updated);
    setEnrolledModulesState(updated);
  }, []);

  // Set all enrolled modules at once
  const setAllEnrolledModules = useCallback((moduleCodes: string[]) => {
    saveEnrolledModules(moduleCodes);
    setEnrolledModulesState(moduleCodes);
  }, []);

  // Start a session (Class Rep action)
  const startSession = useCallback(
    (session: Omit<ActiveSession, "startedAt" | "isActive">) => {
      const newSession: ActiveSession = {
        ...session,
        startedAt: new Date().toISOString(),
        isActive: true,
      };

      const current = getStoredActiveSessions();
      // Replace if exists, otherwise add
      const existingIndex = current.findIndex(
        (s) => s.sessionId === session.sessionId || s.slotId === session.slotId,
      );
      if (existingIndex >= 0) {
        current[existingIndex] = newSession;
      } else {
        current.push(newSession);
      }
      saveActiveSessions(current);
      setActiveSessions(current);

      // Initialize empty attendance records for all students in this session
      const records = getAttendanceRecords();
      MOCK_STUDENTS.forEach((student) => {
        const exists = records.find(
          (r) =>
            r.sessionId === newSession.sessionId && r.studentId === student.id,
        );
        if (!exists) {
          records.push({
            id: `att-${newSession.sessionId}-${student.id}`,
            sessionId: newSession.sessionId,
            slotId: newSession.slotId,
            studentId: student.id,
            studentName: student.name,
            moduleCode: newSession.moduleCode,
            moduleName: newSession.moduleName,
            topic: newSession.topic,
            date: newSession.date,
            week: newSession.week,
            status: "absent", // Default to absent until signed in
            signedAt: undefined,
          });
        }
      });
      saveAttendanceRecords(records);
      setAttendanceRecords(records);
    },
    [],
  );

  // End a session
  const endSession = useCallback((sessionId: string) => {
    const current = getStoredActiveSessions();
    const updated = current.map((s) =>
      s.sessionId === sessionId ? { ...s, isActive: false } : s,
    );
    saveActiveSessions(updated);
    setActiveSessions(updated);
  }, []);

  // Check if session is active
  const isSessionActive = useCallback(
    (sessionId: string) => {
      return activeSessions.some(
        (s) => s.sessionId === sessionId && s.isActive,
      );
    },
    [activeSessions],
  );

  // Get active session by ID
  const getActiveSession = useCallback(
    (sessionId: string) => {
      return activeSessions.find((s) => s.sessionId === sessionId);
    },
    [activeSessions],
  );

  // Student sign-in
  const signIn = useCallback(
    (sessionId: string, studentId: string, studentName: string) => {
      const records = getAttendanceRecords();
      const existingIndex = records.findIndex(
        (r) => r.sessionId === sessionId && r.studentId === studentId,
      );

      if (existingIndex >= 0) {
        records[existingIndex].status = "present";
        records[existingIndex].signedAt = new Date().toISOString();
      } else {
        // Find session info
        const session = activeSessions.find((s) => s.sessionId === sessionId);
        if (session) {
          records.push({
            id: `att-${sessionId}-${studentId}`,
            sessionId,
            slotId: session.slotId,
            studentId,
            studentName,
            moduleCode: session.moduleCode,
            moduleName: session.moduleName,
            topic: session.topic,
            date: session.date,
            week: session.week,
            status: "present",
            signedAt: new Date().toISOString(),
          });
        }
      }

      saveAttendanceRecords(records);
      setAttendanceRecords([...records]);
    },
    [activeSessions],
  );

  // Mark attendance (Class Rep action)
  const markAttendanceFunc = useCallback(
    (
      sessionId: string,
      studentId: string,
      studentName: string,
      status: AttendanceStatus,
    ) => {
      const records = getAttendanceRecords();
      const existingIndex = records.findIndex(
        (r) => r.sessionId === sessionId && r.studentId === studentId,
      );

      if (existingIndex >= 0) {
        records[existingIndex].status = status;
        records[existingIndex].signedAt =
          status === "present" ? new Date().toISOString() : undefined;
      } else {
        // Find session info
        const session = activeSessions.find((s) => s.sessionId === sessionId);
        if (session) {
          records.push({
            id: `att-${sessionId}-${studentId}`,
            sessionId,
            slotId: session.slotId,
            studentId,
            studentName,
            moduleCode: session.moduleCode,
            moduleName: session.moduleName,
            topic: session.topic,
            date: session.date,
            week: session.week,
            status,
            signedAt:
              status === "present" ? new Date().toISOString() : undefined,
          });
        }
      }

      saveAttendanceRecords(records);
      setAttendanceRecords([...records]);
    },
    [activeSessions],
  );

  // Get attendance for a specific student
  const getStudentAttendanceFunc = useCallback(
    (studentId: string) => {
      return attendanceRecords.filter((r) => r.studentId === studentId);
    },
    [attendanceRecords],
  );

  // Get attendance for a session
  const getSessionAttendanceFunc = useCallback(
    (sessionId: string) => {
      return attendanceRecords.filter((r) => r.sessionId === sessionId);
    },
    [attendanceRecords],
  );

  return (
    <AttendanceContext.Provider
      value={{
        // Module enrollment
        enrolledModules,
        availableModules,
        enrollModule,
        unenrollModule,
        setAllEnrolledModules,
        autoEnrollByLevel,

        // Active sessions
        activeSessions,
        startSession,
        endSession,
        isSessionActive,
        getActiveSession,

        // Attendance records
        attendanceRecords,
        signIn,
        markAttendance: markAttendanceFunc,
        getStudentAttendance: getStudentAttendanceFunc,
        getSessionAttendance: getSessionAttendanceFunc,
        refreshRecords,

        // Timetable sessions
        timetableSessions,
        loadTimetableSessions,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (context === undefined) {
    throw new Error("useAttendance must be used within an AttendanceProvider");
  }
  return context;
};
