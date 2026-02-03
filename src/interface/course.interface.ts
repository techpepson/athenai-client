import { ILecturer, IStudent } from "./user.interface";
// Enums for Session (re-export from enums if needed)
import { SessionMode, SessionStatus, SessionType } from "@/enums/enums";

// Course interface matching Prisma schema
export interface ICourse {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  creditHours?: number | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations (optional for flexibility)
  enrollments?: ICourseEnrollment[];
  lecturers?: ICourseLecturer[];
  reps?: ICourseRep[];
  sessions?: ISession[];
}

// Course Enrollment interface
export interface ICourseEnrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt: Date;

  // Relations
  student?: IStudent;
  course?: ICourse;
}

// Course Lecturer (many-to-many relationship)
export interface ICourseLecturer {
  id: string;
  lecturerId: string;
  courseId: string;
  assignedAt: Date;

  // Relations
  lecturer?: ILecturer;
  course?: ICourse;
}

// Course Rep interface
export interface ICourseRep {
  id: string;
  studentId: string;
  courseId: string;

  // Relations
  student?: IStudent;
  course?: ICourse;
  thresholds?: IThresholds;
}

// Thresholds interface
export interface IThresholds {
  id: string;
  lateThreshold: number; // in minutes
  absentThreshold: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
  lecturerId?: string | null;
  courseRepId?: string | null;

  // Relations
  lecturer?: ILecturer;
  courseRep?: ICourseRep;
}

// Session interface (imported from session types if needed)
export interface ISession {
  id: string;
  userId: string;
  location?: string | null;
  name: string;
  token: string;
  lecturerId?: string | null;
  courseId?: string | null;
  startTime: Date;
  endTime: Date;
  mode: SessionMode;
  type: SessionType;
  lateThreshold: number;
  absentThreshold: number;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  lecturer?: ILecturer;
  course?: ICourse;
}

// Course creation input
export interface ICreateCourseInput {
  code: string;
  title: string;
  description?: string;
  creditHours?: number;
}

// Course update input
export interface IUpdateCourseInput {
  code?: string;
  title?: string;
  description?: string;
  creditHours?: number;
}

// Course enrollment input
export interface ICreateCourseEnrollmentInput {
  studentId: string;
  courseId: string;
}

// Course lecturer assignment input
export interface IAssignCourseLecturerInput {
  lecturerId: string;
  courseId: string;
}

// Course rep assignment input
export interface IAssignCourseRepInput {
  studentId: string;
  courseId: string;
}

// Thresholds input
export interface ICreateThresholdsInput {
  lateThreshold?: number;
  absentThreshold?: number;
  lecturerId?: string;
  courseRepId?: string;
}

// Course with full relations (for detailed views)
export interface ICourseWithRelations extends ICourse {
  enrollments: ICourseEnrollment[];
  lecturers: ICourseLecturer[];
  reps: ICourseRep[];
  sessions: ISession[];
}

// Course public (for client-side lists)
export interface ICoursePublic {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  creditHours?: number | null;
  createdAt: Date;
  updatedAt: Date;
}
