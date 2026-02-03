import { api, ApiResponse } from "@/apis/api";

// Types for attendance data
export interface AttendanceRecord {
  id: string;
  userId: string;
  sessionId: string;
  status: string;
  checkInTime?: string;
  checkOutTime?: string;
  timestamp?: string;
  confidence?: number;
  source?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  session?: {
    id: string;
    name: string;
    courseId?: string;
    startTime?: string;
    endTime?: string;
    course?: {
      id: string;
      code: string;
      title: string;
    };
    createdBy?: {
      id: string;
      email: string;
      name: string;
    };
  };
}

// Mark attendance response type
export interface MarkAttendanceResponse {
  attendance: {
    id: string;
    sessionId: string;
    userId: string;
    status: string;
    checkInTime?: string;
    checkOutTime?: string;
    confidence?: number;
    source?: string;
  };
  score?: number;
}

class AttendanceService {
  /**
   * Mark attendance using facial recognition
   * @param sessionId - The session ID
   * @param faceImage - The captured face image as a File or Blob
   * @param source - The source of attendance ('kiosk' or 'mobile')
   * @returns ApiResponse with attendance record and recognition score
   */
  async markAttendance(
    sessionId: string,
    faceImage: File | Blob,
    source: "kiosk" | "mobile" = "kiosk",
  ): Promise<ApiResponse<MarkAttendanceResponse>> {
    const formData = new FormData();
    formData.append("face", faceImage, "face.jpg");

    return api.upload<MarkAttendanceResponse>(
      `/attendance/mark?sessionId=${encodeURIComponent(sessionId)}&source=${encodeURIComponent(source)}`,
      formData,
    );
  }

  /**
   * Fetch all attendances as admin
   * @returns ApiResponse with attendances array
   */
  async getAllAttendancesAdmin(): Promise<ApiResponse<AttendanceRecord[]>> {
    return api.get<AttendanceRecord[]>("/attendance/all-attendances");
  }

  /**
   * Fetch attendance for the current user
   * @returns ApiResponse with user's attendance records
   */
  async getUserAttendance(): Promise<ApiResponse<AttendanceRecord[]>> {
    return api.get<AttendanceRecord[]>("/attendance/user-attendance");
  }

  /**
   * Delete an attendance record
   * @param attendanceId - The attendance record ID to delete
   * @returns ApiResponse with success message
   */
  async deleteAttendance(
    attendanceId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return api.delete<{ message: string }>("/attendance/delete", undefined, {
      params: { attendanceId },
    });
  }
}

export const attendanceService = new AttendanceService();

// Standalone function exports for backward compatibility
/**
 * Mark attendance using facial recognition
 * @param sessionId - The session ID
 * @param faceImage - The captured face image as a File or Blob
 * @param source - The source of attendance ('kiosk' or 'mobile')
 * @returns ApiResponse with attendance record and recognition score
 */
export async function markAttendance(
  sessionId: string,
  faceImage: File | Blob,
  source: "kiosk" | "mobile" = "kiosk",
): Promise<ApiResponse<MarkAttendanceResponse>> {
  const formData = new FormData();
  formData.append("face", faceImage, "face.jpg");

  return api.upload<MarkAttendanceResponse>(
    `/attendance/mark?sessionId=${encodeURIComponent(sessionId)}&source=${encodeURIComponent(source)}`,
    formData,
  );
}

/**
 * Fetch all attendances as admin (requires admin token)
 * @param token JWT token for authentication
 * @returns ApiResponse<AttendanceRecord[]>
 */
export async function getAllAttendancesAdmin(
  token: string,
): Promise<ApiResponse<AttendanceRecord[]>> {
  return api.get<AttendanceRecord[]>("/attendance/all-attendances", token);
}

/**
 * Fetch attendance for the current user
 * @param token JWT token for authentication
 * @returns ApiResponse<AttendanceRecord[]>
 */
export async function getUserAttendance(
  token: string,
): Promise<ApiResponse<AttendanceRecord[]>> {
  return api.get<AttendanceRecord[]>("/attendance/user-attendance", token);
}

/**
 * Delete an attendance record
 * @param attendanceId - The attendance record ID to delete
 * @param token JWT token for authentication
 * @returns ApiResponse with success message
 */
export async function deleteAttendance(
  attendanceId: string,
  token: string,
): Promise<ApiResponse<{ message: string }>> {
  return api.delete<{ message: string }>("/attendance/delete", token, {
    params: { attendanceId },
  });
}
