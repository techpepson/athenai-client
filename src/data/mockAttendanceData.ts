/**
 * Mock attendance data for the Student Attendance Management System (Frontend Only)
 * This file provides static data and helper functions for managing attendance state.
 */

// Local storage keys
export const ENROLLED_MODULES_KEY = "enrolled_modules";
export const STUDENT_LEVEL_KEY = "student_level";
export const ATTENDANCE_RECORDS_KEY = "attendance_records";

// Attendance status type
export type AttendanceStatus = "present" | "absent";

// Individual attendance record
export interface AttendanceRecord {
  id: string;
  sessionId: string;
  slotId: string;
  studentId: string;
  studentName: string;
  moduleCode: string;
  moduleName: string;
  topic: string;
  date: string; // ISO date string
  week: number;
  status: AttendanceStatus;
  signedAt?: string; // ISO date string
}

// Session with attendance info
export interface SessionAttendanceInfo {
  sessionId: string;
  slotId: string;
  moduleCode: string;
  moduleName: string;
  topic: string;
  date: string;
  week: number;
  startTime: string;
  endTime: string;
}

// Mock students for the class
export const MOCK_STUDENTS = [
  { id: "student-1", name: "John Mensah", studentId: "STU001" },
  { id: "student-2", name: "Ama Asante", studentId: "STU002" },
  { id: "student-3", name: "Kwame Owusu", studentId: "STU003" },
  { id: "student-4", name: "Akosua Adjei", studentId: "STU004" },
  { id: "student-5", name: "Kofi Boateng", studentId: "STU005" },
  { id: "student-6", name: "Efua Darko", studentId: "STU006" },
  { id: "student-7", name: "Yaw Appiah", studentId: "STU007" },
  { id: "student-8", name: "Adwoa Mensah", studentId: "STU008" },
  { id: "student-9", name: "Kwesi Asare", studentId: "STU009" },
  { id: "student-10", name: "Abena Osei", studentId: "STU010" },
];

// Get student's level from localStorage
export const getStudentLevel = (): number => {
  const stored = localStorage.getItem(STUDENT_LEVEL_KEY);
  return stored ? parseInt(stored) : 100;
};

// Set student's level
export const setStudentLevel = (level: number): void => {
  localStorage.setItem(STUDENT_LEVEL_KEY, level.toString());
};

// Get enrolled modules from localStorage
export const getEnrolledModules = (): string[] => {
  const stored = localStorage.getItem(ENROLLED_MODULES_KEY);
  try {
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Set enrolled modules
export const setEnrolledModules = (moduleCodes: string[]): void => {
  localStorage.setItem(ENROLLED_MODULES_KEY, JSON.stringify(moduleCodes));
};

// Add a module to enrollment
export const enrollModule = (moduleCode: string): void => {
  const current = getEnrolledModules();
  if (!current.includes(moduleCode)) {
    current.push(moduleCode);
    setEnrolledModules(current);
  }
};

// Remove a module from enrollment
export const unenrollModule = (moduleCode: string): void => {
  const current = getEnrolledModules();
  setEnrolledModules(current.filter((code) => code !== moduleCode));
};

// Check if any modules are enrolled
export const hasEnrolledModules = (): boolean => {
  return getEnrolledModules().length > 0;
};

// Get all attendance records from localStorage
export const getAttendanceRecords = (): AttendanceRecord[] => {
  const stored = localStorage.getItem(ATTENDANCE_RECORDS_KEY);
  try {
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save attendance records
export const saveAttendanceRecords = (records: AttendanceRecord[]): void => {
  localStorage.setItem(ATTENDANCE_RECORDS_KEY, JSON.stringify(records));
};

// Get attendance records for a specific student
export const getStudentAttendance = (studentId: string): AttendanceRecord[] => {
  return getAttendanceRecords().filter((r) => r.studentId === studentId);
};

// Get attendance records for a session
export const getSessionAttendance = (sessionId: string): AttendanceRecord[] => {
  return getAttendanceRecords().filter((r) => r.sessionId === sessionId);
};

// Mark/update attendance for a student in a session
export const markAttendance = (
  sessionId: string,
  slotId: string,
  studentId: string,
  studentName: string,
  moduleCode: string,
  moduleName: string,
  topic: string,
  date: string,
  week: number,
  status: AttendanceStatus
): void => {
  const records = getAttendanceRecords();
  const existingIndex = records.findIndex(
    (r) => r.sessionId === sessionId && r.studentId === studentId
  );

  const record: AttendanceRecord = {
    id: existingIndex >= 0 ? records[existingIndex].id : `att-${Date.now()}-${studentId}`,
    sessionId,
    slotId,
    studentId,
    studentName,
    moduleCode,
    moduleName,
    topic,
    date,
    week,
    status,
    signedAt: status === "present" ? new Date().toISOString() : undefined,
  };

  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }

  saveAttendanceRecords(records);
};

// Generate mock attendance records for enrolled modules
export const generateMockAttendanceForSession = (
  session: SessionAttendanceInfo,
  currentStudentId: string
): void => {
  const records = getAttendanceRecords();
  
  // Check if records already exist for this session
  const existingForSession = records.filter((r) => r.sessionId === session.sessionId);
  if (existingForSession.length > 0) return;

  // Generate records for all mock students
  MOCK_STUDENTS.forEach((student) => {
    // Random attendance status (80% present, 20% absent)
    const isPresent = Math.random() > 0.2;
    
    const record: AttendanceRecord = {
      id: `att-${session.sessionId}-${student.id}`,
      sessionId: session.sessionId,
      slotId: session.slotId,
      studentId: student.id,
      studentName: student.name,
      moduleCode: session.moduleCode,
      moduleName: session.moduleName,
      topic: session.topic,
      date: session.date,
      week: session.week,
      status: isPresent ? "present" : "absent",
      signedAt: isPresent ? new Date().toISOString() : undefined,
    };
    
    records.push(record);
  });

  saveAttendanceRecords(records);
};

// Get unique sessions from attendance records (for date dropdown)
export const getUniqueSessions = (): { date: string; sessionId: string; moduleCode: string; topic: string }[] => {
  const records = getAttendanceRecords();
  const seen = new Set<string>();
  const sessions: { date: string; sessionId: string; moduleCode: string; topic: string }[] = [];

  records.forEach((r) => {
    if (!seen.has(r.sessionId)) {
      seen.add(r.sessionId);
      sessions.push({
        date: r.date,
        sessionId: r.sessionId,
        moduleCode: r.moduleCode,
        topic: r.topic,
      });
    }
  });

  // Sort by date descending
  sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return sessions;
};

// Initialize mock data if not present
export const initializeMockAttendanceData = (currentStudentId: string): void => {
  // Add current user to mock students if not present
  const currentUserIndex = MOCK_STUDENTS.findIndex((s) => s.id === currentStudentId);
  if (currentUserIndex === -1 && currentStudentId) {
    MOCK_STUDENTS.unshift({
      id: currentStudentId,
      name: "Current User",
      studentId: "STU000",
    });
  }
};
