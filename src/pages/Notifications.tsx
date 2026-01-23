import { useState, useEffect } from "react";
import { mockAlerts } from "@/data/mockData";
import { AttendanceAlert } from "@/types/attendance";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  useAuth,
  getPermissionRequests,
  respondToPermissionRequest,
  PermissionRequest,
} from "@/contexts/AuthContext";

const Notifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState(mockAlerts);
  const [activeTab, setActiveTab] = useState("all");
  const [permissionRequests, setPermissionRequests] = useState<
    PermissionRequest[]
  >([]);

  const isSuperAdmin = user?.role === "super_admin";

  useEffect(() => {
    if (isSuperAdmin) {
      loadPermissionRequests();
    }
  }, [isSuperAdmin]);

  const loadPermissionRequests = () => {
    setPermissionRequests(getPermissionRequests("pending"));
  };

  const handleRespondToRequest = (requestId: string, approved: boolean) => {
    if (!user) return;

    const result = respondToPermissionRequest(requestId, approved, user.id);

    if (result.success) {
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
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !alert.read;
    return alert.severity === activeTab;
  });

  const markAllRead = () => {
    setAlerts(alerts.map((a) => ({ ...a, read: true })));
  };

  const icons = {
    late: Clock,
    absent: UserX,
    pattern: AlertTriangle,
    checkin: CheckCircle2,
    checkout: Bell,
  };

  const severityColors = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-warning/20 text-warning",
    high: "bg-destructive/20 text-destructive",
  };

  const typeColors = {
    late: "text-warning bg-warning/10 border-warning/30",
    absent: "text-destructive bg-destructive/10 border-destructive/30",
    pattern: "text-warning bg-warning/10 border-warning/30",
    checkin: "text-success bg-success/10 border-success/30",
    checkout: "text-primary bg-primary/10 border-primary/30",
  };

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated on attendance alerts and activities
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
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
              {alerts.length}
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
          <TabsTrigger value="high">High Priority</TabsTrigger>
          <TabsTrigger value="medium">Medium</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const Icon = icons[alert.type];
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "p-4 rounded-xl border transition-all duration-200",
                    !alert.read
                      ? "bg-card border-primary/30"
                      : "bg-card/50 border-border",
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "p-3 rounded-xl border",
                        typeColors[alert.type],
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground">
                          {alert.memberName}
                        </p>
                        <span
                          className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded-full",
                            severityColors[alert.severity],
                          )}
                        >
                          {alert.severity}
                        </span>
                        {!alert.read && (
                          <span className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>
                      <p className="text-muted-foreground">{alert.message}</p>
                      <p className="text-xs text-muted-foreground/60 mt-2">
                        {alert.timestamp.toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {filteredAlerts.length === 0 && (
              <div className="text-center py-12 bg-card rounded-xl border border-border">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No notifications to show
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Notifications;
