import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/enums/enums";
import StudentDashboard from "./dashboards/StudentDashboard";
import LecturerDashboard from "./dashboards/LecturerDashboard";
import StaffDashboard from "./dashboards/StaffDashboard";
import AdminDashboard from "./dashboards/AdminDashboard";

const Dashboard = () => {
  const { user } = useAuth();

  // Route to appropriate dashboard based on user role
  if (user?.role === Role.STUDENT || user?.role === Role.REP) {
    return <StudentDashboard />;
  }

  if (user?.role === Role.LECTURER) {
    // Lecturers are teachers/professors
    return <LecturerDashboard />;
  }

  if (user?.role === Role.STAFF) {
    // Staff are workers (janitors, security, etc.) who track their attendance
    return <StaffDashboard />;
  }

  if (user?.role === Role.ADMIN || user?.role === Role.SYSTEM_ADMIN || user?.role === Role.OWNER) {
    return <AdminDashboard />;
  }

  // Fallback dashboard for unknown roles or not logged in
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome! Please log in to access your dashboard.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
