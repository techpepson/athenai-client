import { api, ApiResponse } from "@/apis/api";
import { UtilServices } from "./utils.services";

// ==================== Enums ====================

export enum NotificationStatus {
  READ = "READ",
  UNREAD = "UNREAD",
}

export enum Priority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

// ==================== Notification Types ====================

/**
 * User notification (from Logs table)
 */
export interface UserNotification {
  id: string;
  userId: string | null;
  action: string;
  priority: Priority;
  status: NotificationStatus;
  ipAddress: string | null;
  createdAt: string;
}

/**
 * System notification (from SystemLogs table)
 */
export interface SystemNotification {
  id: string;
  action: string;
  status: NotificationStatus;
  ipAddress: string | null;
  priority: Priority;
  createdAt: string;
}

// ==================== Response Types ====================

export interface GetUserNotificationsResponse {
  success: boolean;
  data: UserNotification[];
}

export interface GetSystemNotificationsResponse {
  success: boolean;
  data: SystemNotification[];
}

export interface DeleteNotificationResponse {
  success: boolean;
  message: string;
}

export interface MarkAsReadResponse {
  success: boolean;
  message?: string;
  data?: UserNotification;
}

export interface MarkAllAsReadResponse {
  success: boolean;
  message: string;
}

// ==================== Permission Request Types (Legacy/Future) ====================

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
   * Get notifications for the authenticated user
   * GET /notifications/user-notifications
   * Requires: Auth
   */
  async getUserNotifications(): Promise<ApiResponse<UserNotification[]>> {
    try {
      const token = await this.utilService.getTokenFromLocalStorage();
      const response = await api.get<GetUserNotificationsResponse>(
        `${this.basePath}/user-notifications`,
        token,
      );

      if (response.success && response.data) {
        return {
          ...response,
          data: response.data.data,
        };
      }

      return {
        data: null,
        error: response.error || "Failed to fetch notifications",
        status: response.status,
        success: false,
      };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch user notifications",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Delete a single notification belonging to the user
   * DELETE /notifications/user?notificationId=xxx
   * Requires: Auth
   */
  async deleteUserNotification(
    notificationId: string,
  ): Promise<ApiResponse<DeleteNotificationResponse>> {
    try {
      const token = await this.utilService.getTokenFromLocalStorage();
      const response = await api.delete<DeleteNotificationResponse>(
        `${this.basePath}/user?notificationId=${notificationId}`,
        token,
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete notification",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Mark a single notification as READ
   * PATCH /notifications/mark-as-read?notificationId=xxx
   * Requires: Auth
   */
  async markNotificationAsRead(
    notificationId: string,
  ): Promise<ApiResponse<MarkAsReadResponse>> {
    try {
      const token = await this.utilService.getTokenFromLocalStorage();
      const response = await api.patch<MarkAsReadResponse>(
        `${this.basePath}/mark-as-read?notificationId=${encodeURIComponent(notificationId)}`,
        {},
        token,
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to mark notification as read",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Mark ALL user notifications as READ
   * PATCH /notifications/mark-all-as-read
   * Requires: Auth
   */
  async markAllNotificationsAsRead(): Promise<
    ApiResponse<MarkAllAsReadResponse>
  > {
    try {
      const token = await this.utilService.getTokenFromLocalStorage();
      const response = await api.patch<MarkAllAsReadResponse>(
        `${this.basePath}/mark-all-as-read`,
        {},
        token,
      );
      return response;
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to mark all notifications as read",
        status: 0,
        success: false,
      };
    }
  }

  /**
   * Get system-wide notifications (admins only)
   * GET /notifications/system-notifications
   * Requires: Auth (SYSTEM_ADMIN, ADMIN)
   */
  async getSystemNotifications(): Promise<ApiResponse<SystemNotification[]>> {
    try {
      const token = await this.utilService.getTokenFromLocalStorage();
      const response = await api.get<GetSystemNotificationsResponse>(
        `${this.basePath}/system-notifications`,
        token,
      );

      if (response.success && response.data) {
        return {
          ...response,
          data: response.data.data,
        };
      }

      return {
        data: null,
        error: response.error || "Failed to fetch system notifications",
        status: response.status,
        success: false,
      };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch system notifications",
        status: 0,
        success: false,
      };
    }
  }

  // ==================== Permission Request Methods (Legacy/Future) ====================

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
