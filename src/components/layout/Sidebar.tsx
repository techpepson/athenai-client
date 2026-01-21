import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Camera,
  BarChart3,
  Settings,
  Bell,
  ChevronLeft,
  ChevronRight,
  Shield,
  LogOut,
  UserCog,
  Key,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
}

const NavItem = ({ to, icon, label, collapsed }: NavItemProps) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
        "hover:bg-sidebar-accent",
        isActive
          ? "bg-primary/10 text-primary border-l-2 border-primary"
          : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
        collapsed && "justify-center px-2",
      )
    }
  >
    <span className="flex-shrink-0">{icon}</span>
    {!collapsed && <span className="font-medium text-sm">{label}</span>}
  </NavLink>
);

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/auth", { replace: true });
  };

  const isSuperAdmin = user?.role === "super_admin";
  const canManageClassReps =
    user?.role === "super_admin" ||
    user?.role === "staff" ||
    user?.role === "admin";

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 z-50",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="./comasIcon.png" alt="icon" />
            </div>
            {!collapsed && (
              <div className="animate-fade-in">
                <h1 className="font-bold text-lg text-sidebar-foreground">
                  FaceTrack
                </h1>
                <p className="text-xs text-sidebar-foreground/50">
                  Attendance System
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-hide">
          <NavItem
            to="/dashboard"
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Dashboard"
            collapsed={collapsed}
          />
          <NavItem
            to="/members"
            icon={<Users className="w-5 h-5" />}
            label="Members"
            collapsed={collapsed}
          />
          <NavItem
            to="/sessions"
            icon={<CalendarClock className="w-5 h-5" />}
            label="Sessions"
            collapsed={collapsed}
          />
          <NavItem
            to="/kiosk"
            icon={<Camera className="w-5 h-5" />}
            label="Kiosk Mode"
            collapsed={collapsed}
          />
          <NavItem
            to="/analytics"
            icon={<BarChart3 className="w-5 h-5" />}
            label="Analytics"
            collapsed={collapsed}
          />
          <NavItem
            to="/notifications"
            icon={<Bell className="w-5 h-5" />}
            label="Notifications"
            collapsed={collapsed}
          />

          {isSuperAdmin && (
            <NavItem
              to="/admins"
              icon={<Shield className="w-5 h-5" />}
              label="Admins"
              collapsed={collapsed}
            />
          )}

          {(isSuperAdmin || user?.role === "admin") && (
            <NavItem
              to="/staff"
              icon={<UserCog className="w-5 h-5" />}
              label="Staff Management"
              collapsed={collapsed}
            />
          )}

          {canManageClassReps && (
            <NavItem
              to="/class-reps"
              icon={<GraduationCap className="w-5 h-5" />}
              label="Class Reps"
              collapsed={collapsed}
            />
          )}
          <NavItem
            to="/settings"
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
            collapsed={collapsed}
          />
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-sidebar-border space-y-2">
          {/* User Info */}
          {user && !collapsed && (
            <div className="px-3 py-2 rounded-lg bg-sidebar-accent/50">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user.name}
              </p>
              <p className="text-xs text-sidebar-foreground/50 capitalize">
                {user.role.replace("_", " ")}
              </p>
            </div>
          )}

          {/* Change Password */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setChangePasswordOpen(true)}
            className={cn(
              "w-full text-sidebar-foreground/70 hover:text-sidebar-foreground",
              collapsed ? "px-2" : "justify-start",
            )}
          >
            <Key className="w-4 h-4" />
            {!collapsed && <span className="ml-2">Change Password</span>}
          </Button>

          {/* Logout */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className={cn(
              "w-full text-destructive hover:text-destructive hover:bg-destructive/10",
              collapsed ? "px-2" : "justify-start",
            )}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="ml-2">Logout</span>}
          </Button>

          {/* Collapse Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn("w-full", collapsed ? "px-2" : "justify-start")}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
            {!collapsed && <span className="ml-2">Collapse</span>}
          </Button>
        </div>
      </aside>

      <ChangePasswordModal
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
    </>
  );
};
