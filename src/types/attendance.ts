import { Role } from "@/enums/enums";

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  studentId?: string;
  photoUrl?: string;
  parentContact?: {
    name: string;
    email: string;
    phone: string;
  };
  isMinor: boolean;
  phone?: string;
  createdAt: Date;
  status: "active" | "inactive";
  // Lecturer-specific fields
  hourlyRate?: number;
  creditHours?: number;
  coursesTaught?: string[];
  // Student-specific fields
  coursesEnrolled?: string[];
}

// Session attendance record (mapped from API)
export interface SessionAttendanceRecord {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  studentId?: string;
  department?: string;
  timestamp: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  confidence?: number;
  source?: string;
  status: "PRESENT" | "LATE" | "EXCUSED" | "ABSENT" | "CHECKED_IN";
}

// Expected attendee (from course enrollment)
export interface ExpectedAttendee {
  id: string;
  userId: string;
  name: string;
  email?: string;
  studentId?: string;
  department?: string;
}

export interface AttendanceSession {
  id: string;
  name: string;
  type: "class" | "exam" | "event" | "shift";
  attendanceType: "checkin" | "checkout";
  department?: string;
  startTime: Date;
  endTime: Date;
  status: "scheduled" | "active" | "completed";
  location?: string;
  expectedCount: number;
  presentCount: number;
  courseId?: string;
  courseCode?: string;
  courseName?: string;
  createdBy?: string;
  createdByRole?: Role;
  // Attendance records for the session
  attendances?: SessionAttendanceRecord[];
  // Expected attendees (from course enrollment)
  expectedAttendees?: ExpectedAttendee[];
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  sessionId: string;
  checkInTime: Date;
  checkOutTime?: Date;
  status: "present" | "late" | "absent";
  verificationMethod: "facial" | "qr" | "manual";
  confidence?: number;
}

export interface DashboardStats {
  totalMembers: number;
  activeSessions: number;
  todayAttendance: number;
  attendanceRate: number;
  lateArrivals: number;
  absentees: number;
}

export interface AttendanceAlert {
  id: string;
  type: "late" | "absent" | "pattern" | "checkin" | "checkout";
  memberId: string;
  memberName: string;
  message: string;
  timestamp: Date;
  severity: "low" | "medium" | "high";
  read: boolean;
}
