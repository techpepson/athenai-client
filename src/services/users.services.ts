import { api, ApiResponse } from "@/apis/api";
import {
  EnrollUserResponse,
  UsersDto,
  JobStatusResponse,
  UpdateUserResponse,
  UpdateRecordsResponse,
  RemoveUserResponse,
  GetAllUsersResponse,
  AssignRepResponse,
  RemoveRepResponse,
  CreateAdminPayload,
  CreateAdminResponse,
  FetchStudentsResponse,
  ThresholdsPayload,
  UpdateThresholdsResponse,
  GetUserResponse,
} from "@/interface/user.interface";
import { UtilServices } from "./utils.services";

// ==================== Users Service ====================

class UsersServices {
  private readonly basePath = "/users";

  utilService = new UtilServices();

  /**
   * Enroll a user (student, lecturer, or staff) with face image
   * POST /users/enroll
   * Requires: Auth (ADMIN, SYSTEM_ADMIN, STUDENT)
   */
  async enrollUser(
    payload: Partial<UsersDto>,
    faceImage: File,
  ): Promise<ApiResponse<EnrollUserResponse>> {
    try {
      const formData = new FormData();

      const token = await this.utilService.getTokenFromLocalStorage();

      // Append all payload fields to FormData
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((item) => formData.append(`${key}[]`, item));
          } else {
            formData.append(key, String(value));
          }
        }
      });

      // Append the face image
      formData.append("face", faceImage);

      const response = await api.upload<EnrollUserResponse>(
        `${this.basePath}/enroll`,
        formData,
        token,
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Enrollment failed",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Get job status for image processing
   * GET /users/job-status?jobId=xxx
   * Requires: Auth
   */
  async getJobStatus(jobId: string): Promise<ApiResponse<JobStatusResponse>> {
    try {
      const token = await this.utilService.getTokenFromLocalStorage();

      const response = await api.get<JobStatusResponse>(
        `${this.basePath}/job-status`,
        token,
        { params: { jobId } },
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Failed to get job status",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Update user details (name, phone, profile picture, etc.)
   * PATCH /users/update
   * Requires: Auth (all roles)
   */
  async updateUserDetails(
    payload: Partial<UsersDto>,
    profilePicture?: File,
  ): Promise<ApiResponse<UpdateUserResponse>> {
    try {
      const token = await this.utilService.getTokenFromLocalStorage();
      // If there's a profile picture, use FormData upload
      if (profilePicture) {
        const formData = new FormData();

        // Append all payload fields to FormData
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach((item) => formData.append(`${key}[]`, item));
            } else {
              formData.append(key, String(value));
            }
          }
        });

        // Append the profile picture
        formData.append("profilePicture", profilePicture);

        // Use custom fetch for PATCH with FormData
        const response = await this.uploadPatch<UpdateUserResponse>(
          `${this.basePath}/update`,
          formData,
          token,
        );
        return response;
      }

      // No file upload, use regular PATCH
      const response = await api.patch<UpdateUserResponse>(
        `${this.basePath}/update`,
        payload,
        token,
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update user details",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Helper method for PATCH requests with FormData (file uploads)
   */
  private async uploadPatch<T>(
    endpoint: string,
    formData: FormData,
    token: string,
  ): Promise<ApiResponse<T>> {
    try {
      const headers = new Headers();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const baseUrl =
        import.meta.env.VITE_ENVIRONMENT === "production"
          ? import.meta.env.VITE_API_PROD_URL || "https://api.comas.edu.gh/api"
          : import.meta.env.VITE_API_DEV_URL || "http://localhost:4000/api";

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "PATCH",
        headers,
        body: formData,
      });

      const status = response.status;
      const data = await response.json();

      if (!response.ok) {
        return {
          data: null,
          error:
            data.message ||
            data.error ||
            `Request failed with status ${status}`,
          status,
          success: false,
        };
      }

      return {
        data,
        error: null,
        status,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Upload request failed",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Update user records (student/lecturer/staff specific data)
   * PATCH /users/update-records
   * Requires: Auth (ADMIN, SYSTEM_ADMIN, STUDENT)
   */
  async updateRecords(
    payload: Partial<UsersDto>,
    token: string,
  ): Promise<ApiResponse<UpdateRecordsResponse>> {
    try {
      const response = await api.patch<UpdateRecordsResponse>(
        `${this.basePath}/update-records`,
        payload,
        token,
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Failed to update records",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Remove a user
   * DELETE /users/remove?email=xxx
   * Requires: Auth (ADMIN, SYSTEM_ADMIN)
   */
  async removeUser(email: string): Promise<ApiResponse<RemoveUserResponse>> {
    try {
      const token = await this.utilService.getTokenFromLocalStorage();
      const response = await api.delete<RemoveUserResponse>(
        `${this.basePath}/remove`,
        token,
        { params: { email } },
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Failed to remove user",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Get all users
   * GET /users/all
   * Requires: Auth
   */
  async getAllUsers(): Promise<ApiResponse<GetAllUsersResponse>> {
    try {
      const token = await this.utilService.getTokenFromLocalStorage();
      const response = await api.get<GetAllUsersResponse>(
        `${this.basePath}/all`,
        token,
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Failed to fetch users",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Assign a course representative
   * GET /users/assign-rep?courseId=xxx&studentId=xxx
   * Requires: Auth (ADMIN, SYSTEM_ADMIN, LECTURER)
   */
  async assignRep(
    courseId: string,
    studentId: string,
    token: string,
  ): Promise<ApiResponse<AssignRepResponse>> {
    try {
      const response = await api.get<AssignRepResponse>(
        `${this.basePath}/assign-rep`,
        token,
        { params: { courseId, studentId } },
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to assign course rep",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Remove a course representative
   * DELETE /users/remove/rep?courseId=xxx&studentId=xxx
   * Requires: Auth (ADMIN, SYSTEM_ADMIN, LECTURER)
   */
  async removeCourseRep(
    courseId: string,
    studentId: string,
    token: string,
  ): Promise<ApiResponse<RemoveRepResponse>> {
    try {
      const response = await api.delete<RemoveRepResponse>(
        `${this.basePath}/remove/rep`,
        token,
        { params: { courseId, studentId } },
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove course rep",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Create an admin user
   * POST /users/create-admin?secretCode=xxx
   * No auth required (uses secret code)
   */
  async createAdmin(
    payload: CreateAdminPayload,
    secretCode?: string,
  ): Promise<ApiResponse<CreateAdminResponse>> {
    try {
      const token = await this.utilService.getTokenFromLocalStorage();
      const params = secretCode ? { secretCode } : undefined;
      const response = await api.post<CreateAdminResponse>(
        `${this.basePath}/create-admin`,
        payload,
        token,
        params ? { params } : undefined,
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Failed to create admin",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Fetch all students
   * GET /users/fetch-students
   * Requires: Auth (ADMIN, SYSTEM_ADMIN, LECTURER, REP, STAFF, STUDENT)
   */
  async fetchStudents(
    token: string,
  ): Promise<ApiResponse<FetchStudentsResponse>> {
    try {
      const response = await api.get<FetchStudentsResponse>(
        `${this.basePath}/fetch-students`,
        token,
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Failed to fetch students",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Update attendance thresholds (for lecturers and reps)
   * POST /users/update-thresholds
   * Requires: Auth (LECTURER, REP)
   */
  async updateThresholds(
    thresholds: ThresholdsPayload,
    token: string,
  ): Promise<ApiResponse<UpdateThresholdsResponse>> {
    try {
      const response = await api.post<UpdateThresholdsResponse>(
        `${this.basePath}/update-thresholds`,
        thresholds,
        token,
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update thresholds",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Get current user by email (from token)
   * GET /users/by-email
   * Requires: Auth (all roles)
   */
  async getUserByEmail(token: string): Promise<ApiResponse<GetUserResponse>> {
    try {
      const response = await api.get<GetUserResponse>(
        `${this.basePath}/by-email`,
        token,
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Failed to get user",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Get current user by ID (from token)
   * GET /users/by-id
   * Requires: Auth (all roles)
   */
  async getUserById(token: string): Promise<ApiResponse<GetUserResponse>> {
    try {
      const response = await api.get<GetUserResponse>(
        `${this.basePath}/by-id`,
        token,
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Failed to get user",
        status: 0,
        success: false,
      };
    }
  }
}

// Export singleton instance
export const usersServices = new UsersServices();

// Export class for custom instantiation
export { UsersServices };
