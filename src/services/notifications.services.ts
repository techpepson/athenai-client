import { api, ApiResponse } from "@/apis/api";
import { UtilServices } from "./utils.services";

// ==================== Permission Request Types ====================

export interface PermissionRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  permissionType: "canAddAdmin" | "canDeleteAdmin";
  status: "pending" | "approved" | "denied";
  createdAt: Date;
  respondedAt?: Date;
  respondedBy?: string;
}

export interface GetPermissionRequestsResponse {
  requests: PermissionRequest[];
}

export interface RespondToPermissionRequestResponse {
  success: boolean;
  message: string;
}

// ==================== Notifications Service ====================

class NotificationsService {
  private readonly basePath = "/notifications";
  private utilService = new UtilServices();

  /**
   * Get permission requests (for super admin)
   * GET /notifications/permission-requests?status=xxx
   * Requires: Auth (SYSTEM_ADMIN, OWNER)
   */
  async getPermissionRequests(
    status?: "pending" | "approved" | "denied",
  ): Promise<ApiResponse<GetPermissionRequestsResponse>> {
    try {
      const token = await this.utilService.getTokenFromLocalStorage();
      const params = status ? { status } : undefined;
      const response = await api.get<GetPermissionRequestsResponse>(
        `${this.basePath}/permission-requests`,
        token,
        params ? { params } : undefined,
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch permission requests",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Respond to a permission request (approve/deny)
   * POST /notifications/permission-requests/:id/respond
   * Requires: Auth (SYSTEM_ADMIN, OWNER)
   */
  async respondToPermissionRequest(
    requestId: string,
    approved: boolean,
    responderId: string,
  ): Promise<ApiResponse<RespondToPermissionRequestResponse>> {
    try {
      const token = await this.utilService.getTokenFromLocalStorage();
      const response = await api.post<RespondToPermissionRequestResponse>(
        `${this.basePath}/permission-requests/${requestId}/respond`,
        { approved, responderId },
        token,
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to respond to permission request",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Request a permission (for admins)
   * POST /notifications/permission-requests
   * Requires: Auth (ADMIN)
   */
  async requestPermission(
    permissionType: "canAddAdmin" | "canDeleteAdmin",
  ): Promise<ApiResponse<{ requestId: string }>> {
    try {
      const token = await this.utilService.getTokenFromLocalStorage();
      const response = await api.post<{ requestId: string }>(
        `${this.basePath}/permission-requests`,
        { permissionType },
        token,
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit permission request",
        status: 0,
        success: false,
      };
    }
  }
}

// Export singleton instance
export const notificationsService = new NotificationsService();

// Export class for custom instantiation
export { NotificationsService };
