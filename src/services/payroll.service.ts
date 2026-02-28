import { api, ApiResponse } from "@/apis/api";

// ==================== Payroll Types ====================

export interface SessionDetail {
  sessionId: string;
  sessionName: string;
  hours: number;
  date?: string; // present in period-based responses
}

export interface LecturerEarning {
  lecturerId: string;
  name: string;
  email: string;
  staffNo: string | null;
  hourlyRate: number;
  totalHours: number;
  grossEarnings: number;
  taxDeduction: number;
  taxRate: number;
  earnings: number; // net earnings after tax
  sessions?: SessionDetail[];
}

export interface PeriodInfo {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
}

/** Response from GET /payroll/lecturer-earnings/:year/:month */
export interface PeriodEarningsResponse {
  period: PeriodInfo;
  earnings: LecturerEarning[];
}

/** Response from GET /payroll/lecturer/:id/:year/:month or /my-payroll/:year/:month */
export interface PeriodPayrollResponse {
  period: PeriodInfo;
  payroll: LecturerEarning;
}

// ==================== Helpers ====================

/** Parse "YYYY-MM" → { year, month } or undefined for "all" */
function parseMonth(
  month?: string,
): { year: number; month: number } | undefined {
  if (!month || month === "all") return undefined;
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return undefined;
  return { year: y, month: m };
}

// ==================== Payroll Service ====================

class PayrollService {
  private basePath = "/payroll";

  /**
   * Get all lecturers' earnings.
   * If a month string (YYYY-MM) is provided, calls the period endpoint.
   * Otherwise returns all-time earnings.
   */
  async getLecturerEarnings(
    token: string,
    month?: string,
  ): Promise<ApiResponse<LecturerEarning[]>> {
    const period = parseMonth(month);
    if (period) {
      // GET /payroll/lecturer-earnings/:year/:month → { period, earnings }
      const res = await api.get<PeriodEarningsResponse>(
        `${this.basePath}/lecturer-earnings/${period.year}/${period.month}`,
        token,
      );
      // Unwrap: return just the earnings array
      return {
        ...res,
        data: res.data?.earnings ?? null,
      } as ApiResponse<LecturerEarning[]>;
    }
    // GET /payroll/lecturer-earnings → LecturerEarning[]
    return api.get<LecturerEarning[]>(
      `${this.basePath}/lecturer-earnings`,
      token,
    );
  }

  /**
   * Get individual lecturer's detailed payroll.
   * If a month string (YYYY-MM) is provided, calls the period endpoint.
   */
  async getLecturerPayroll(
    token: string,
    lecturerId: string,
    month?: string,
  ): Promise<ApiResponse<LecturerEarning>> {
    const period = parseMonth(month);
    if (period) {
      // GET /payroll/lecturer/:id/:year/:month → { period, payroll }
      const res = await api.get<PeriodPayrollResponse>(
        `${this.basePath}/lecturer/${lecturerId}/${period.year}/${period.month}`,
        token,
      );
      return {
        ...res,
        data: res.data?.payroll ?? null,
      } as ApiResponse<LecturerEarning>;
    }
    // GET /payroll/lecturer/:id → LecturerEarning
    return api.get<LecturerEarning>(
      `${this.basePath}/lecturer/${lecturerId}`,
      token,
    );
  }

  /**
   * Get the currently logged-in lecturer's own payroll.
   * If a month string (YYYY-MM) is provided, calls the period endpoint.
   */
  async getMyPayroll(
    token: string,
    month?: string,
  ): Promise<ApiResponse<LecturerEarning>> {
    const period = parseMonth(month);
    if (period) {
      // GET /payroll/my-payroll/:year/:month → { period, payroll }
      const res = await api.get<PeriodPayrollResponse>(
        `${this.basePath}/my-payroll/${period.year}/${period.month}`,
        token,
      );
      return {
        ...res,
        data: res.data?.payroll ?? null,
      } as ApiResponse<LecturerEarning>;
    }
    // GET /payroll/my-payroll → LecturerEarning
    return api.get<LecturerEarning>(`${this.basePath}/my-payroll`, token);
  }
}

export const payrollService = new PayrollService();

// Standalone function exports for convenience
export async function getLecturerEarnings(
  token: string,
  month?: string,
): Promise<ApiResponse<LecturerEarning[]>> {
  return payrollService.getLecturerEarnings(token, month);
}

export async function getLecturerPayroll(
  token: string,
  lecturerId: string,
  month?: string,
): Promise<ApiResponse<LecturerEarning>> {
  return payrollService.getLecturerPayroll(token, lecturerId, month);
}

export async function getMyPayroll(
  token: string,
  month?: string,
): Promise<ApiResponse<LecturerEarning>> {
  return payrollService.getMyPayroll(token, month);
}
