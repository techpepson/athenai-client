import { cn } from "@/lib/utils";
import {
  Users,
  BookOpen,
  Calendar,
  Bell,
  BarChart3,
  Shield,
  UserCog,
  GraduationCap,
  ClipboardList,
  Search,
  Inbox,
} from "lucide-react";
import { EMPTY_STATE_MESSAGES, EmptyStateKey } from "@/constants/appConstants";

interface EmptyStateProps {
  type?: EmptyStateKey;
  message?: string;
  title?: string;
  icon?: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

const iconMap: Record<EmptyStateKey, React.ReactNode> = {
  members: <Users className="w-12 h-12 text-muted-foreground/50" />,
  courses: <BookOpen className="w-12 h-12 text-muted-foreground/50" />,
  sessions: <Calendar className="w-12 h-12 text-muted-foreground/50" />,
  notifications: <Bell className="w-12 h-12 text-muted-foreground/50" />,
  analytics: <BarChart3 className="w-12 h-12 text-muted-foreground/50" />,
  admins: <Shield className="w-12 h-12 text-muted-foreground/50" />,
  staff: <UserCog className="w-12 h-12 text-muted-foreground/50" />,
  courseReps: <GraduationCap className="w-12 h-12 text-muted-foreground/50" />,
  attendance: <ClipboardList className="w-12 h-12 text-muted-foreground/50" />,
  search: <Search className="w-12 h-12 text-muted-foreground/50" />,
  default: <Inbox className="w-12 h-12 text-muted-foreground/50" />,
};

const titleMap: Record<EmptyStateKey, string> = {
  members: "No Members",
  courses: "No Courses",
  sessions: "No Sessions",
  notifications: "All Caught Up",
  analytics: "No Data",
  admins: "No Admins",
  staff: "No Staff",
  courseReps: "No Level Reps",
  attendance: "No Records",
  search: "No Results",
  default: "No Data",
};

export const EmptyState = ({
  type = "default",
  message,
  title,
  icon,
  className,
  action,
}: EmptyStateProps) => {
  const displayIcon = icon ?? iconMap[type];
  const displayTitle = title ?? titleMap[type];
  const displayMessage = message ?? EMPTY_STATE_MESSAGES[type];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className,
      )}
    >
      <div className="mb-4">{displayIcon}</div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {displayTitle}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        {displayMessage}
      </p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};
