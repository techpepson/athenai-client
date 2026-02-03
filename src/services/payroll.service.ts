import { api, ApiResponse } from "@/apis/api";

// ==================== Payroll Types ====================

export interface LecturerEarning {
  lecturerId: string;
  name: string;
  email: string;
  staffNo: string | null;
  hourlyRate: number;
  totalHours: number;
  earnings: number;
}

export interface GetLecturerEarningsResponse {
  result: LecturerEarning[];
}

// ==================== Payroll Service ====================

class PayrollService {
  private basePath = "/payroll";

  /**
   * Get all lecturers' earnings (Admin only)
   * @param token JWT token for authentication
   * @returns ApiResponse with lecturer earnings
   */
  async getLecturerEarnings(
    token: string,
  ): Promise<ApiResponse<GetLecturerEarningsResponse>> {
    return api.get<GetLecturerEarningsResponse>(
      `${this.basePath}/lecturer-earnings`,
      token,
    );
  }
}

export const payrollService = new PayrollService();

// Standalone function exports for convenience
export async function getLecturerEarnings(
  token: string,
): Promise<ApiResponse<GetLecturerEarningsResponse>> {
  return payrollService.getLecturerEarnings(token);
}
