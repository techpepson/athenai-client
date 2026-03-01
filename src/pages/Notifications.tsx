import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Clock,
  UserX,
  CheckCircle2,
  Shield,
  UserPlus,
  UserMinus,
  X,
  Check,
  Loader2,
  Info,
  AlertCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/enums/enums";
import {
  notificationsService,
  PermissionRequest,
  UserNotification,
  SystemNotification,
  NotificationStatus,
  Priority,
} from "@/services/notifications.services";
import { EmptyState } from "@/components/ui/EmptyState";

const Notifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [systemNotifications, setSystemNotifications] = useState<
    SystemNotification[]
  >([]);
  const [activeTab, setActiveTab] = useState("all");
  const [permissionRequests, setPermissionRequests] = useState<
    PermissionRequest[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);

  const isSuperAdmin =
    user?.role === Role.SYSTEM_ADMIN || user?.role === Role.OWNER;
  const isAdmin =
    user?.role === Role.ADMIN ||
    user?.role === Role.SYSTEM_ADMIN ||
    user?.role === Role.OWNER;

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
    if (isSuperAdmin) {
      loadPermissionRequests();
    }
    if (isAdmin) {
      loadSystemNotifications();
    }
  }, [isSuperAdmin, isAdmin]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationsService.getUserNotifications();
      if (response.success && response.data) {
        setNotifications(response.data);
      } else {
        setNotifications([]);
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemNotifications = async () => {
    try {
      const response = await notificationsService.getSystemNotifications();
      if (response.success && response.data) {
        setSystemNotifications(response.data);
      } else {
        setSystemNotifications([]);
      }
    } catch {
      setSystemNotifications([]);
    }
  };

  const loadPermissionRequests = async () => {
    setLoadingRequests(true);
    try {
      const response =
        await notificationsService.getPermissionRequests("pending");
      if (response.success && response.data) {
        setPermissionRequests(response.data.requests || []);
      } else {
        setPermissionRequests([]);
      }
    } catch {
      setPermissionRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleRespondToRequest = async (
    requestId: string,
    approved: boolean,
  ) => {
    if (!user) return;

    const response = await notificationsService.respondToPermissionRequest(
      requestId,
      approved,
      user.id,
    );

    if (response.success) {
      loadPermissionRequests();
      toast({
        title: approved ? "Request Approved" : "Request Denied",
        description: approved
          ? "The admin has been granted the requested permission."
          : "The permission request has been denied.",
      });
    } else {
      toast({
        title: "Error",
        description: response.error || "Failed to respond to request",
        variant: "destructive",
      });
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    setDeletingId(notificationId);
    try {
      const response =
        await notificationsService.deleteUserNotification(notificationId);
      if (response.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        toast({
          title: "Notification deleted",
          description: "The notification has been removed.",
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to delete notification",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    setMarkingReadId(notificationId);
    try {
      const response =
        await notificationsService.markNotificationAsRead(notificationId);
      if (response.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, status: NotificationStatus.READ }
              : n,
          ),
        );
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to mark notification as read",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    } finally {
      setMarkingReadId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    try {
      const response = await notificationsService.markAllNotificationsAsRead();
      if (response.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, status: NotificationStatus.READ })),
        );
        toast({
          title: "All notifications marked as read",
          description: "Your notifications have been updated.",
        });
      } else {
        toast({
          title: "Error",
          description:
            response.error || "Failed to mark all notifications as read",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    } finally {
      setMarkingAllRead(false);
    }
  };

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === "all") return true;
    if (activeTab === "unread")
      return notification.status === NotificationStatus.UNREAD;
    if (activeTab === "high") return notification.priority === Priority.HIGH;
    if (activeTab === "critical")
      return notification.priority === Priority.CRITICAL;
    if (activeTab === "medium")
      return notification.priority === Priority.MEDIUM;
    return true;
  });

  // Get icon based on priority
  const getPriorityIcon = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL:
        return Zap;
      case Priority.HIGH:
        return AlertTriangle;
      case Priority.MEDIUM:
        return AlertCircle;
      case Priority.LOW:
      default:
        return Info;
    }
  };

  // Get colors based on priority
  const priorityColors: Record<Priority, string> = {
    [Priority.LOW]: "bg-muted text-muted-foreground",
    [Priority.MEDIUM]: "bg-warning/20 text-warning",
    [Priority.HIGH]: "bg-destructive/20 text-destructive",
    [Priority.CRITICAL]: "bg-destructive text-destructive-foreground",
  };

  const priorityBorderColors: Record<Priority, string> = {
    [Priority.LOW]:
      "text-muted-foreground bg-muted/10 border-muted-foreground/30",
    [Priority.MEDIUM]: "text-warning bg-warning/10 border-warning/30",
    [Priority.HIGH]: "text-destructive bg-destructive/10 border-destructive/30",
    [Priority.CRITICAL]:
      "text-destructive bg-destructive/20 border-destructive/50",
  };

  const unreadCount = notifications.filter(
    (n) => n.status === NotificationStatus.UNREAD,
  ).length;

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated on attendance alerts and activities
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || markingAllRead}
          >
            {markingAllRead ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4 mr-2" />
            )}
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Permission Requests Section - Only for Super Admin */}
      {isSuperAdmin && permissionRequests.length > 0 && (
        <div className="bg-card rounded-xl border border-primary/30 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Permission Requests
            </h2>
            <span className="px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs">
              {permissionRequests.length}
            </span>
          </div>
          <div className="space-y-3">
            {permissionRequests.map((request) => (
              <div
                key={request.id}
                className="p-4 rounded-lg border border-border bg-background flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      request.permissionType === "canAddAdmin"
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {request.permissionType === "canAddAdmin" ? (
                      <UserPlus className="w-4 h-4" />
                    ) : (
                      <UserMinus className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {request.requesterName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Requests permission to{" "}
                      {request.permissionType === "canAddAdmin"
                        ? "add new admins"
                        : "delete admins"}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {new Date(request.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRespondToRequest(request.id, false)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Deny
                  </Button>
                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={() => handleRespondToRequest(request.id, true)}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="all">
            All
            <span className="ml-2 px-2 py-0.5 bg-secondary rounded-full text-xs">
              {notifications.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="critical">Critical</TabsTrigger>
          <TabsTrigger value="high">High Priority</TabsTrigger>
          <TabsTrigger value="medium">Medium</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              const Icon = getPriorityIcon(notification.priority);
              const isUnread =
                notification.status === NotificationStatus.UNREAD;

              return (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 rounded-xl border transition-all duration-200",
                    isUnread
                      ? "bg-card border-primary/30"
                      : "bg-card/50 border-border",
                  )}
                  onClick={() => isUnread && handleMarkAsRead(notification.id)}
                  role={isUnread ? "button" : undefined}
                  style={{ cursor: isUnread ? "pointer" : "default" }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "p-3 rounded-xl border",
                        priorityBorderColors[notification.priority],
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground">
                          Notification
                        </p>
                        <span
                          className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded-full capitalize",
                            priorityColors[notification.priority],
                          )}
                        >
                          {notification.priority.toLowerCase()}
                        </span>
                        {isUnread && (
                          <span className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>
                      <p className="text-muted-foreground">
                        {notification.action}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isUnread && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          disabled={markingReadId === notification.id}
                        >
                          {markingReadId === notification.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                        disabled={deletingId === notification.id}
                      >
                        {deletingId === notification.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredNotifications.length === 0 && (
              <EmptyState type="notifications" title="No notifications" />
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* System Notifications Section - Only for Admins */}
      {user && isAdmin && systemNotifications.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              System Notifications
            </h2>
            <span className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full text-xs">
              {systemNotifications.length}
            </span>
          </div>
          <div className="space-y-3">
            {systemNotifications.map((notification) => {
              const Icon = getPriorityIcon(notification.priority);

              return (
                <div
                  key={notification.id}
                  className="p-4 rounded-xl border border-border bg-card/50"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "p-3 rounded-xl border",
                        priorityBorderColors[notification.priority],
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground">
                          System Alert
                        </p>
                        <span
                          className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded-full capitalize",
                            priorityColors[notification.priority],
                          )}
                        >
                          {notification.priority.toLowerCase()}
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        {notification.action}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
