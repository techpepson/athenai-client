import { api, ApiResponse } from "@/apis/api";
import { UtilServices } from "./utils.services";

// ==================== Course Types ====================

export interface LecturerUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  profilePicture?: string;
  imageUrl?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface Lecturer {
  id: string;
  userId: string;
  staffNo?: string;
  hourlyRate?: number;
  creditHours?: number;
  user?: LecturerUser;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  description: string;
  lecturers?: Lecturer[];
  enrollments?: unknown[];
  reps?: unknown[];
  sessions?: unknown[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Department {
  label: string;
  value: string;
}

export interface GetCoursesResponse {
  success: boolean;
  data: Course[];
}

export interface GetStudentCoursesResponse {
  success: boolean;
  data: Course[];
}

export interface GetLecturerCoursesResponse {
  success: boolean;
  data: Course[];
}

export interface AddCoursePayload {
  courseCode: string;
  title: string;
  description: string;
  creditHours?: number;
  lecturerId?: string;
}

export interface AddCourseResponse {
  success: boolean;
  data: Course;
}

export interface UpdateCoursePayload {
  courseCode?: string;
  title?: string;
  description?: string;
  creditHours?: number;
  lecturerId?: string;
}

export interface UpdateCourseResponse {
  success: boolean;
  data: Course;
}

export interface RemoveCourseResponse {
  success: boolean;
  message: string;
}

export interface RemoveStudentCourseResponse {
  message: string;
}

export interface RemoveLecturerCourseResponse {
  message: string;
}

export interface GetDepartmentsResponse {
  departments: Department[];
}

export interface AddDepartmentResponse {
  department: Department;
  message: string;
}

const DEPARTMENTS_KEY = "app_departments";

const DEFAULT_DEPARTMENTS: Department[] = [
  { label: "Computer Science", value: "cs" },
  { label: "Engineering", value: "eng" },
  { label: "Business", value: "bus" },
  { label: "Medicine", value: "med" },
  { label: "Arts & Humanities", value: "arts" },
  { label: "Science", value: "sci" },
];

class CoursesService {
  private readonly basePath = "/courses";
  private utilService = new UtilServices();

  getDepartments(): Department[] {
    try {
      const stored = localStorage.getItem(DEPARTMENTS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      // Initialize with defaults
      localStorage.setItem(
        DEPARTMENTS_KEY,
        JSON.stringify(DEFAULT_DEPARTMENTS),
      );
      return DEFAULT_DEPARTMENTS;
    } catch {
      return DEFAULT_DEPARTMENTS;
    }
  }

  addDepartment(label: string, value: string): boolean {
    try {
      const departments = this.getDepartments();
      // Check if already exists
      if (departments.some((d) => d.value === value)) {
        return false;
      }
      departments.push({ label, value });
      localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(departments));
      return true;
    } catch {
      return false;
    }
  }

  async getAllCourses(): Promise<ApiResponse<GetCoursesResponse>> {
    try {
      const token = await this.utilService.getTokenFromLocalStorage();
      const response = await api.get<GetCoursesResponse>(
        `${this.basePath}/all`,
        token,
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Failed to fetch courses",
        status: 0,
        success: false,
      };
    }
  }

  async getStudentCourses(): Promise<ApiResponse<GetStudentCoursesResponse>> {
    try {
      const token = await this.utilService.getTokenFromLocalStorage();
      const response = await api.get<GetStudentCoursesResponse>(
        `${this.basePath}/student-courses`,
        token,
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch student courses",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Get courses taught by the current lecturer
   * GET /courses/lecturer-courses
   * Requires: Auth (ADMIN, SYSTEM_ADMIN, LECTURER)
   */
  async getLecturerCourses(): Promise<ApiResponse<GetLecturerCoursesResponse>> {
    try {
      const token = await this.utilService.getTokenFromLocalStorage();
      const response = await api.get<GetLecturerCoursesResponse>(
        `${this.basePath}/lecturer-courses`,
        token,
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch lecturer courses",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Add a new course
   * POST /courses/add
   * Requires: Auth (ADMIN, SYSTEM_ADMIN)
   */
  async addCourse(
    payload: AddCoursePayload,
  ): Promise<ApiResponse<AddCourseResponse>> {
    try {
      const token = await this.utilService.getTokenFromLocalStorage();
      const response = await api.post<AddCourseResponse>(
        `${this.basePath}/add`,
        payload,
        token,
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Failed to add course",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Update a course
   * PATCH /courses/update?courseId=xxx
   * Requires: Auth (ADMIN, SYSTEM_ADMIN)
   */
  async updateCourse(
    courseId: string,
    payload: UpdateCoursePayload,
  ): Promise<ApiResponse<UpdateCourseResponse>> {
    try {
      const token = await this.utilService.getTokenFromLocalStorage();
      const response = await api.patch<UpdateCourseResponse>(
        `${this.basePath}/update`,
        payload,
        token,
        { params: { courseId } },
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Failed to update course",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Remove a course
   * GET /courses/remove?courseId=xxx
   * Requires: Auth (ADMIN, SYSTEM_ADMIN)
   */
  async removeCourse(
    courseId: string,
  ): Promise<ApiResponse<RemoveCourseResponse>> {
    try {
      const token = await this.utilService.getTokenFromLocalStorage();
      const response = await api.get<RemoveCourseResponse>(
        `${this.basePath}/remove`,
        token,
        { params: { courseId } },
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Failed to remove course",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Remove a student from a course
   * GET /courses/remove-student-course?courseId=xxx&studentId=xxx
   * Requires: Auth (ADMIN, SYSTEM_ADMIN)
   */
  async removeStudentFromCourse(
    courseId: string,
    studentId: string,
  ): Promise<ApiResponse<RemoveStudentCourseResponse>> {
    try {
      const token = await this.utilService.getTokenFromLocalStorage();
      const response = await api.get<RemoveStudentCourseResponse>(
        `${this.basePath}/remove-student-course`,
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
            : "Failed to remove student from course",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Remove a lecturer from a course
   * GET /courses/remove-lecturer-course?courseId=xxx&lecturerId=xxx
   * Requires: Auth (ADMIN, SYSTEM_ADMIN, LECTURER)
   */
  async removeLecturerFromCourse(
    courseId: string,
    lecturerId: string,
  ): Promise<ApiResponse<RemoveLecturerCourseResponse>> {
    try {
      const token = await this.utilService.getTokenFromLocalStorage();
      const response = await api.get<RemoveLecturerCourseResponse>(
        `${this.basePath}/remove-lecturer-course`,
        token,
        { params: { courseId, lecturerId } },
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove lecturer from course",
        status: 0,
        success: false,
      };
    }
  }
}

// Export singleton instance
export const coursesService = new CoursesService();

// Export class for custom instantiation
export { CoursesService };
