import { api, ApiResponse } from "@/apis/api";

// Enums matching the backend
export enum SessionMode {
  CHECK_IN = "CHECK_IN",
  CHECK_OUT = "CHECK_OUT",
}

export enum SessionStatus {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  SCHEDULED = "SCHEDULED",
}

export enum SessionType {
  CLASS = "CLASS",
  EXAM = "EXAM",
  LAB = "LAB",
  TUTORIAL = "TUTORIAL",
  EVENT = "EVENT",
  WORKSHIFT = "WORKSHIFT",
}

// Interfaces
export interface CreateSessionPayload {
  name: string;
  type: SessionType;
  mode: SessionMode;
  courseId?: string;
  lecturerId?: string;
  location?: string;
  startTime: Date | string;
  endTime: Date | string;
}

export interface UpdateSessionPayload {
  name?: string;
  type?: SessionType;
  location?: string;
  startTime?: Date | string;
  endTime?: Date | string;
}

// Course enrollment type for expected attendees
// Based on Prisma schema: CourseEnrollment → Student → User
export interface CourseEnrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt?: Date;
  student?: {
    id: string;
    studentId?: string;
    matricNo?: string;
    user?: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export enum AttendanceStatus {
  PRESENT = "PRESENT",
  LATE = "LATE",
  EXCUSED = "EXCUSED",
  ABSENT = "ABSENT",
  CHECKED_IN = "CHECKED_IN",
}

export interface Attendance {
  id: string;
  sessionId: string;
  userId: string;
  timestamp: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  confidence?: number;
  source?: string;
  status: AttendanceStatus;
  // Populated user data from backend
  user?: {
    id: string;
    name: string;
    email: string;
    student?: {
      studentId?: string;
      matricNo?: string;
      department?: string;
    };
  };
}

export interface Session {
  id: string;
  name: string;
  token: string;
  location?: string;
  lecturerId?: string;
  courseId?: string;
  startTime: Date;
  endTime: Date;
  mode: SessionMode;
  type: SessionType;
  lateThreshold: number;
  absentThreshold: number;
  status: SessionStatus;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  lecturer?: {
    id: string;
    staffNo?: string;
    userId: string;
  };
  course?: {
    id: string;
    code: string;
    title: string;
    enrollments?: CourseEnrollment[];
    _count?: {
      enrollments: number;
    };
  };
  attendances?: Attendance[];
  // Expected attendees count (from course enrollments)
  expectedAttendeesCount?: number;
}

// Session Service Functions

/**
 * Create a new session
 */
export const createSession = async (
  payload: CreateSessionPayload,
  token: string,
): Promise<ApiResponse<{ success: boolean; data: Session }>> => {
  return api.post("/sessions/create", payload, token);
};

/**
 * Close an active session
 */
export const closeSession = async (
  sessionId: string,
  token: string,
): Promise<ApiResponse<{ success: boolean; data: Session }>> => {
  return api.get(`/sessions/close`, token, {
    params: { sessionId },
  });
};

/**
 * Get all sessions (Admin only)
 */
export const getAllSessionsAdmin = async (
  token: string,
): Promise<ApiResponse<{ success: boolean; data: Session[] }>> => {
  return api.get("/sessions/admin/all-sessions", token);
};

/**
 * Get sessions created by the current user (Lecturers and Course Reps)
 */
export const getCreatorSessions = async (
  token: string,
): Promise<ApiResponse<{ sessions: Session[] }>> => {
  return api.get("/sessions/creator-sessions", token);
};

/**
 * Toggle session mode between CHECK_IN and CHECK_OUT
 */
export const toggleSessionMode = async (
  sessionId: string,
  token: string,
  mail?: string,
): Promise<ApiResponse<{ success: boolean; message: string }>> => {
  const params: Record<string, string> = { sessionId };
  if (mail) {
    params.mail = mail;
  }
  return api.get("/sessions/toggle-mode", token, { params });
};

/**
 * Delete a session
 */
export const deleteSession = async (
  sessionId: string,
  token: string,
): Promise<ApiResponse<{ success: boolean; message: string }>> => {
  return api.delete("/sessions/delete", token, {
    params: { sessionId },
  });
};

/**
 * Update a session
 */
export const updateSession = async (
  sessionId: string,
  payload: UpdateSessionPayload,
  token: string,
): Promise<
  ApiResponse<{ success: boolean; message: string; session: Session }>
> => {
  return api.patch(`/sessions/update`, payload, token, {
    params: { sessionId },
  });
};

/**
 * Approve a session (Admin only)
 */
export const approveSession = async (
  sessionId: string,
  token: string,
): Promise<ApiResponse<{ success: boolean; message: string }>> => {
  return api.get("/sessions/approve", token, {
    params: { sessionId },
  });
};

/**
 * Disprove/reject a session (Admin only)
 */
export const disproveSession = async (
  sessionId: string,
  token: string,
): Promise<ApiResponse<{ success: boolean; message: string }>> => {
  return api.get("/sessions/disprove", token, {
    params: { sessionId },
  });
};

/**
 * Get a session by ID (public endpoint for kiosk mode)
 */
export const getSessionById = async (
  sessionId: string,
): Promise<ApiResponse<Session>> => {
  return api.get(`/sessions/session`, undefined, {
    params: { sessionId },
  });
};

/**
 * Generate QR code for a session (Session creator only)
 * The QR code links to the kiosk mode for attendance taking
 * Note: Email is extracted from JWT token on the backend
 */
export const generateSessionQrCode = async (
  sessionId: string,
  token: string,
): Promise<ApiResponse<{ message: string; data: string }>> => {
  return api.get("/sessions/generate-qrcode", token, {
    params: { sessionId },
  });
};

// Utility functions

/**
 * Check if a session is currently active
 */
export const isSessionActive = (session: Session): boolean => {
  const now = new Date();
  const startTime = new Date(session.startTime);
  const endTime = new Date(session.endTime);

  return (
    session.status === SessionStatus.OPEN && now >= startTime && now <= endTime
  );
};

/**
 * Check if a session can be toggled to CHECK_OUT mode
 */
export const canToggleToCheckOut = (session: Session): boolean => {
  if (session.status === SessionStatus.CLOSED) return false;
  if (session.mode === SessionMode.CHECK_OUT) return false;

  const GRACE_MINUTES = 15;
  const now = Date.now();
  const endTime = new Date(session.endTime).getTime();
  const graceDeadline = endTime + GRACE_MINUTES * 60 * 1000;

  return now <= graceDeadline;
};

/**
 * Get session duration in hours
 */
export const getSessionDurationHours = (session: Session): number => {
  const startTime = new Date(session.startTime).getTime();
  const endTime = new Date(session.endTime).getTime();
  return (endTime - startTime) / (1000 * 60 * 60);
};

/**
 * Format session status for display
 */
export const formatSessionStatus = (status: SessionStatus): string => {
  const statusMap: Record<SessionStatus, string> = {
    [SessionStatus.OPEN]: "Active",
    [SessionStatus.CLOSED]: "Closed",
    [SessionStatus.SCHEDULED]: "Scheduled",
  };
  return statusMap[status] || status;
};

/**
 * Format session type for display
 */
export const formatSessionType = (type: SessionType): string => {
  const typeMap: Record<SessionType, string> = {
    [SessionType.CLASS]: "Class",
    [SessionType.EXAM]: "Exam",
    [SessionType.LAB]: "Lab",
    [SessionType.TUTORIAL]: "Tutorial",
    [SessionType.EVENT]: "Event",
    [SessionType.WORKSHIFT]: "Work Shift",
  };
  return typeMap[type] || type;
};

/**
 * Format session mode for display
 */
export const formatSessionMode = (mode: SessionMode): string => {
  const modeMap: Record<SessionMode, string> = {
    [SessionMode.CHECK_IN]: "Check In",
    [SessionMode.CHECK_OUT]: "Check Out",
  };
  return modeMap[mode] || mode;
};
