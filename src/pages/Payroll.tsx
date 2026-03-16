import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  Loader2,
  GraduationCap,
  ClipboardCheck,
  CalendarCheck,
  Calendar,
  TrendingDown,
  Receipt,
  Clock,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { PayrollStatsCard } from "@/components/staff/PayrollStatsCard";
import { getMyPayroll, LecturerEarning } from "@/services/payroll.service";
import { Role } from "@/enums/enums";

// ─── Helpers ────────────────────────────────────────────

function buildMonthOptions(count = 12) {
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
    months.push({ value, label });
  }
  return months;
}

const fmt = (n: number) => `₵${n.toFixed(2)}`;

// ─── Component ──────────────────────────────────────────

const Payroll = () => {
  const { user, token } = useAuth();
  const [lecturerData, setLecturerData] = useState<LecturerEarning | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const isLecturer = user?.role === Role.LECTURER;
  const monthOptions = useMemo(() => buildMonthOptions(12), []);

  // Re-fetch whenever month or token changes
  useEffect(() => {
    if (!token || !isLecturer) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadPayrollData = async () => {
      setLoading(true);
      try {
        const month = selectedMonth === "all" ? undefined : selectedMonth;
        const response = await getMyPayroll(token, month);
        if (cancelled) return;
        if (response.success && response.data) {
          setLecturerData(response.data);
        } else {
          setLecturerData(null);
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load payroll data:", error);
        setLecturerData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPayrollData();
    return () => {
      cancelled = true;
    };
  }, [token, isLecturer, selectedMonth]);

  const monthLabel =
    selectedMonth === "all"
      ? "All Time"
      : (monthOptions.find((m) => m.value === selectedMonth)?.label ??
        selectedMonth);

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

  const gross = lecturerData?.grossEarnings ?? lecturerData?.earnings ?? 0;
  const tax = lecturerData?.taxDeduction ?? 0;
  const net = lecturerData?.earnings ?? 0;
  const taxPct = ((lecturerData?.taxRate ?? 0.1) * 100).toFixed(0);
  const sessionCount = lecturerData?.sessions?.length ?? 0;
  const workedHours = lecturerData?.totalHours ?? 0;
  const overtimeHours = lecturerData?.overtimeHours ?? 0;
  const regularHours =
    lecturerData?.regularHours ?? Math.max(0, workedHours - overtimeHours);
  const overtimeRate = lecturerData?.overtimeRate ?? lecturerData?.hourlyRate ?? 0;
  const regularEarnings =
    lecturerData?.regularEarnings ?? regularHours * (lecturerData?.hourlyRate ?? 0);
  const overtimeEarnings =
    lecturerData?.overtimeEarnings ?? overtimeHours * overtimeRate;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Payroll</h1>
          <p className="text-muted-foreground mt-1">
            Track your attendance hours, earnings &amp; tax deductions
          </p>
        </div>

        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-52">
            <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            {monthOptions.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lecturer Info Card */}
      {lecturerData && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {lecturerData.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {lecturerData.staffNo || "No Staff ID"} &middot;{" "}
                {lecturerData.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-3">
        <PayrollStatsCard
          label="Sessions Attended"
          value={sessionCount}
          icon={CalendarCheck}
          variant="primary"
        />
        <PayrollStatsCard
          label="Worked Hours"
          value={`${workedHours.toFixed(2)}h`}
          icon={Clock}
          variant="warning"
        />
        <PayrollStatsCard
          label="Overtime Hours"
          value={`${overtimeHours.toFixed(2)}h`}
          icon={Clock}
          variant="warning"
        />
        <PayrollStatsCard
          label="Overtime Earnings"
          value={fmt(overtimeEarnings)}
          icon={TrendingUp}
          variant="success"
        />
        <PayrollStatsCard
          label="Gross Earnings"
          value={fmt(gross)}
          icon={TrendingUp}
          variant="success"
        />
        <PayrollStatsCard
          label={`Tax (${taxPct}%)`}
          value={fmt(tax)}
          icon={TrendingDown}
          variant="warning"
        />
        <PayrollStatsCard
          label="Net Payable"
          value={fmt(net)}
          icon={Receipt}
          variant="success"
        />
      </div>

      {/* Earnings Summary */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Earnings Breakdown &mdash; {monthLabel}
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
              {/* Calculation breakdown */}
              <div className="bg-muted/30 rounded-lg p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">
                  How Your Earnings Are Calculated
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Total Hours Worked</span>
                    <span className="font-semibold text-foreground">
                      {workedHours.toFixed(2)}h
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Regular Hours</span>
                    <span className="font-semibold text-foreground">
                      {regularHours.toFixed(2)}h
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Overtime Hours</span>
                    <span className="font-semibold text-foreground">
                      {overtimeHours.toFixed(2)}h
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">&times; Hourly Rate</span>
                    <span className="font-semibold text-foreground">
                      {fmt(lecturerData.hourlyRate)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Regular Earnings</span>
                    <span className="font-semibold text-foreground">
                      {fmt(regularEarnings)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Overtime Earnings</span>
                    <span className="font-semibold text-foreground">
                      {fmt(overtimeEarnings)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-foreground font-medium">
                      Gross Earnings
                    </span>
                    <span className="font-bold text-foreground">
                      {fmt(gross)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-red-500">
                      &minus; Tax Deduction ({taxPct}%)
                    </span>
                    <span className="font-semibold text-red-500">
                      -{fmt(tax)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-foreground font-medium">
                      Net Payable
                    </span>
                    <span className="font-bold text-xl text-emerald-600">
                      {fmt(net)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress visual */}
              <div className="bg-primary/5 rounded-lg p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">
                  Earnings Summary
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">
                        {sessionCount} Session{sessionCount !== 1 ? "s" : ""}{" "}
                        &middot; {workedHours.toFixed(2)}h Worked
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                      <div
                        className="bg-primary h-2.5 rounded-full transition-all"
                        style={{
                          width: `${Math.min((lecturerData.totalHours / 100) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-background rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Gross</p>
                      <p className="text-lg font-bold">{fmt(gross)}</p>
                    </div>
                    <div className="bg-background rounded-lg p-3">
                      <p className="text-xs text-red-400">Tax</p>
                      <p className="text-lg font-bold text-red-500">
                        -{fmt(tax)}
                      </p>
                    </div>
                  </div>
                  <div className="bg-emerald-500/10 rounded-lg p-4 text-center">
                    <p className="text-xs text-emerald-600">Net Take-Home</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {fmt(net)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Earnings are based on completed attendance records where you
                    have both checked in and checked out of a session.
                  </p>
                </div>
              </div>
            </div>

            {/* Session breakdown table */}
            {lecturerData.sessions && lecturerData.sessions.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Session Details
                </h3>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Session</TableHead>
                        <TableHead className="text-right">Worked</TableHead>
                        <TableHead className="text-right">Regular</TableHead>
                        <TableHead className="text-right">Overtime</TableHead>
                        <TableHead className="text-right">OT Earnings</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lecturerData.sessions.map((s) => {
                        const sRegularHours = s.regularHours ?? s.hours;
                        const sOvertimeHours =
                          s.overtimeHours ?? Math.max(0, s.hours - sRegularHours);
                        const sOvertimeEarnings = sOvertimeHours * overtimeRate;
                        const sGross = s.hours * lecturerData.hourlyRate;
                        const sTax = sGross * (lecturerData.taxRate ?? 0.1);
                        const sNet = sGross - sTax;
                        return (
                          <TableRow key={s.sessionId}>
                            <TableCell className="font-medium">
                              {s.sessionName}
                            </TableCell>
                            <TableCell className="text-right">
                              {s.hours.toFixed(2)}h
                            </TableCell>
                            <TableCell className="text-right">
                              {sRegularHours.toFixed(2)}h
                            </TableCell>
                            <TableCell className="text-right">
                              {sOvertimeHours.toFixed(2)}h
                            </TableCell>
                            <TableCell className="text-right">
                              {fmt(sOvertimeEarnings)}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              {fmt(sNet)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
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
