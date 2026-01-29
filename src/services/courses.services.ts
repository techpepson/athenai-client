import { api, ApiResponse } from "@/apis/api";
import { UtilServices } from "./utils.services";

// ==================== Course Types ====================

export interface Lecturer {
  id: string;
  userId: string;
  staffNo?: string;
  hourlyRate: number;
  creditHours: number;
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

export interface AddCoursePayload {
  courseCode: string;
  title: string;
  description: string;
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

export interface GetDepartmentsResponse {
  departments: Department[];
}

export interface AddDepartmentResponse {
  department: Department;
  message: string;
}

// ==================== Local Storage Keys ====================
const DEPARTMENTS_KEY = "app_departments";

// ==================== Default Data ====================
const DEFAULT_DEPARTMENTS: Department[] = [
  { label: "Computer Science", value: "cs" },
  { label: "Engineering", value: "eng" },
  { label: "Business", value: "bus" },
  { label: "Medicine", value: "med" },
  { label: "Arts & Humanities", value: "arts" },
  { label: "Science", value: "sci" },
];

// ==================== Courses Service ====================

class CoursesService {
  private readonly basePath = "/courses";
  private utilService = new UtilServices();

  /**
   * Get all departments (from localStorage for now, will use API later)
   */
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

  /**
   * Add a new department (localStorage for now)
   */
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

  // ==================== API Methods ====================

  /**
   * Fetch all courses from API
   * GET /courses/all
   * Requires: Auth (ADMIN, SYSTEM_ADMIN, LECTURER, STUDENT)
   */
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

  /**
   * Get courses for the current student
   * GET /courses/student-courses
   * Requires: Auth (ADMIN, SYSTEM_ADMIN, LECTURER, STUDENT, REP)
   */
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

  // ==================== Legacy Methods (for backward compatibility) ====================

  /**
   * Get courses synchronously (returns empty array, use getAllCourses() instead)
   * @deprecated Use getAllCourses() instead
   */
  getCourses(): Course[] {
    // Return empty array - components should use async getAllCourses()
    return [];
  }
}

// Export singleton instance
export const coursesService = new CoursesService();

// Export class for custom instantiation
export { CoursesService };
