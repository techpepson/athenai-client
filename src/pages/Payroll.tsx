import { useState, useEffect } from "react";
import { TrendingUp, Clock, DollarSign, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth, getCourses, MOCK_SESSIONS } from "@/contexts/AuthContext";
import { PayrollStatsCard } from "@/components/staff/PayrollStatsCard";
import { PayrollTable } from "@/components/staff/PayrollTable";

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
  const [sessions, setSessions] = useState<Session[]>(MOCK_SESSIONS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-01");
  const [expandedStaff, setExpandedStaff] = useState<Set<string>>(new Set());
  const { toast } = useToast();

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

    const matchesSearch =
      session.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.staffId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.courseName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCourse =
      selectedCourse === "all" || session.courseId === selectedCourse;
    const matchesMonth = session.date.startsWith(selectedMonth);

    return matchesSearch && matchesCourse && matchesMonth;
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

  // Group sessions by course
  const groupByCourse = () => {
    const grouped: { [key: string]: Session[] } = {};
    filteredSessions.forEach((session) => {
      if (!grouped[session.courseId]) {
        grouped[session.courseId] = [];
      }
      grouped[session.courseId].push(session);
    });
    return grouped;
  };

  const handlePayStaff = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, paymentStatus: "paid" as const } : s,
      ),
    );
    toast({
      title: "Payment processed",
      description: "Payment has been marked as complete",
    });
  };

  const toggleStaffExpansion = (staffId: string) => {
    setExpandedStaff((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(staffId)) {
        newSet.delete(staffId);
      } else {
        newSet.add(staffId);
      }
      return newSet;
    });
  };

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
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All Courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
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

      {/* Monthly Payroll Overview with Action header */}
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
          <PayrollTable
            sessions={filteredSessions}
            selectedStaff="all"
            expandedStaff={expandedStaff}
            onToggleExpansion={toggleStaffExpansion}
            onPayStaff={handlePayStaff}
            onSelectStaff={() => {}}
            groupedSessions={groupByCourse()}
          />
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
