import { AccountStatus, ImageStatus, Role } from "@/enums/enums";
import { IThresholds } from "./course.interface";

// Related interfaces
export interface IStudent {
  id: string;
  userId: string;
  matricNo?: string | null;
  studentId: string;
  level?: number; // 100, 200, 300, 400, 500, 600
  createdAt: Date;
  updatedAt: Date;
}

export interface ILecturer {
  id: string;
  userId: string;
  staffNo?: string | null;
  recipientCode?: string | null;
  hourlyRate: number;
  creditHours: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStaff {
  id: string;
  userId: string;
  staffNo: string;
  recipientCode?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAdmin {
  id: string;
  userId: string;
  adminNo: string;
  createdAt: Date;
  updatedAt: Date;
}

// Main User interface
export interface IUser {
  id: string;
  email: string;
  name: string;
  passwordResetCode?: string | null;
  resetCodeCreatedAt?: Date | null;
  lastLoginAt?: Date | null;
  lastLoginIp?: string | null;
  embeddingStatus: ImageStatus;
  ipAddress?: string | null;
  loginRetries?: number | null;
  accountStatus: AccountStatus;
  phone: string;
  verificationCodeAttempts?: number | null;
  accountLockedUntil?: Date | null;
  emailVerificationRetries?: number | null;
  phoneVerificationRetries?: number | null;
  emailVerificationCode?: string | null;
  phoneVerificationCode?: string | null;
  emailCodeCreatedAt?: Date | null;
  phoneCodeCreatedAt?: Date | null;
  role: Role;
  isPasswordChanged: boolean;
  password: string;
  isActive: boolean;
  profilePicture?: string | null;
  createdAt: Date;
  updatedAt: Date;
  imageUrl?: string | null;
  imageStatus?: ImageStatus | null;
  faceEmbedding?: string | null;

  // Relations (optional for flexibility)
  student?: IStudent | null;
  lecturer?: ILecturer | null;
  staff?: IStaff | null;
  admin?: IAdmin | null;
}

// User without sensitive fields (for client-side use)
export interface IUserPublic {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: Role;
  accountStatus: AccountStatus;
  isActive: boolean;
  profilePicture?: string | null;
  imageUrl?: string | null;
  imageStatus?: ImageStatus | null;
  embeddingStatus: ImageStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;

  // Relations
  student?: IStudent | null;
  lecturer?: ILecturer | null;
  staff?: IStaff | null;
  admin?: IAdmin | null;
}

// User creation input
export interface ICreateUserInput {
  email: string;
  name: string;
  phone: string;
  password: string;
  role: Role;
  profilePicture?: string;
  imageUrl?: string;
}

// User update input
export interface IUpdateUserInput {
  email?: string;
  name?: string;
  phone?: string;
  profilePicture?: string;
  imageUrl?: string;
  accountStatus?: AccountStatus;
  isActive?: boolean;
  role?: Role;
}

export interface UsersDto {
  role: Role;
  name?: string; // Backend expects 'name' for updateUserDetails
  fullName?: string; // Used for enrollment
  profilePicture?: string;
  lecturerHourlyRate?: number;
  lecturerCreditHours?: number;
  email: string;
  phone: string;
  password?: string;
  studentId?: string;
  staffId?: string;
  lecturerId?: string;
  courses?: string[];
  programOfStudy?: string;
  level?: string;
  status?: string; // For account status updates
}

export interface CreateAdminPayload {
  email: string;
  name: string;
  phone: string;
}

export interface ThresholdsPayload {
  lateThreshold: number;
  absentThreshold: number;
}

// ==================== Response Interfaces ====================

export interface EnrollUserResponse {
  message: string;
  student?: IStudent;
  lecturer?: ILecturer;
  staff?: IStaff;
  tempPassword?: string;
  jobId?: string;
  image?: string;
}

export interface JobStatusResponse {
  state: string;
  status: unknown;
}

export interface UpdateUserResponse {
  message: string;
}

export interface UpdateRecordsResponse {
  message: string;
  student?: IStudent;
  lecturer?: ILecturer;
  staff?: IStaff;
}

export interface RemoveUserResponse {
  message: string;
}

export interface GetAllUsersResponse {
  users: (IUser & {
    student?: IStudent | null;
    lecturer?: ILecturer | null;
    staff?: IStaff | null;
  })[];
}

export interface AssignRepResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    studentId: string;
    courseId: string;
  };
}

export interface RemoveRepResponse {
  success: boolean;
  message: string;
}

export interface CreateAdminResponse {
  message: string;
  data: {
    user: Partial<IUserPublic>;
    admin: {
      id: string;
      adminNo: string;
    };
    tempPassword: string;
  };
}

export interface FetchStudentsResponse {
  students: (IStudent & {
    user: {
      id: string;
      email: string;
      name: string;
    };
  })[];
}

export interface FetchCourseRepsResponse {
  reps: Array<{
    id: string;
    studentId: string;
    courseId: string;
    assignedAt: Date;
    student: IStudent & {
      user: {
        id: string;
        email: string;
        name: string;
      };
    };
    course: {
      id: string;
      title: string;
      code: string;
    };
  }>;
}

export interface UpdateThresholdsResponse {
  message: string;
  thresholds: IThresholds;
}

export interface GetUserResponse {
  user: IUser & {
    student?: IStudent | null;
    lecturer?: ILecturer | null;
    staff?: IStaff | null;
  };
}
