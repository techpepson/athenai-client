import { useState, useEffect } from "react";
import { Bell, Search, User, Sun, Moon, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Role, useAuth } from "@/contexts/AuthContext";
import {
  notificationsService,
  NotificationStatus,
} from "@/services/notifications.services";

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    let isMounted = true;
    async function fetchUnread() {
      try {
        const response = await notificationsService.getUserNotifications();
        if (response.success && response.data) {
          const count = response.data.filter(
            (n) => n.status === NotificationStatus.UNREAD,
          ).length;
          if (isMounted) setUnreadCount(count);
        } else {
          if (isMounted) setUnreadCount(0);
        }
      } catch {
        if (isMounted) setUnreadCount(0);
      }
    }
    fetchUnread();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const formattedRole = user?.role
    ? user.role === Role.REP
      ? "Assistant"
      : user.role
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
    : "Guest";

  const firstName = user?.name?.split(" ")[0] || "Guest";
  const navigate = useNavigate();

  const handleNotificationClick = () => {
    if (!user?.role) return;

    const rolePrefix =
      user.role === Role.SYSTEM_ADMIN
        ? "super_admin"
        : user.role === Role.ADMIN
          ? "admin"
          : user.role === Role.LECTURER
            ? "lecturer"
            : user.role === Role.REP
              ? "course_rep"
              : user.role === Role.STAFF
                ? "staff"
                : "student";

    navigate(`/${rolePrefix}/notifications`);
  };
  const handleProfileClick = () => {
    if (!user?.role) return;

    const rolePrefix =
      user.role === Role.SYSTEM_ADMIN
        ? "super_admin"
        : user.role === Role.ADMIN
          ? "admin"
          : user.role === Role.LECTURER
            ? "lecturer"
            : user.role === Role.REP
              ? "course_rep"
              : user.role === Role.STAFF
                ? "staff"
                : "student";

    navigate(`/${rolePrefix}/settings`);
  };

  return (
    <header className="h-14 sm:h-16 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-40">
      <div className="h-full px-3 sm:px-4 md:px-6 flex items-center justify-between gap-2 sm:gap-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden flex-shrink-0"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Search - hidden on mobile, visible on tablet+ */}
        <div className="relative hidden sm:block flex-1 max-w-sm md:max-w-md lg:max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search members, sessions..."
            className="pl-10 bg-secondary/50 border-border/50 focus:bg-secondary text-sm"
          />
        </div>

        {/* Mobile search icon */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden text-muted-foreground"
        >
          <Search className="w-5 h-5" />
        </Button>

        {/* Spacer for mobile */}
        <div className="flex-1 sm:hidden" />

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={handleNotificationClick}
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-destructive text-destructive-foreground text-[10px] sm:text-xs rounded-full flex items-center justify-center font-medium">
                {unreadCount}
              </span>
            )}
          </Button>

          <div className="w-px h-6 sm:h-8 bg-border hidden sm:block" />

          <Button
            variant="ghost"
            className="gap-1 sm:gap-2 px-1 sm:px-2"
            onClick={handleProfileClick}
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
              <User className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium">{firstName}</p>
              <p className="text-xs text-muted-foreground">{formattedRole}</p>
            </div>
          </Button>
        </div>
      </div>
    </header>
  );
};
