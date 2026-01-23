import { useAuth } from "@/contexts/AuthContext";
import StudentDashboard from "./dashboards/StudentDashboard";
import LecturerDashboard from "./dashboards/LecturerDashboard";
import StaffDashboard from "./dashboards/StaffDashboard";
import AdminDashboard from "./dashboards/AdminDashboard";

const Dashboard = () => {
  const { user } = useAuth();

  // Route to appropriate dashboard based on user role
  if (user?.role === "student" || user?.role === "course_rep") {
    return <StudentDashboard />;
  }

  if (user?.role === "lecturer") {
    // Lecturers are teachers/professors
    return <LecturerDashboard />;
  }

  if (user?.role === "staff") {
    // Staff are workers (janitors, security, etc.) who track their attendance
    return <StaffDashboard />;
  }

  if (user?.role === "admin" || user?.role === "super_admin") {
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
