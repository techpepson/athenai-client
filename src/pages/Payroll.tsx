import { useState } from "react";
import {
  TrendingUp,
  Clock,
  DollarSign,
  CheckCircle,
  Calendar,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth, getCourses, MOCK_SESSIONS } from "@/contexts/AuthContext";
import { PayrollStatsCard } from "@/components/staff/PayrollStatsCard";

interface Session {
  id: string;
  staffId: string;
  staffName: string;
  department: string;
  courseId: string;
  courseName: string;
  date: string;
  clockIn: string;
  clockOut: string;
  hoursWorked: number;
  hourlyRate: number;
  earnings: number;
  paymentStatus: "pending" | "paid";
}

const Payroll = () => {
  const { user } = useAuth();
  const [sessions] = useState<Session[]>(MOCK_SESSIONS);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-01");

  // Get courses taught by the current lecturer
  const allCourses = getCourses();
  const lecturerCourses = allCourses.filter((course) =>
    user?.coursesTaught?.includes(course.id),
  );

  // Filter sessions for this lecturer's courses only
  const filteredSessions = sessions.filter((session) => {
    // Only show sessions for courses this lecturer teaches
    const isLecturerCourse = user?.coursesTaught?.includes(session.courseId);
    if (!isLecturerCourse) return false;

    const matchesCourse =
      selectedCourse === "all" || session.courseId === selectedCourse;
    const matchesMonth = session.date.startsWith(selectedMonth);

    return matchesCourse && matchesMonth;
  });

  // Calculate statistics
  const calculateStats = () => {
    return {
      totalSessions: filteredSessions.length,
      totalHours: filteredSessions.reduce((sum, s) => sum + s.hoursWorked, 0),
      pendingPayment: filteredSessions
        .filter((s) => s.paymentStatus === "pending")
        .reduce((sum, s) => sum + s.earnings, 0),
      paidThisMonth: filteredSessions
        .filter((s) => s.paymentStatus === "paid")
        .reduce((sum, s) => sum + s.earnings, 0),
    };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payroll</h1>
        <p className="text-muted-foreground mt-1">
          Track your teaching hours and earnings
        </p>
      </div>

      {/* Filters - Only Course dropdown and Date filter */}
      <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border flex-wrap">
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All My Courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All My Courses</SelectItem>
            {lecturerCourses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-40">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2026-01">January 2026</SelectItem>
            <SelectItem value="2025-12">December 2025</SelectItem>
            <SelectItem value="2025-11">November 2025</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards - Without Total Staff card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <PayrollStatsCard
          label="Total Hours This Month"
          value={`${stats.totalHours.toFixed(1)}h`}
          icon={Clock}
          variant="primary"
        />
        <PayrollStatsCard
          label="Pending Payments"
          value={`$${stats.pendingPayment.toFixed(2)}`}
          icon={DollarSign}
          variant="warning"
        />
        <PayrollStatsCard
          label="Paid This Month"
          value={`$${stats.paidThisMonth.toFixed(2)}`}
          icon={CheckCircle}
          variant="success"
        />
      </div>

      {/* Monthly Payroll Overview */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Monthly Payroll Overview
              </h2>
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredSessions.length} session(s) found
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Module
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Hours Worked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Earnings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSessions
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
                )
                .map((session) => (
                  <tr
                    key={session.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div className="text-sm text-foreground">
                          {new Date(session.date).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                        {session.courseName}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {session.hoursWorked}h
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-emerald-600">
                        ${session.earnings.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {session.paymentStatus === "pending" ? (
                        <span className="px-3 py-1 bg-amber-500/10 text-amber-600 text-xs rounded-full font-medium">
                          Pending
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-xs rounded-full font-medium">
                          Paid
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {filteredSessions.length === 0 && (
          <div className="p-12 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No sessions found
            </h3>
            <p className="text-muted-foreground">
              {lecturerCourses.length === 0
                ? "You don't have any courses assigned yet."
                : "No sessions match your current filters."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payroll;
