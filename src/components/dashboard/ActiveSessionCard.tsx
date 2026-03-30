import { AttendanceSession } from "@/types/attendance";
import { cn } from "@/lib/utils";
import { Clock, MapPin, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ActiveSessionCardProps {
  session: AttendanceSession;
}

export const ActiveSessionCard = ({ session }: ActiveSessionCardProps) => {
  const rawProgress =
    session.expectedCount > 0
      ? (session.presentCount / session.expectedCount) * 100
      : 0;
  const progress = Number.isFinite(rawProgress)
    ? Math.max(0, Math.min(100, rawProgress))
    : 0;

  const typeColors = {
    class: "bg-primary/20 text-primary",
    exam: "bg-warning/20 text-warning",
    event: "bg-success/20 text-success",
    shift: "bg-accent/20 text-accent-foreground",
  };

  const statusColors = {
    scheduled: "bg-muted text-muted-foreground",
    active: "bg-success/20 text-success",
    completed: "bg-secondary text-secondary-foreground",
  };

  return (
    <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-200 animate-fade-in">
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
            <span
              className={cn(
                "px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full",
                typeColors[session.type],
              )}
            >
              {session.type.charAt(0).toUpperCase() + session.type.slice(1)}
            </span>
            <span
              className={cn(
                "px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full",
                statusColors[session.status],
              )}
            >
              {session.status === "active" && (
                <span className="inline-block w-1.5 h-1.5 bg-success rounded-full mr-1 animate-pulse" />
              )}
              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
            </span>
          </div>
          <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">
            {session.name}
          </h3>
        </div>
      </div>

      <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
        {session.location && (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">{session.location}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
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
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          <span>
            {session.presentCount} / {session.expectedCount} attendees
          </span>
        </div>
      </div>

      <div className="mt-3 sm:mt-4">
        <div className="flex items-center justify-between text-[10px] sm:text-xs mb-1">
          <span className="text-muted-foreground">Attendance</span>
          <span className="font-medium text-foreground">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} className="h-1.5 sm:h-2" />
      </div>
    </div>
  );
};
