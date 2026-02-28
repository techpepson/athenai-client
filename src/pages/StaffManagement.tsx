import { useState, useEffect, useMemo } from "react";
import {
  Users,
  Clock,
  DollarSign,
  Loader2,
  GraduationCap,
  Search,
  Calendar,
  ChevronDown,
  ChevronRight,
  Receipt,
  X,
  FileText,
  TrendingDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PayrollStatsCard } from "@/components/staff/PayrollStatsCard";
import {
  getLecturerEarnings,
  getLecturerPayroll,
  LecturerEarning,
} from "@/services/payroll.service";

// ─── Helpers ────────────────────────────────────────────

/** Build a list of month options from today going back `count` months */
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

/** Format currency */
const fmt = (n: number) => `$${n.toFixed(2)}`;

// ─── Small helper component ─────────────────────────────
function SummaryItem({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="bg-muted/40 rounded-lg p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-semibold ${className ?? "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────

const StaffManagement = () => {
  const { token } = useAuth();
  const { toast } = useToast();

  // Data
  const [lecturers, setLecturers] = useState<LecturerEarning[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLecturer, setDetailLecturer] = useState<LecturerEarning | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);

  // Inline hourly-rate editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState("");

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const monthOptions = useMemo(() => buildMonthOptions(12), []);

  // ── Fetch earnings (re-runs whenever month or token changes) ──
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchEarnings = async () => {
      setLoading(true);
      try {
        const month = selectedMonth === "all" ? undefined : selectedMonth;
        const res = await getLecturerEarnings(token, month);
        if (cancelled) return;
        if (res.success && res.data) {
          const list = Array.isArray(res.data) ? res.data : [];
          setLecturers(list);
        } else {
          setLecturers([]);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load lecturer data:", err);
        toast({
          title: "Error",
          description: "Failed to load lecturer earnings",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchEarnings();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedMonth]);

  // ── Search filter ───────────────────────────────────
  const filteredLecturers = useMemo(() => {
    if (!searchQuery.trim()) return lecturers;
    const q = searchQuery.toLowerCase();
    return lecturers.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.staffNo && l.staffNo.toLowerCase().includes(q)),
    );
  }, [lecturers, searchQuery]);

  // ── Stats ───────────────────────────────────────────
  const stats = useMemo(() => {
    const totalHours = lecturers.reduce((s, l) => s + l.totalHours, 0);
    const totalGross = lecturers.reduce(
      (s, l) => s + (l.grossEarnings ?? l.earnings),
      0,
    );
    const totalTax = lecturers.reduce((s, l) => s + (l.taxDeduction ?? 0), 0);
    const totalNet = lecturers.reduce((s, l) => s + l.earnings, 0);
    return {
      count: lecturers.length,
      totalHours,
      totalGross,
      totalTax,
      totalNet,
    };
  }, [lecturers]);

  // ── Open detail dialog ──────────────────────────────
  const openDetail = async (lecturer: LecturerEarning) => {
    setDetailOpen(true);
    setDetailLecturer(lecturer);

    if (token) {
      setDetailLoading(true);
      try {
        const month = selectedMonth === "all" ? undefined : selectedMonth;
        const res = await getLecturerPayroll(token, lecturer.lecturerId, month);
        if (res.success && res.data) {
          setDetailLecturer(res.data);
        }
      } catch {
        toast({
          title: "Error",
          description: "Failed to load lecturer details",
          variant: "destructive",
        });
      } finally {
        setDetailLoading(false);
      }
    }
  };

  // ── Inline rate editing ─────────────────────────────
  const handleRateClick = (id: string, rate: number) => {
    setEditingId(id);
    setEditingRate(rate.toFixed(2));
  };

  const handleRateSave = (id: string) => {
    const newRate = parseFloat(editingRate);
    if (isNaN(newRate) || newRate < 0) {
      toast({
        title: "Invalid Rate",
        description: "Please enter a valid hourly rate",
        variant: "destructive",
      });
      return;
    }
    setLecturers((prev) =>
      prev.map((l) => {
        if (l.lecturerId === id) {
          const gross = l.totalHours * newRate;
          const tax = gross * (l.taxRate ?? 0.1);
          return {
            ...l,
            hourlyRate: newRate,
            grossEarnings: Math.round(gross * 100) / 100,
            taxDeduction: Math.round(tax * 100) / 100,
            earnings: Math.round((gross - tax) * 100) / 100,
          };
        }
        return l;
      }),
    );
    setEditingId(null);
    toast({ title: "Rate Updated", description: "Hourly rate recalculated" });
  };

  const handleRateKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") handleRateSave(id);
    if (e.key === "Escape") {
      setEditingId(null);
      setEditingRate("");
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Loading state ───────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">
          Loading lecturer earnings...
        </span>
      </div>
    );
  }

  // ── Selected month label ────────────────────────────
  const monthLabel =
    selectedMonth === "all"
      ? "All Time"
      : (monthOptions.find((m) => m.value === selectedMonth)?.label ??
        selectedMonth);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Staff Management</h1>
        <p className="text-muted-foreground mt-1">
          Track lecturer hours, earnings &amp; tax deductions
        </p>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or staff number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <PayrollStatsCard label="Lecturers" value={stats.count} icon={Users} />
        <PayrollStatsCard
          label="Total Hours"
          value={`${stats.totalHours.toFixed(1)}h`}
          icon={Clock}
          variant="primary"
        />
        <PayrollStatsCard
          label="Gross Earnings"
          value={fmt(stats.totalGross)}
          icon={DollarSign}
          variant="success"
        />
        <PayrollStatsCard
          label="Tax Deductions"
          value={fmt(stats.totalTax)}
          icon={TrendingDown}
          variant="warning"
        />
        <PayrollStatsCard
          label="Net Payable"
          value={fmt(stats.totalNet)}
          icon={Receipt}
          variant="success"
        />
      </div>

      {/* Lecturers Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Lecturer Payroll &mdash; {monthLabel}
            </h2>
          </div>
          <Badge variant="secondary" className="text-xs">
            {filteredLecturers.length} lecturer
            {filteredLecturers.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Name</TableHead>
                <TableHead>Staff No</TableHead>
                <TableHead className="text-right">Rate/hr</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">
                  Tax{" "}
                  <span className="text-muted-foreground font-normal">
                    (10%)
                  </span>
                </TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLecturers.map((lec) => {
                const gross = lec.grossEarnings ?? lec.earnings;
                const tax = lec.taxDeduction ?? 0;
                const net = lec.earnings;
                const isExpanded = expandedRows.has(lec.lecturerId);

                return (
                  <TableRow
                    key={lec.lecturerId}
                    className="group cursor-pointer"
                    onClick={() => toggleRow(lec.lecturerId)}
                  >
                    <TableCell className="pr-0">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{lec.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {lec.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{lec.staffNo || "—"}</TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {editingId === lec.lecturerId ? (
                        <Input
                          type="number"
                          value={editingRate}
                          onChange={(e) => setEditingRate(e.target.value)}
                          onBlur={() => handleRateSave(lec.lecturerId)}
                          onKeyDown={(e) =>
                            handleRateKeyDown(e, lec.lecturerId)
                          }
                          className="w-24 ml-auto text-right"
                          autoFocus
                          step="0.01"
                          min="0"
                        />
                      ) : (
                        <button
                          onClick={() =>
                            handleRateClick(lec.lecturerId, lec.hourlyRate)
                          }
                          className="hover:bg-muted px-2 py-1 rounded transition-colors"
                          title="Click to edit"
                        >
                          {fmt(lec.hourlyRate)}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {lec.totalHours.toFixed(1)}h
                    </TableCell>
                    <TableCell className="text-right">{fmt(gross)}</TableCell>
                    <TableCell className="text-right text-red-500">
                      -{fmt(tax)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {fmt(net)}
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDetail(lec)}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filteredLecturers.length === 0 && (
          <div className="p-12 text-center">
            <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No lecturers found
            </h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "No lecturers match your search criteria."
                : "No lecturer earnings data available for this period."}
            </p>
          </div>
        )}
      </div>

      {/* ─── Detail Dialog ───────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Payroll Details
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">
                Loading details...
              </span>
            </div>
          ) : detailLecturer ? (
            <div className="space-y-6">
              {/* Lecturer info */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-semibold text-primary">
                    {detailLecturer.name.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold">
                    {detailLecturer.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {detailLecturer.email}
                  </p>
                  {detailLecturer.staffNo && (
                    <Badge variant="outline" className="mt-1">
                      Staff #{detailLecturer.staffNo}
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              {/* Earnings breakdown */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Earnings Summary &mdash; {monthLabel}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <SummaryItem
                    label="Hourly Rate"
                    value={fmt(detailLecturer.hourlyRate)}
                  />
                  <SummaryItem
                    label="Total Hours"
                    value={`${detailLecturer.totalHours.toFixed(1)}h`}
                  />
                  <SummaryItem
                    label="Gross Earnings"
                    value={fmt(
                      detailLecturer.grossEarnings ?? detailLecturer.earnings,
                    )}
                    className="text-foreground"
                  />
                  <SummaryItem
                    label={`Tax Deduction (${((detailLecturer.taxRate ?? 0.1) * 100).toFixed(0)}%)`}
                    value={`-${fmt(detailLecturer.taxDeduction ?? 0)}`}
                    className="text-red-500"
                  />
                </div>

                <Separator className="my-4" />

                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Net Payable
                  </span>
                  <span className="text-2xl font-bold text-green-600">
                    {fmt(detailLecturer.earnings)}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Session breakdown */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Session Breakdown
                </h4>
                {detailLecturer.sessions &&
                detailLecturer.sessions.length > 0 ? (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Session</TableHead>
                          <TableHead className="text-right">Hours</TableHead>
                          <TableHead className="text-right">Earnings</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailLecturer.sessions.map((s) => (
                          <TableRow key={s.sessionId}>
                            <TableCell className="font-medium">
                              {s.sessionName}
                            </TableCell>
                            <TableCell className="text-right">
                              {s.hours.toFixed(2)}h
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {fmt(s.hours * detailLecturer.hourlyRate)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No session data available for this period.
                  </p>
                )}
              </div>

              {/* Footer actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>
                  <X className="w-4 h-4 mr-1" />
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              No data available.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffManagement;
