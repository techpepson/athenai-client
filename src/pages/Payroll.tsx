import { useState, useEffect } from "react";
import {
  TrendingUp,
  Clock,
  DollarSign,
  Loader2,
  GraduationCap,
  ClipboardCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PayrollStatsCard } from "@/components/staff/PayrollStatsCard";
import {
  getLecturerEarnings,
  LecturerEarning,
} from "@/services/payroll.service";
import { Role } from "@/enums/enums";

const Payroll = () => {
  const { user, token } = useAuth();
  const [lecturerData, setLecturerData] = useState<LecturerEarning | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const isLecturer = user?.role === Role.LECTURER;

  useEffect(() => {
    const loadPayrollData = async () => {
      // Use mock data for development/preview
      const mockLecturerData: LecturerEarning = {
        name: user?.name || "Dr. John Smith",
        email: user?.email || "john.smith@university.edu",
        staffNo: user?.lecturer?.staffNo || "LEC-2024-001",
        hourlyRate: 75.0,
        totalHours: 42.5,
        earnings: 3187.5,
      };

      // Try to fetch real data if available, otherwise use mock
      if (token && isLecturer) {
        try {
          const earningsResponse = await getLecturerEarnings(token);
          if (earningsResponse.success && earningsResponse.data?.result) {
            const myEarnings = earningsResponse.data.result.find(
              (e) => e.email === user?.email,
            );
            if (myEarnings) {
              setLecturerData(myEarnings);
              setLoading(false);
              return;
            }
          }
        } catch (error) {
          console.error("Failed to load payroll data:", error);
        }
      }

      // Fallback to mock data
      setLecturerData(mockLecturerData);
      setLoading(false);
    };

    loadPayrollData();
  }, [token, user?.email, user?.name, user?.lecturer?.staffNo, isLecturer]);

  if (!isLecturer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <GraduationCap className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Lecturer Access Only
        </h2>
        <p className="text-muted-foreground max-w-md">
          This page is only accessible to lecturers. Please contact an
          administrator if you believe you should have access.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading payroll data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Payroll</h1>
        <p className="text-muted-foreground mt-1">
          Track your attendance hours and earnings
        </p>
      </div>

      {/* Lecturer Info Card */}
      {lecturerData && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {lecturerData.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {lecturerData.staffNo || "No Staff ID"} • {lecturerData.email}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Hourly Rate</p>
              <p className="text-2xl font-bold text-primary">
                ${lecturerData.hourlyRate.toFixed(2)}/hr
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <PayrollStatsCard
          label="Total Hours Attended"
          value={`${lecturerData?.totalHours.toFixed(1) || 0}h`}
          icon={Clock}
          variant="primary"
        />
        <PayrollStatsCard
          label="Hourly Rate"
          value={`$${lecturerData?.hourlyRate.toFixed(2) || 0}`}
          icon={DollarSign}
          variant="warning"
        />
        <PayrollStatsCard
          label="Total Earnings"
          value={`$${lecturerData?.earnings.toFixed(2) || 0}`}
          icon={TrendingUp}
          variant="success"
        />
      </div>

      {/* Earnings Summary */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Attendance-Based Earnings
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Your earnings are calculated from your check-in and check-out times
            at attended sessions.
          </p>
        </div>

        {lecturerData ? (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-muted/30 rounded-lg p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  How Your Earnings Are Calculated
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">
                      Total Hours Attended
                    </span>
                    <span className="font-semibold text-foreground">
                      {lecturerData.totalHours}h
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">× Hourly Rate</span>
                    <span className="font-semibold text-foreground">
                      ${lecturerData.hourlyRate.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-foreground font-medium">
                        Total Earnings
                      </span>
                      <span className="font-bold text-xl text-emerald-600">
                        ${lecturerData.earnings.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 rounded-lg p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">
                  Earnings Breakdown
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">
                        Hours Worked
                      </span>
                      <span className="text-foreground font-medium">
                        {lecturerData.totalHours}h
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${Math.min((lecturerData.totalHours / 100) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Earnings are based on completed attendance records where you
                    have both checked in and checked out of a session.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No attendance records found
            </h3>
            <p className="text-muted-foreground">
              Attend sessions and check in/out to start earning.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payroll;
