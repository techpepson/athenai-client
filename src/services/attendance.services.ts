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
  remarks?: string;
  latitude?: number;
  longitude?: number;
  distanceFromSession?: number;
  withinGeofence?: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    student?: {
      studentId?: string;
      matricNo?: string;
      level?: number;
    };
    lecturer?: {
      id: string;
      staffNo?: string;
    };
  };
  session?: {
    id: string;
    name: string;
    courseId?: string;
    moduleId?: string;
    subtopicId?: string;
    startTime?: string;
    endTime?: string;
    status?: string;
    mode?: string;
    week?: number;
    course?: {
      id: string;
      code: string;
      title: string;
    };
    module?: {
      id: string;
      name: string;
      code: string;
      level?: number;
    };
    subtopic?: {
      id: string;
      name: string;
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

// Manual attendance response type
export interface ManualAttendanceResponse {
  id: string;
  sessionId: string;
  userId: string;
  status: string;
  checkInTime?: string;
  checkOutTime?: string;
  remarks?: string;
  source: string;
}

// Bulk manual attendance response type
export interface BulkManualAttendanceResponse {
  results: {
    userId: string;
    success: boolean;
    attendance?: ManualAttendanceResponse;
  }[];
  errors: { userId: string; success: boolean; error: string }[];
  totalProcessed: number;
}

// Geofence attendance response type
export interface GeofenceAttendanceResponse {
  success: boolean;
  message: string;
  data: {
    attendance: ManualAttendanceResponse;
    minutesLate?: number;
    status: string;
  };
}

class AttendanceService {
  /**
   * Mark attendance using facial recognition
   */
  async markAttendance(
    sessionId: string,
    faceImage: File | Blob,
    source: "kiosk" | "mobile" = "kiosk",
    latitude?: number,
    longitude?: number,
  ): Promise<ApiResponse<MarkAttendanceResponse>> {
    const formData = new FormData();
    formData.append("face", faceImage, "face.jpg");

    let url = `/attendance/mark?sessionId=${encodeURIComponent(sessionId)}&source=${encodeURIComponent(source)}`;
    if (latitude != null) url += `&latitude=${latitude}`;
    if (longitude != null) url += `&longitude=${longitude}`;

    return api.upload<MarkAttendanceResponse>(url, formData);
  }

  /**
   * Mark manual attendance (REP/Admin action)
   */
  async markManualAttendance(
    sessionId: string,
    userId: string,
    status: string,
    remarks?: string,
    token?: string,
    startTime?: string,
    endTime?: string,
  ): Promise<ApiResponse<ManualAttendanceResponse>> {
    return api.post<ManualAttendanceResponse>(
      "/attendance/mark-manual",
      {
        sessionId,
        userId,
        status,
        remarks,
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
      },
      token,
    );
  }

  /**
   * Mark bulk manual attendance (REP/Admin action)
   */
  async markBulkManualAttendance(
    sessionId: string,
    attendanceRecords: {
      userId: string;
      status: string;
      remarks?: string;
    }[],
    token?: string,
  ): Promise<ApiResponse<BulkManualAttendanceResponse>> {
    return api.post<BulkManualAttendanceResponse>(
      "/attendance/mark-bulk-manual",
      { sessionId, attendanceRecords },
      token,
    );
  }

  /**
   * Mark attendance with geofence verification (mobile/app-based, user authenticated via JWT)
   */
  async markAttendanceWithGeofence(
    payload: {
      sessionId: string;
      latitude?: number;
      longitude?: number;
      confidence?: number;
      source?: string;
    },
    token?: string,
  ): Promise<ApiResponse<GeofenceAttendanceResponse>> {
    return api.post<GeofenceAttendanceResponse>(
      "/attendance/mark-geofence",
      payload,
      token,
    );
  }

  /**
   * Fetch all attendances (admin/rep/lecturer)
   */
  async getAllAttendancesAdmin(
    token?: string,
  ): Promise<ApiResponse<AttendanceRecord[]>> {
    return api.get<AttendanceRecord[]>("/attendance/all-attendances", token);
  }

  /**
   * Fetch attendance for the current user
   */
  async getUserAttendance(
    token?: string,
  ): Promise<ApiResponse<AttendanceRecord[]>> {
    return api.get<AttendanceRecord[]>("/attendance/user-attendance", token);
  }

  /**
   * Delete an attendance record
   */
  async deleteAttendance(
    attendanceId: string,
    token?: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return api.delete<{ message: string }>("/attendance/delete", token, {
      params: { attendanceId },
    });
  }
}

export const attendanceService = new AttendanceService();

// ── Standalone function exports ──

/**
 * Mark attendance using facial recognition (kiosk/mobile)
 */
export async function markAttendance(
  sessionId: string,
  faceImage: File | Blob,
  source: "kiosk" | "mobile" = "kiosk",
  latitude?: number,
  longitude?: number,
): Promise<ApiResponse<MarkAttendanceResponse>> {
  const formData = new FormData();
  formData.append("face", faceImage, "face.jpg");

  let url = `/attendance/mark?sessionId=${encodeURIComponent(sessionId)}&source=${encodeURIComponent(source)}`;
  if (latitude != null) url += `&latitude=${latitude}`;
  if (longitude != null) url += `&longitude=${longitude}`;

  return api.upload<MarkAttendanceResponse>(url, formData);
}

/**
 * Mark manual attendance (REP/Admin action)
 */
export async function markManualAttendance(
  sessionId: string,
  userId: string,
  status: string,
  remarks?: string,
  token?: string,
  startTime?: string,
  endTime?: string,
): Promise<ApiResponse<ManualAttendanceResponse>> {
  return api.post<ManualAttendanceResponse>(
    "/attendance/mark-manual",
    {
      sessionId,
      userId,
      status,
      remarks,
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
    },
    token,
  );
}

/**
 * Mark bulk manual attendance (REP/Admin action)
 */
export async function markBulkManualAttendance(
  sessionId: string,
  attendanceRecords: {
    userId: string;
    status: string;
    remarks?: string;
  }[],
  token?: string,
): Promise<ApiResponse<BulkManualAttendanceResponse>> {
  return api.post<BulkManualAttendanceResponse>(
    "/attendance/mark-bulk-manual",
    { sessionId, attendanceRecords },
    token,
  );
}

/**
 * Mark attendance with geofence verification
 */
export async function markAttendanceWithGeofence(
  payload: {
    sessionId: string;
    latitude?: number;
    longitude?: number;
    confidence?: number;
    source?: string;
  },
  token?: string,
): Promise<ApiResponse<GeofenceAttendanceResponse>> {
  return api.post<GeofenceAttendanceResponse>(
    "/attendance/mark-geofence",
    payload,
    token,
  );
}

/**
 * Fetch all attendances (admin/rep/lecturer)
 */
export async function getAllAttendancesAdmin(
  token: string,
): Promise<ApiResponse<AttendanceRecord[]>> {
  return api.get<AttendanceRecord[]>("/attendance/all-attendances", token);
}

/**
 * Fetch attendance for the current user
 */
export async function getUserAttendance(
  token: string,
): Promise<ApiResponse<AttendanceRecord[]>> {
  return api.get<AttendanceRecord[]>("/attendance/user-attendance", token);
}

/**
 * Delete an attendance record
 */
export async function deleteAttendance(
  attendanceId: string,
  token: string,
): Promise<ApiResponse<{ message: string }>> {
  return api.delete<{ message: string }>("/attendance/delete", token, {
    params: { attendanceId },
  });
}
