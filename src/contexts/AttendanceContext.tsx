/**
 * AttendanceContext - Module enrollment state management
 * Manages module enrollment preferences (stored in localStorage).
 * Attendance records are now fetched from the backend API by individual components.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { modulesService, Module } from "@/services/modules.service";

// Storage keys
const ENROLLED_MODULES_KEY = "enrolled_modules";
const STUDENT_LEVEL_KEY = "student_level";
const AUTO_ENROLLED_KEY = "auto_enrolled_flag";

// Get student's level from localStorage
const getStudentLevel = (): number => {
  const stored = localStorage.getItem(STUDENT_LEVEL_KEY);
  return stored ? parseInt(stored) : 100;
};

// Get enrolled modules from localStorage
const getEnrolledModules = (): string[] => {
  const stored = localStorage.getItem(ENROLLED_MODULES_KEY);
  try {
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save enrolled modules to localStorage
const saveEnrolledModules = (moduleCodes: string[]): void => {
  localStorage.setItem(ENROLLED_MODULES_KEY, JSON.stringify(moduleCodes));
};

interface AttendanceContextType {
  // Module enrollment
  enrolledModules: string[];
  availableModules: Module[];
  enrollModule: (moduleCode: string) => void;
  unenrollModule: (moduleCode: string) => void;
  setAllEnrolledModules: (moduleCodes: string[]) => void;
  autoEnrollByLevel: () => void;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(
  undefined,
);

export const AttendanceProvider = ({ children }: { children: ReactNode }) => {
  // Module enrollment state
  const [enrolledModules, setEnrolledModulesState] = useState<string[]>([]);
  const [availableModules, setAvailableModules] = useState<Module[]>([]);

  // Initialize on mount
  useEffect(() => {
    // Load enrolled modules
    const enrolled = getEnrolledModules();
    setEnrolledModulesState(enrolled);

    // Load available modules for student's level
    const level = getStudentLevel();
    const initModules = async () => {
      const res = await modulesService.getModulesByLevel(level);
      if (res.success && res.data?.data) {
        const levelModules = res.data.data;
        setAvailableModules(levelModules);

        // Auto-enroll if not done before
        const autoEnrolled = localStorage.getItem(AUTO_ENROLLED_KEY);
        if (!autoEnrolled && enrolled.length === 0 && levelModules.length > 0) {
          const allCodes = levelModules.map((m) => m.code);
          saveEnrolledModules(allCodes);
          setEnrolledModulesState(allCodes);
          localStorage.setItem(AUTO_ENROLLED_KEY, "true");
        }
      }
    };
    initModules();
  }, []);

  // Auto-enroll all modules for student's level
  const autoEnrollByLevel = useCallback(async () => {
    const level = getStudentLevel();
    const res = await modulesService.getModulesByLevel(level);
    if (res.success && res.data?.data) {
      const allCodes = res.data.data.map((m) => m.code);
      saveEnrolledModules(allCodes);
      setEnrolledModulesState(allCodes);
      localStorage.setItem(AUTO_ENROLLED_KEY, "true");
    }
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

  return (
    <AttendanceContext.Provider
      value={{
        enrolledModules,
        availableModules,
        enrollModule,
        unenrollModule,
        setAllEnrolledModules,
        autoEnrollByLevel,
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
