import { useState, useEffect } from "react";
import {
  ArrowLeft,
  TrendingUp,
  Users,
  Clock,
  DollarSign,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usersServices } from "@/services/users.services";
import { Role } from "@/enums/enums";
import { PayrollStatsCard } from "@/components/staff/PayrollStatsCard";
import { StaffFilters } from "@/components/staff/StaffFilters";
import { PayrollTable } from "@/components/staff/PayrollTable";
import { EmptyState } from "@/components/ui/EmptyState";

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

// Placeholder sessions until API integration
const PLACEHOLDER_SESSIONS: Session[] = [];

const StaffManagement = () => {
  const [sessions, setSessions] = useState<Session[]>(PLACEHOLDER_SESSIONS);
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-01");
  const [expandedStaff, setExpandedStaff] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const response = await usersServices.getAllUsers();
      if (response.success && response.data?.users) {
        const staffUsers = response.data.users
          .filter((u) => u.role === Role.STAFF || u.role === Role.LECTURER)
          .map((u) => ({ id: u.id, name: u.name }));
        setStaffList(staffUsers);
      }
    } catch (error) {
      console.error("Failed to load staff:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter sessions based on selected filters
  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      session.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.staffId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.courseName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStaff =
      selectedStaff === "all" || session.staffId === selectedStaff;
    const matchesDepartment =
      selectedDepartment === "all" || session.department === selectedDepartment;
    const matchesMonth = session.date.startsWith(selectedMonth);

    return matchesSearch && matchesStaff && matchesDepartment && matchesMonth;
  });

  // Calculate statistics
  const calculateStats = () => {
    if (selectedStaff !== "all") {
      // Individual staff stats
      const staffSessions = filteredSessions.filter(
        (s) => s.staffId === selectedStaff,
      );
      return {
        totalSessions: staffSessions.length,
        totalHours: staffSessions.reduce((sum, s) => sum + s.hoursWorked, 0),
        pendingPayment: staffSessions
          .filter((s) => s.paymentStatus === "pending")
          .reduce((sum, s) => sum + s.earnings, 0),
        paidThisMonth: staffSessions
          .filter((s) => s.paymentStatus === "paid")
          .reduce((sum, s) => sum + s.earnings, 0),
      };
    } else {
      // Overall stats
      return {
        totalStaff: new Set(filteredSessions.map((s) => s.staffId)).size,
        totalHours: filteredSessions.reduce((sum, s) => sum + s.hoursWorked, 0),
        pendingPayment: filteredSessions
          .filter((s) => s.paymentStatus === "pending")
          .reduce((sum, s) => sum + s.earnings, 0),
        paidThisMonth: filteredSessions
          .filter((s) => s.paymentStatus === "paid")
          .reduce((sum, s) => sum + s.earnings, 0),
      };
    }
  };

  const stats = calculateStats();

  // Group sessions by staff when department is selected
  const groupByStaff = () => {
    const grouped: { [key: string]: Session[] } = {};
    filteredSessions.forEach((session) => {
      if (!grouped[session.staffId]) {
        grouped[session.staffId] = [];
      }
      grouped[session.staffId].push(session);
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
      description: "Staff member has been paid successfully",
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

  const handleBackToOverview = () => {
    setSelectedStaff("all");
    setExpandedStaff(new Set());
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Staff Management</h1>
        <p className="text-muted-foreground mt-1">
          Track staff hours and manage payroll
        </p>
      </div>

      <StaffFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedStaff={selectedStaff}
        onStaffChange={setSelectedStaff}
        selectedDepartment={selectedDepartment}
        onDepartmentChange={setSelectedDepartment}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        staffList={staffList}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <PayrollStatsCard
          label={selectedStaff !== "all" ? "Total Sessions" : "Total Staff"}
          value={
            selectedStaff !== "all" ? stats.totalSessions : stats.totalStaff
          }
          icon={Users}
        />
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

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Monthly Payroll Overview
              </h2>
            </div>
            {selectedStaff !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToOverview}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Overview
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <PayrollTable
            sessions={filteredSessions}
            selectedStaff={selectedStaff}
            expandedStaff={expandedStaff}
            onToggleExpansion={toggleStaffExpansion}
            onPayStaff={handlePayStaff}
            onSelectStaff={setSelectedStaff}
            groupedSessions={groupByStaff()}
          />
        </div>

        {filteredSessions.length === 0 && (
          <div className="p-12 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No sessions found
            </h3>
            <p className="text-muted-foreground">
              No staff sessions match your current filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffManagement;
