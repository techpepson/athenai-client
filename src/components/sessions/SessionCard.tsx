import { useState, useEffect } from "react";
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
  LogIn,
  LogOut,
  QrCode,
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
  onToggleMode?: (session: AttendanceSession) => void;
  onGenerateQrCode?: (session: AttendanceSession) => void;
  onCheckout?: (session: AttendanceSession) => void;
  user: User | null;
  isTogglingMode?: boolean;
  isDeleting?: boolean;
  isGeneratingQrCode?: boolean;
}

// localStorage key for checked out sessions
const CHECKED_OUT_SESSIONS_KEY = "checked_out_sessions";

// Helper to check if a session is checked out
const isSessionCheckedOut = (sessionId: string): boolean => {
  const stored = localStorage.getItem(CHECKED_OUT_SESSIONS_KEY);
  if (!stored) return false;
  const checkedOut: string[] = JSON.parse(stored);
  return checkedOut.includes(sessionId);
};

// Helper to mark a session as checked out
const markSessionCheckedOut = (sessionId: string): void => {
  const stored = localStorage.getItem(CHECKED_OUT_SESSIONS_KEY);
  const checkedOut: string[] = stored ? JSON.parse(stored) : [];
  if (!checkedOut.includes(sessionId)) {
    checkedOut.push(sessionId);
    localStorage.setItem(CHECKED_OUT_SESSIONS_KEY, JSON.stringify(checkedOut));
    // Dispatch event for cross-component sync
    window.dispatchEvent(new Event("session-checked-out"));
  }
};

export const SessionCard = ({
  session,
  onStart,
  onEnd,
  onViewReport,
  onDelete,
  onToggleMode,
  onGenerateQrCode,
  onCheckout,
  user,
  isTogglingMode = false,
  isDeleting = false,
  isGeneratingQrCode = false,
}: SessionCardProps) => {
  const navigate = useNavigate();
  const [isCheckedOut, setIsCheckedOut] = useState(() =>
    isSessionCheckedOut(session.id),
  );

  // Check if past end time
  const now = new Date();
  const endTimeMs = new Date(session.endTime).getTime();
  const isPastEndTime = now.getTime() >= endTimeMs;

  // Auto checkout after 30 minutes past end time
  useEffect(() => {
    if (session.status !== "active") return;
    if (isCheckedOut) return;

    const AUTO_CHECKOUT_MINUTES = 30;
    const autoCheckoutTime = endTimeMs + AUTO_CHECKOUT_MINUTES * 60 * 1000;
    const timeUntilAutoCheckout = autoCheckoutTime - Date.now();

    if (timeUntilAutoCheckout <= 0) {
      // Already past auto checkout time
      markSessionCheckedOut(session.id);
      setIsCheckedOut(true);
      return;
    }

    const timer = setTimeout(() => {
      markSessionCheckedOut(session.id);
      setIsCheckedOut(true);
    }, timeUntilAutoCheckout);

    return () => clearTimeout(timer);
  }, [session.id, session.status, isCheckedOut, endTimeMs]);

  // Listen for checkout events from other components
  useEffect(() => {
    const handleCheckoutEvent = () => {
      setIsCheckedOut(isSessionCheckedOut(session.id));
    };

    window.addEventListener("session-checked-out", handleCheckoutEvent);
    window.addEventListener("storage", handleCheckoutEvent);

    return () => {
      window.removeEventListener("session-checked-out", handleCheckoutEvent);
      window.removeEventListener("storage", handleCheckoutEvent);
    };
  }, [session.id]);

  // Handle checkout
  const handleCheckout = () => {
    markSessionCheckedOut(session.id);
    setIsCheckedOut(true);
    onCheckout?.(session);
  };

  // Check if user can checkout (REP or LECTURER)
  const isRep = user?.role === Role.REP;
  const isLecturer = user?.role === Role.LECTURER;
  const canCheckout = isRep || isLecturer;

  // Check if session mode can be toggled (only CHECK_IN -> CHECK_OUT allowed by backend)
  // Backend allows toggle only within 15 mins after end time
  const canToggleMode = () => {
    if (session.status !== "active") return false;
    if (session.attendanceType === "checkout") return false; // Already in CHECK_OUT

    const GRACE_MINUTES = 15;
    const now = Date.now();
    const endTime = new Date(session.endTime).getTime();
    const graceDeadline = endTime + GRACE_MINUTES * 60 * 1000;

    return now <= graceDeadline;
  };

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

  // Handle show live (navigate to kiosk with session)
  const handleShowLive = () => {
    // Navigate to kiosk mode with session ID in URL
    // Session data will be fetched from API in Kiosk component
    navigate(`/kiosk/${session.id}`);
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
            -
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
        {/* Scheduled timetable session - only REP can start session */}
        {session.status === "scheduled" &&
          session.id.startsWith("timetable-") &&
          isRep && (
            <Button
              className="flex-1"
              variant="gradient"
              size="sm"
              onClick={() => onStart?.(session)}
            >
              <Play className="w-4 h-4 mr-2" />
              Start Session
            </Button>
          )}

        {/* Active session past end time - show Checkout for REP/LECTURER */}
        {session.status === "active" &&
          isPastEndTime &&
          canCheckout &&
          !isCheckedOut && (
            <Button
              className="flex-1"
              variant="destructive"
              size="sm"
              onClick={handleCheckout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Checkout
            </Button>
          )}

        {/* Active session past end time and checked out - show View Report */}
        {session.status === "active" && isPastEndTime && isCheckedOut && (
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
              <Eye className="w-4 h-4 mr-2" />
              Show Live
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              size="sm"
              onClick={() => onEnd?.(session)}
            >
              <Pause className="w-4 h-4 mr-2" />
              End Session
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
              <Eye className="w-4 h-4 mr-2" />
              Show Live
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

      {/* Secondary Actions - Toggle Mode, QR Code & Delete (only for session creator) */}
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

          {/* Toggle Mode Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onToggleMode?.(session)}
                  disabled={!canToggleMode() || isTogglingMode}
                >
                  {isTogglingMode ? (
                    <RefreshCw className="w-4 h-4 sm:mr-2 animate-spin" />
                  ) : session.attendanceType === "checkin" ? (
                    <LogOut className="w-4 h-4 sm:mr-2" />
                  ) : (
                    <LogIn className="w-4 h-4 sm:mr-2" />
                  )}
                  <span className="hidden sm:inline">
                    {session.attendanceType === "checkin"
                      ? "Switch to Check-Out"
                      : "Check-Out Mode"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {!canToggleMode()
                  ? session.attendanceType === "checkout"
                    ? "Session is already in Check-Out mode"
                    : "Can only switch to Check-Out within 15 mins after session end time"
                  : "Switch session to Check-Out mode for students to mark their departure"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Delete Button with Confirmation */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeleting}>
                {isDeleting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
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
