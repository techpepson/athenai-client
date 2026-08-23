import { AttendanceSession } from "@/types/attendance";
import { cn } from "@/lib/utils";
import {
  Clock,
  MapPin,
  Users,
  Play,
  Pause,
  CheckCircle,
  Eye,
  Trash2,
  RefreshCw,
  QrCode,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { User } from "@/contexts/AuthContext";
import { Role } from "@/enums/enums";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SessionCardProps {
  session: AttendanceSession;
  onStart?: (session: AttendanceSession) => void;
  onEnd?: (session: AttendanceSession) => void;
  onViewReport?: (session: AttendanceSession) => void;
  onDelete?: (session: AttendanceSession) => void;
  onGenerateQrCode?: (session: AttendanceSession) => void;
  user: User | null;
  isStarting?: boolean;
  isEnding?: boolean;
  isDeleting?: boolean;
  isGeneratingQrCode?: boolean;
}

export const SessionCard = ({
  session,
  onStart,
  onEnd,
  onViewReport,
  onDelete,
  onGenerateQrCode,
  user,
  isStarting = false,
  isEnding = false,
  isDeleting = false,
  isGeneratingQrCode = false,
}: SessionCardProps) => {
  const navigate = useNavigate();

  // Check if past end time
  const now = new Date();
  const endTimeMs = new Date(session.endTime).getTime();
  const isPastEndTime = now.getTime() >= endTimeMs;

  const isRep = user?.role === Role.REP;
  const isLecturer = user?.role === Role.LECTURER;

  // Calculate progress safely to avoid NaN
  const progress =
    session.expectedCount > 0
      ? Math.round((session.presentCount / session.expectedCount) * 100)
      : 0;

  const typeColors = {
    class: "bg-primary/20 text-primary border-primary/30",
    exam: "bg-warning/20 text-warning border-warning/30",
    event: "bg-success/20 text-success border-success/30",
    shift: "bg-accent/20 text-accent-foreground border-accent/30",
  };

  const statusIcons = {
    scheduled: Clock,
    active: Play,
    completed: CheckCircle,
  };

  const StatusIcon = statusIcons[session.status];

  // Check if user is admin
  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SYSTEM_ADMIN;

  // Check if user is the creator of this session
  const isCreator = user?.id === session.createdBy;

  // User can manage session if they created it (LECTURER or REP who created it)
  const canManageSession =
    isCreator && (user?.role === Role.LECTURER || user?.role === Role.REP);

  // Handle show live (navigate to kiosk or meeting)
  const handleShowLive = () => {
    if (session.isOnline) {
      navigate(`/meeting/${session.id}`);
    } else {
      navigate(`/kiosk/${session.id}`);
    }
  };

  return (
    <div
      className={cn(
        "p-5 rounded-xl border transition-all duration-200 animate-fade-in",
        session.status === "active"
          ? "bg-card border-primary/50 shadow-glow"
          : "bg-card border-border hover:border-primary/30",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-full border",
              typeColors[session.type],
            )}
          >
            {session.type.charAt(0).toUpperCase() + session.type.slice(1)}
          </span>
          <span
            className={cn(
              "flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full",
              session.status === "active" && "bg-success/20 text-success",
              session.status === "scheduled" &&
                "bg-muted text-muted-foreground",
              session.status === "completed" &&
                "bg-secondary text-secondary-foreground",
            )}
          >
            <StatusIcon className="w-3 h-3" />
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {session.name}
      </h3>

      {session.courseName && (
        <p className="text-sm text-muted-foreground mb-3">
          {session.courseName}
        </p>
      )}

      {/* Details */}
      <div className="space-y-2 text-sm mb-4">
        {session.location && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{session.location}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>
            {session.startTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            -{" "}
            {session.endTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>
            {session.presentCount} / {session.expectedCount} attendees
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Attendance Progress</span>
          <span className="font-medium text-foreground">
            {isNaN(progress) ? 0 : progress}%
          </span>
        </div>
        <Progress value={isNaN(progress) ? 0 : progress} className="h-2" />
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {/* Timetable session - REP can start session (only if not past end time) */}
        {session.id.startsWith("timetable-") && isRep && !isPastEndTime && (
          <Button
            className="flex-1"
            variant="gradient"
            size="sm"
            onClick={() => onStart?.(session)}
            disabled={isStarting}
          >
            {isStarting ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {isStarting ? "Starting..." : "Start Session"}
          </Button>
        )}

        {/* Active session past end time - show View Report */}
        {session.status === "active" && isPastEndTime && (
          <Button
            className="flex-1"
            variant="outline"
            size="sm"
            onClick={() => onViewReport?.(session)}
          >
            <Eye className="w-4 h-4 mr-2" />
            View Report
          </Button>
        )}

        {/* Active session before end time - creator can show live and end session */}
        {session.status === "active" && !isPastEndTime && canManageSession && (
          <>
            <Button
              className="flex-1"
              variant="gradient"
              size="sm"
              onClick={handleShowLive}
            >
              {session.isOnline ? (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Join Class
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Show Live
                </>
              )}
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              size="sm"
              onClick={() => onEnd?.(session)}
              disabled={isEnding}
            >
              {isEnding ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Pause className="w-4 h-4 mr-2" />
              )}
              {isEnding ? "Ending..." : "End Session"}
            </Button>
          </>
        )}

        {/* Active session before end time - non-creator, non-admin users can view live */}
        {session.status === "active" &&
          !isPastEndTime &&
          !canManageSession &&
          !isAdmin && (
            <Button
              className="flex-1"
              variant="gradient"
              size="sm"
              onClick={handleShowLive}
            >
              {session.isOnline ? (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Join Class
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Show Live
                </>
              )}
            </Button>
          )}

        {/* Completed session - everyone can view report */}
        {session.status === "completed" && (
          <Button
            className="flex-1"
            variant="outline"
            onClick={() => onViewReport?.(session)}
          >
            {isAdmin ? "Download Report" : "View Report"}
          </Button>
        )}
      </div>

      {/* Secondary Actions - QR Code & Delete (only for session creator) */}
      {canManageSession && session.status === "active" && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-border">
          {/* Generate QR Code Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onGenerateQrCode?.(session)}
                  disabled={isGeneratingQrCode}
                >
                  {isGeneratingQrCode ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <QrCode className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Generate QR code for students to scan and mark attendance
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Delete Button with Confirmation */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeleting} className="flex-1">
                {isDeleting ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete Session
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Session</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{session.name}"? This action
                  cannot be undone and will remove all attendance records
                  associated with this session.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete?.(session)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Delete option for completed sessions (creator only) */}
      {canManageSession && session.status === "completed" && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-border justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete Session
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Session</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{session.name}"? This action
                  cannot be undone and will remove all attendance records
                  associated with this session.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete?.(session)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
};
