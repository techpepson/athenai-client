import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
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
  X,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  onClick?: () => void;
}

const NavItem = ({ to, icon, label, collapsed, onClick }: NavItemProps) => (
  <NavLink
    to={to}
    onClick={onClick}
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

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const prevPathname = useRef(location.pathname);

  // Close sidebar on route change (mobile) - only when path actually changes
  useEffect(() => {
    if (prevPathname.current !== location.pathname) {
      onClose();
      prevPathname.current = location.pathname;
    }
  }, [location.pathname, onClose]);

  const handleLogout = () => {
    logout();
    navigate("/auth", { replace: true });
  };

  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin";
  const isLecturer = user?.role === "lecturer";
  const isStaff = user?.role === "staff";
  const isCourseRep = user?.role === "course_rep";
  const isStudent = user?.role === "student";

  const getRolePrefix = () => {
    if (isSuperAdmin) return "/super_admin";
    if (isAdmin) return "/admin";
    if (isLecturer) return "/lecturer";
    if (isStaff) return "/staff";
    if (isCourseRep) return "/course_rep";
    if (isStudent) return "/student";
    return "";
  };

  const rolePrefix = getRolePrefix();

  // Define visibility constants based on user request
  const canSeeDashboard = true; // All roles
  const canSeeMembers =
    isSuperAdmin || isAdmin || isLecturer || isCourseRep || isStudent; // Staff not listed for members
  const canSeeSessions = true; // All roles
  const canSeeKiosk = isCourseRep || isSuperAdmin || isAdmin || isStaff; // "course reps... kiosk Mode", assume staff/admins too? User only listed it for CourseRep. Let's stick to request: Course Rep. AND commonly Admins/Staff run sessions.
  // Wait, User request: "course reps - these are prvileges (dashboard ... kiosk Mode ...)"
  // "Studnet = all privileges of course-rep ,session- see but cant start sesion only view" - Student NOT listed with Kiosk.
  // "Staff ... sessions-ashowssattendance records" - No Kiosk mentioned.
  // "Lecturer ... sessions" - No Kiosk mentioned.
  // "Privileges of admin ... sessions" - No Kiosk mentioned.
  // Kiosk is typically for starting a scan. It seems implied for anyone who can START a session.
  // Re-reading: "Studnet = ... session- see but cant start sesion only view".
  // Let's enable Kiosk for: SuperAdmin, Admin, Lecturer, CourseRep. (Anyone who can start session).
  // Staff? "sessions-ashowssattendance records". Might imply view only?
  // User said: "Staff has ... sessions".
  // User said: "Privileges of admin ... sessions".
  // Let's assume Kiosk is for Session Runners.
  const canRunSessions =
    isSuperAdmin || isAdmin || isLecturer || isCourseRep || isStaff; // Staff usually can too.

  const canSeeAnalytics = true; // All roles (scoped)
  const canSeeNotifications = true; // All roles
  const canSeeAdmins = isSuperAdmin || isAdmin; // "admins" listed for Admin
  const canSeeStaffManagement = isSuperAdmin || isAdmin; // "staff mananagment" listed for Admin
  const canSeeCourseReps = isSuperAdmin || isAdmin || isLecturer; // Listed for Admin, Lecturer. Not Staff.
  const canSeeSettings = true; // All roles

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 z-50",
          // Desktop: always visible
          "hidden lg:flex",
          collapsed ? "lg:w-16" : "lg:w-64",
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img
                src="/comasIcon.png"
                alt="icon"
                className="w-10 h-10 object-contain"
              />
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
          {canSeeDashboard && (
            <NavItem
              to={`${rolePrefix}/dashboard`}
              icon={<LayoutDashboard className="w-5 h-5" />}
              label="Dashboard"
              collapsed={collapsed}
            />
          )}

          {canSeeMembers && !isStudent && (
            <NavItem
              to={`${rolePrefix}/members`}
              icon={<Users className="w-5 h-5" />}
              label="Members"
              collapsed={collapsed}
            />
          )}

          {canSeeSessions &&
            !isStudent /* Hide Sessions for pure Students (Course Rep is distinct var here if logic holds, but wait. isStudent is true for CourseRep? Let's check logic: isStudent = user.role === 'student'. CourseRep is 'course_rep'. User said 'Studdnet = ... session- see but cant start'. User later said 'if student is class rep show session... if not dont'. So plain 'student' role hides sessions. */ && (
              <NavItem
                to={`${rolePrefix}/sessions`}
                icon={<CalendarClock className="w-5 h-5" />}
                label="Sessions"
                collapsed={collapsed}
              />
            )}

          {isCourseRep || isSuperAdmin // Kiosk only for CourseRep or SuperAdmin
            ? canRunSessions && (
                <NavItem
                  to="/kiosk"
                  icon={<Camera className="w-5 h-5" />}
                  label="Kiosk Mode"
                  collapsed={collapsed}
                />
              )
            : null}

          {canSeeAnalytics && (
            <NavItem
              to={`${rolePrefix}/analytics`}
              icon={<BarChart3 className="w-5 h-5" />}
              label="Analytics"
              collapsed={collapsed}
            />
          )}

          {canSeeNotifications && (
            <NavItem
              to={`${rolePrefix}/notifications`}
              icon={<Bell className="w-5 h-5" />}
              label="Notifications"
              collapsed={collapsed}
            />
          )}

          {canSeeAdmins && (
            <NavItem
              to={`${rolePrefix}/admins`}
              icon={<Shield className="w-5 h-5" />}
              label="Admins"
              collapsed={collapsed}
            />
          )}

          {canSeeStaffManagement && (
            <NavItem
              to={`${rolePrefix}/staff`}
              icon={<UserCog className="w-5 h-5" />}
              label="Staff Management"
              collapsed={collapsed}
            />
          )}

          {canSeeCourseReps && (
            <NavItem
              to={`${rolePrefix}/course-reps`}
              icon={<GraduationCap className="w-5 h-5" />}
              label="Course Reps"
              collapsed={collapsed}
            />
          )}

          {isLecturer && (
            <NavItem
              to={`${rolePrefix}/payroll`}
              icon={<Wallet className="w-5 h-5" />}
              label="Payroll"
              collapsed={collapsed}
            />
          )}

          {canSeeSettings && (
            <NavItem
              to={`${rolePrefix}/settings`}
              icon={<Settings className="w-5 h-5" />}
              label={
                isStudent || isCourseRep ? "Profile Settings" : "Settings"
              } /* Dynamic Label */
              collapsed={collapsed}
            />
          )}
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

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 z-50 w-72 rounded-r-2xl",
          "lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Mobile Header with close button */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img
                src="/comasIcon.png"
                alt="icon"
                className="w-10 h-10 object-contain"
              />
            </div>
            <div>
              <h1 className="font-bold text-lg text-sidebar-foreground">
                FaceTrack
              </h1>
              <p className="text-xs text-sidebar-foreground/50">
                Attendance System
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-sidebar-foreground"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-hide">
          {canSeeDashboard && (
            <NavItem
              to={`${rolePrefix}/dashboard`}
              icon={<LayoutDashboard className="w-5 h-5" />}
              label="Dashboard"
              collapsed={false}
              onClick={onClose}
            />
          )}

          {canSeeMembers && !isStudent && (
            <NavItem
              to={`${rolePrefix}/members`}
              icon={<Users className="w-5 h-5" />}
              label="Members"
              collapsed={false}
              onClick={onClose}
            />
          )}

          {canSeeSessions && !isStudent && (
            <NavItem
              to={`${rolePrefix}/sessions`}
              icon={<CalendarClock className="w-5 h-5" />}
              label="Sessions"
              collapsed={false}
              onClick={onClose}
            />
          )}

          {(isCourseRep || isSuperAdmin) && canRunSessions && (
            <NavItem
              to="/kiosk"
              icon={<Camera className="w-5 h-5" />}
              label="Kiosk Mode"
              collapsed={false}
              onClick={onClose}
            />
          )}

          {canSeeAnalytics && (
            <NavItem
              to={`${rolePrefix}/analytics`}
              icon={<BarChart3 className="w-5 h-5" />}
              label="Analytics"
              collapsed={false}
              onClick={onClose}
            />
          )}

          {canSeeNotifications && (
            <NavItem
              to={`${rolePrefix}/notifications`}
              icon={<Bell className="w-5 h-5" />}
              label="Notifications"
              collapsed={false}
              onClick={onClose}
            />
          )}

          {canSeeAdmins && (
            <NavItem
              to={`${rolePrefix}/admins`}
              icon={<Shield className="w-5 h-5" />}
              label="Admins"
              collapsed={false}
              onClick={onClose}
            />
          )}

          {canSeeStaffManagement && (
            <NavItem
              to={`${rolePrefix}/staff`}
              icon={<UserCog className="w-5 h-5" />}
              label="Staff Management"
              collapsed={false}
              onClick={onClose}
            />
          )}

          {canSeeCourseReps && (
            <NavItem
              to={`${rolePrefix}/course-reps`}
              icon={<GraduationCap className="w-5 h-5" />}
              label="Course Reps"
              collapsed={false}
              onClick={onClose}
            />
          )}

          {canSeeSettings && (
            <NavItem
              to={`${rolePrefix}/settings`}
              icon={<Settings className="w-5 h-5" />}
              label={isStudent || isCourseRep ? "Profile Settings" : "Settings"}
              collapsed={false}
              onClick={onClose}
            />
          )}
        </nav>

        {/* Mobile User Section */}
        <div className="p-3 border-t border-sidebar-border space-y-2">
          {user && (
            <div className="px-3 py-2 rounded-lg bg-sidebar-accent/50">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user.name}
              </p>
              <p className="text-xs text-sidebar-foreground/50 capitalize">
                {user.role.replace("_", " ")}
              </p>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setChangePasswordOpen(true);
              onClose();
            }}
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            <Key className="w-4 h-4" />
            <span className="ml-2">Change Password</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" />
            <span className="ml-2">Logout</span>
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
