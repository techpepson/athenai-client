export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'staff' | 'lecturer' | 'class_rep' | 'student';
  department?: string;
  studentId?: string;
  photoUrl?: string;
  parentContact?: {
    name: string;
    email: string;
    phone: string;
  };
  isMinor: boolean;
  createdAt: Date;
  status: 'active' | 'inactive';
}

export interface AttendanceSession {
  id: string;
  name: string;
  type: 'class' | 'exam' | 'event' | 'shift';
  attendanceType: 'checkin' | 'checkout';
  department?: string;
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'active' | 'completed';
  location?: string;
  expectedCount: number;
  presentCount: number;
  courseId?: string;
  courseName?: string;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  sessionId: string;
  checkInTime: Date;
  checkOutTime?: Date;
  status: 'present' | 'late' | 'absent';
  verificationMethod: 'facial' | 'qr' | 'manual';
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
  type: 'late' | 'absent' | 'pattern' | 'checkin' | 'checkout';
  memberId: string;
  memberName: string;
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
  read: boolean;
}
