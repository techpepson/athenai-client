export interface AdminPrivileges {
  canAddAdmin: boolean;
  canDeleteAdmin: boolean;
}

export interface AdminPrivileges {
  canAddAdmin: boolean;
  canDeleteAdmin: boolean;
}

export type PermissionRequestType = "canAddAdmin" | "canDeleteAdmin";
export type PermissionRequestStatus = "pending" | "approved" | "denied";

export interface PermissionRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  permissionType: PermissionRequestType;
  status: PermissionRequestStatus;
  createdAt: string;
  respondedAt?: string;
  respondedBy?: string;
}
