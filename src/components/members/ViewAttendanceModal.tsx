import { Member } from "@/types/attendance";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Loader2,
  LogIn,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";
import {
  getAllAttendancesAdmin,
  AttendanceRecord as ApiAttendanceRecord,
} from "@/services/attendance.services";
import { useAuth } from "@/contexts/AuthContext";
// Attendance record type for this component
interface AttendanceRecord {
  id: string;
  sessionId: string;
  sessionName: string;
  sessionType: string;
  location?: string;
  checkInTime: Date;
  status: "present" | "late" | "absent" | "checked_in";
}

interface ViewAttendanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
}

// Map API status to component status
const mapApiStatus = (
  status: string,
): "present" | "late" | "absent" | "checked_in" => {
  const statusLower = status.toLowerCase();
  if (statusLower === "present") return "present";
  if (statusLower === "checked_in") return "checked_in";
  if (statusLower === "late") return "late";
  return "absent";
};

export const ViewAttendanceModal = ({
  open,
  onOpenChange,
  member,
}: ViewAttendanceModalProps) => {
  const [attendanceHistory, setAttendanceHistory] = useState<
    AttendanceRecord[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!member || !open || !token) return;

      setIsLoading(true);
      try {
        const response = await getAllAttendancesAdmin(token);
        if (response.success && response.data) {
          // Filter attendance records for this specific member
          const memberAttendance = response.data
            .filter(
              (record: ApiAttendanceRecord) => record.userId === member.id,
            )
            .map(
              (record: ApiAttendanceRecord): AttendanceRecord => ({
                id: record.id,
                sessionId: record.sessionId,
                sessionName:
                  record.session?.name ||
                  record.session?.course?.title ||
                  "Session",
                sessionType: record.session?.course?.code || "General",
                checkInTime: new Date(
                  record.checkInTime || record.timestamp || new Date(),
                ),
                status: mapApiStatus(record.status),
                location: record.session?.course?.code,
              }),
            );

          // Sort by date descending (most recent first)
          memberAttendance.sort(
            (a, b) => b.checkInTime.getTime() - a.checkInTime.getTime(),
          );
          setAttendanceHistory(memberAttendance);
        }
      } catch (error) {
        console.error("Error fetching attendance:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendance();
  }, [member, open, token]);

  if (!member) return null;

  const statusConfig = {
    present: {
      icon: CheckCircle,
      color: "text-success",
      bg: "bg-success/20",
      label: "Present",
    },
    checked_in: {
      icon: LogIn,
      color: "text-blue-500",
      bg: "bg-blue-500/20",
      label: "Checked In (Needs Checkout)",
    },
    late: {
      icon: AlertCircle,
      color: "text-warning",
      bg: "bg-warning/20",
      label: "Late",
    },
    absent: {
      icon: XCircle,
      color: "text-destructive",
      bg: "bg-destructive/20",
      label: "Absent",
    },
  };

  // Calculate attendance stats - CHECKED_IN is counted separately
  const stats = {
    total: attendanceHistory.length,
    present: attendanceHistory.filter((a) => a.status === "present").length,
    checked_in: attendanceHistory.filter((a) => a.status === "checked_in")
      .length,
    late: attendanceHistory.filter((a) => a.status === "late").length,
    absent: attendanceHistory.filter((a) => a.status === "absent").length,
  };

  // Attendance rate only counts PRESENT (fully completed) + LATE as attended
  const attendanceRate =
    stats.total > 0
      ? Math.round(((stats.present + stats.late) / stats.total) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="relative">
              {member.photoUrl ? (
                <img
                  src={member.photoUrl}
                  alt={member.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-foreground">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>
              )}
            </div>
            <div>
              <span className="block">{member.name}'s Attendance</span>
              <span className="text-sm font-normal text-muted-foreground">
                {member.department}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Stats Summary */}
        <div className="grid grid-cols-5 gap-2 py-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="bg-success/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-success">{stats.present}</p>
            <p className="text-xs text-muted-foreground">Present</p>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-500">
              {stats.checked_in}
            </p>
            <p className="text-xs text-muted-foreground">Checked In</p>
          </div>
          <div className="bg-warning/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-warning">{stats.late}</p>
            <p className="text-xs text-muted-foreground">Late</p>
          </div>
          <div className="bg-destructive/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-destructive">
              {stats.absent}
            </p>
            <p className="text-xs text-muted-foreground">Absent</p>
          </div>
        </div>

        {/* Checked-in warning */}
        {stats.checked_in > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-600 dark:text-blue-400">
            <strong>Note:</strong> {stats.checked_in} session(s) show "Checked
            In" status. Checkout is required to be marked as fully present.
          </div>
        )}

        {/* Attendance Rate */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Overall Attendance Rate
            </span>
            <span className="text-lg font-bold text-foreground">
              {attendanceRate}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
        </div>

        {/* Attendance History */}
        <div className="mt-4">
          <h4 className="text-sm font-medium text-foreground mb-3">
            Recent Attendance History
          </h4>
          <ScrollArea className="h-[250px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                <p className="text-muted-foreground">
                  Loading attendance records...
                </p>
              </div>
            ) : attendanceHistory.length > 0 ? (
              <div className="space-y-3">
                {attendanceHistory.map((record) => {
                  const StatusIcon = statusConfig[record.status].icon;
                  return (
                    <div
                      key={record.id}
                      className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className={`p-2 rounded-full ${statusConfig[record.status].bg}`}
                      >
                        <StatusIcon
                          className={`w-4 h-4 ${statusConfig[record.status].color}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {record.sessionName}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(record.checkInTime, "MMM d, yyyy")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(record.checkInTime, "h:mm a")}
                          </span>
                          {record.location && (
                            <span className="truncate">{record.location}</span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`${statusConfig[record.status].color} ${statusConfig[record.status].bg} border-0`}
                      >
                        {record.status.charAt(0).toUpperCase() +
                          record.status.slice(1)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <User className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  No attendance records found
                </p>
                <p className="text-xs text-muted-foreground/70">
                  This member hasn't attended any sessions yet
                </p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
