import { useState, useEffect, useMemo, useCallback } from "react";
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
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { PayrollStatsCard } from "@/components/staff/PayrollStatsCard";
import {
  getMyPayroll,
  LecturerEarning,
  SessionDetail,
} from "@/services/payroll.service";
import {
  getUserAttendance,
  AttendanceRecord,
} from "@/services/attendance.services";
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

const formatDateOnly = (value?: string) => {
  if (!value) return "\u2014";
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value?: string) => {
  if (!value) return "\u2014";
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const computeSessionBreakdown = (
  session: SessionDetail,
  lecturer: LecturerEarning | null,
) => {
  const hours = session.hours ?? 0;
  const regular = Math.min(session.regularHours ?? hours, hours);
  const overtime = session.overtimeHours ?? Math.max(0, hours - regular);
  const hourlyRate = session.hourlyRate ?? lecturer?.hourlyRate ?? 0;
  const overtimeRate =
    session.overtimeRate ?? lecturer?.overtimeRate ?? hourlyRate;
  const regularEarnings = session.regularEarnings ?? regular * hourlyRate;
  const overtimeEarnings = session.overtimeEarnings ?? overtime * overtimeRate;
  const gross = session.grossEarnings ?? regularEarnings + overtimeEarnings;
  const taxRate = session.taxRate ?? lecturer?.taxRate ?? 0.1;
  const taxAmount = session.taxAmount ?? gross * taxRate;
  const net = session.netEarnings ?? gross - taxAmount;

  return {
    hours,
    regular,
    overtime,
    hourlyRate,
    overtimeRate,
    regularEarnings,
    overtimeEarnings,
    gross,
    taxAmount,
    net,
    taxRate,
  };
};

// ─── Component ──────────────────────────────────────────

const Payroll = () => {
  const { user, token } = useAuth();
  const [lecturerData, setLecturerData] = useState<LecturerEarning | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );

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

  useEffect(() => {
    if (!token || !isLecturer) {
      setAttendanceRecords([]);
      return;
    }

    let cancelled = false;
    const loadAttendanceRecords = async () => {
      try {
        const res = await getUserAttendance(token);
        if (cancelled) return;
        if (res.success && res.data) {
          setAttendanceRecords(res.data);
        } else {
          setAttendanceRecords([]);
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load attendance records:", error);
        setAttendanceRecords([]);
      }
    };

    loadAttendanceRecords();
    return () => {
      cancelled = true;
    };
  }, [token, isLecturer]);

  const attendanceBySession = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach((record) => {
      if (!map.has(record.sessionId)) {
        map.set(record.sessionId, record);
      }
    });
    return map;
  }, [attendanceRecords]);

  const sessionsWithAttendance = useMemo(() => {
    if (!lecturerData?.sessions?.length) return [] as SessionDetail[];
    return lecturerData.sessions.map((session) => {
      const attendance = attendanceBySession.get(session.sessionId);
      return {
        ...session,
        checkInTime:
          session.checkInTime ??
          attendance?.checkInTime ??
          attendance?.timestamp,
        checkOutTime: session.checkOutTime ?? attendance?.checkOutTime,
      };
    });
  }, [lecturerData?.sessions, attendanceBySession]);

  const sessionHourTotals = useMemo(() => {
    if (!sessionsWithAttendance.length) {
      return { total: 0, regular: 0, overtime: 0 };
    }
    return sessionsWithAttendance.reduce(
      (acc, session) => {
        const hours = session.hours ?? 0;
        const regular = Math.min(session.regularHours ?? hours, hours);
        const overtime = session.overtimeHours ?? Math.max(0, hours - regular);
        return {
          total: acc.total + hours,
          regular: acc.regular + regular,
          overtime: acc.overtime + overtime,
        };
      },
      { total: 0, regular: 0, overtime: 0 },
    );
  }, [sessionsWithAttendance]);

  const activeSession = useMemo(() => {
    if (!selectedSessionId) return null;
    return (
      sessionsWithAttendance.find(
        (session) => session.sessionId === selectedSessionId,
      ) ?? null
    );
  }, [selectedSessionId, sessionsWithAttendance]);

  const selectedBreakdown = activeSession
    ? computeSessionBreakdown(activeSession, lecturerData)
    : null;

  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") {
      window.print();
    }
  }, []);

  const handleRecordPrint = useCallback(() => {
    if (typeof window === "undefined") return;
    window.print();
  }, []);

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
  const sessionCount = sessionsWithAttendance.length;
  const hasSessionData = sessionCount > 0;
  const fallbackWorked = lecturerData?.totalHours ?? 0;
  const fallbackRegular =
    lecturerData?.regularHours ??
    Math.max(0, fallbackWorked - (lecturerData?.overtimeHours ?? 0));
  const fallbackOvertime =
    lecturerData?.overtimeHours ??
    Math.max(0, fallbackWorked - fallbackRegular);
  const workedHours = hasSessionData ? sessionHourTotals.total : fallbackWorked;
  const regularHours = hasSessionData
    ? sessionHourTotals.regular
    : fallbackRegular;
  const overtimeHours = hasSessionData
    ? sessionHourTotals.overtime
    : fallbackOvertime;
  const overtimeRate =
    lecturerData?.overtimeRate ?? lecturerData?.hourlyRate ?? 0;
  const regularEarnings =
    lecturerData?.regularEarnings ??
    regularHours * (lecturerData?.hourlyRate ?? 0);
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

        <div className="flex items-center gap-2">
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
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print PDF
          </Button>
        </div>
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
                          width: `${Math.min((workedHours / 100) * 100, 100)}%`,
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
            {sessionCount > 0 && (
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
                        <TableHead className="text-right">
                          OT Earnings
                        </TableHead>
                        <TableHead className="text-right">Net</TableHead>
                        <TableHead className="text-right">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessionsWithAttendance.map((s) => {
                        const breakdown = computeSessionBreakdown(
                          s,
                          lecturerData,
                        );
                        return (
                          <TableRow key={s.sessionId}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span>{s.sessionName}</span>
                                {(s.date || s.checkInTime) && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatDateOnly(s.date ?? s.checkInTime)}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {breakdown.hours.toFixed(2)}h
                            </TableCell>
                            <TableCell className="text-right">
                              {breakdown.regular.toFixed(2)}h
                            </TableCell>
                            <TableCell className="text-right">
                              {breakdown.overtime.toFixed(2)}h
                            </TableCell>
                            <TableCell className="text-right">
                              {fmt(breakdown.overtimeEarnings)}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              {fmt(breakdown.net)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setSelectedSessionId(s.sessionId)
                                }
                              >
                                View
                              </Button>
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

      <Dialog
        open={!!activeSession}
        onOpenChange={(open) => {
          if (!open) setSelectedSessionId(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Attendance &amp; Payroll Details</DialogTitle>
            <DialogDescription>
              {activeSession?.sessionName || "Session breakdown"}
            </DialogDescription>
          </DialogHeader>

          {activeSession && selectedBreakdown && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Check-In</p>
                  <p className="font-semibold text-foreground">
                    {formatDateTime(activeSession.checkInTime)}
                  </p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Check-Out</p>
                  <p className="font-semibold text-foreground">
                    {formatDateTime(activeSession.checkOutTime)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <span className="text-muted-foreground">Worked Hours</span>
                <span className="text-right font-semibold">
                  {selectedBreakdown.hours.toFixed(2)}h
                </span>
                <span className="text-muted-foreground">Regular Hours</span>
                <span className="text-right font-semibold">
                  {selectedBreakdown.regular.toFixed(2)}h
                </span>
                <span className="text-muted-foreground">Overtime Hours</span>
                <span className="text-right font-semibold">
                  {selectedBreakdown.overtime.toFixed(2)}h
                </span>
                <span className="text-muted-foreground">Hourly Rate</span>
                <span className="text-right font-semibold">
                  {fmt(selectedBreakdown.hourlyRate)}
                </span>
                <span className="text-muted-foreground">OT Rate</span>
                <span className="text-right font-semibold">
                  {fmt(selectedBreakdown.overtimeRate)}
                </span>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Regular Earnings
                  </span>
                  <span className="font-semibold">
                    {fmt(selectedBreakdown.regularEarnings)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Overtime Earnings
                  </span>
                  <span className="font-semibold">
                    {fmt(selectedBreakdown.overtimeEarnings)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Pay</span>
                  <span className="font-semibold">
                    {fmt(selectedBreakdown.gross)}
                  </span>
                </div>
                <div className="flex justify-between text-red-500">
                  <span>
                    Tax ({(selectedBreakdown.taxRate * 100).toFixed(0)}%)
                  </span>
                  <span className="font-semibold">
                    -{fmt(selectedBreakdown.taxAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-600 text-base font-semibold">
                  <span>Net Pay</span>
                  <span>{fmt(selectedBreakdown.net)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-end gap-2">
            <Button variant="outline" onClick={handleRecordPrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print Record
            </Button>
            <Button
              variant="secondary"
              onClick={() => setSelectedSessionId(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payroll;
