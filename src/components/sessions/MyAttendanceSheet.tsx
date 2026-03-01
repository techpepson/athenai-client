/**
 * MyAttendanceSheet Component
 * Displays the logged-in user's personal attendance record fetched from the backend API.
 * Shows:
 * - Session name, date, module, check-in/out times, status
 * - Filter by module
 */

import { useMemo, useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
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
  Calendar,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Clock,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  getUserAttendance,
  AttendanceRecord,
} from "@/services/attendance.services";
import { modulesService, Module } from "@/services/modules.service";
import { Button } from "@/components/ui/button";

// Format date for display
const formatDate = (dateStr: string | Date): string => {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
};

// Format time from ISO string
const formatTime = (dateStr: string | Date | undefined): string => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const MyAttendanceSheet = () => {
  const { token } = useAuth();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string>("all");

  // Fetch data from backend
  const loadData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [attendanceRes, modulesRes] = await Promise.all([
        getUserAttendance(token),
        modulesService.getModules(),
      ]);

      if (attendanceRes.success && attendanceRes.data) {
        const data = Array.isArray(attendanceRes.data)
          ? attendanceRes.data
          : [];
        setRecords(data);
      }

      if (modulesRes.success && modulesRes.data?.data) {
        setAllModules(modulesRes.data.data);
      }
    } catch (error) {
      console.error("Failed to load attendance:", error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get module info for a record
  const getModuleInfo = useCallback(
    (record: AttendanceRecord): { code: string; name: string } => {
      // Use course info if available
      if (record.session?.course) {
        return {
          code: record.session.course.code,
          name: record.session.course.title,
        };
      }
      // Use module info if available from session include
      if (record.session?.module) {
        return {
          code: record.session.module.code,
          name: record.session.module.name,
        };
      }
      // Fallback: look up module by moduleId
      const moduleId = record.session?.moduleId;
      if (moduleId) {
        const mod = allModules.find((m) => m.id === moduleId);
        if (mod) return { code: mod.code, name: mod.name };
      }
      return { code: "", name: record.session?.name || "Unknown" };
    },
    [allModules],
  );

  // Available modules for filter
  const availableModules = useMemo(() => {
    const seen = new Set<string>();
    const modules: { code: string; name: string }[] = [];
    records.forEach((r) => {
      const info = getModuleInfo(r);
      if (info.code && !seen.has(info.code)) {
        seen.add(info.code);
        modules.push(info);
      }
    });
    return modules;
  }, [records, getModuleInfo]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    if (selectedModule === "all") return records;
    return records.filter((r) => {
      const info = getModuleInfo(r);
      return info.code === selectedModule;
    });
  }, [records, selectedModule, getModuleInfo]);

  // Stats
  const stats = useMemo(() => {
    const present = filteredRecords.filter(
      (r) => r.status === "PRESENT",
    ).length;
    const late = filteredRecords.filter((r) => r.status === "LATE").length;
    const absent = filteredRecords.filter((r) => r.status === "ABSENT").length;
    const checkedIn = filteredRecords.filter(
      (r) => r.status === "CHECKED_IN",
    ).length;
    return { present, late, absent, checkedIn };
  }, [filteredRecords]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your attendance...</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Attendance Records</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Your attendance records will appear here once you mark attendance for
          sessions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">My Attendance Sheet</h2>
          <Badge variant="secondary" className="ml-2">
            {filteredRecords.length} record
            {filteredRecords.length !== 1 ? "s" : ""}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="ml-2"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Module Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Module:</span>
          <Select value={selectedModule} onValueChange={setSelectedModule}>
            <SelectTrigger className="w-full sm:w-[260px]">
              <SelectValue placeholder="All Modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {availableModules.map((m) => (
                <SelectItem key={m.code} value={m.code}>
                  {m.code} - {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[8%] text-center">S/N</TableHead>
              <TableHead className="w-[14%]">Date</TableHead>
              <TableHead className="w-[30%]">Session</TableHead>
              <TableHead className="w-[14%] text-center">Check In</TableHead>
              <TableHead className="w-[14%] text-center">Check Out</TableHead>
              <TableHead className="w-[20%] text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No attendance records found for the selected module.
                </TableCell>
              </TableRow>
            ) : (
              filteredRecords.map((record, idx) => {
                const moduleInfo = getModuleInfo(record);
                const status = (record.status || "ABSENT").toUpperCase();
                const isPresent =
                  status === "PRESENT" ||
                  status === "LATE" ||
                  status === "CHECKED_IN";

                return (
                  <TableRow key={record.id}>
                    <TableCell className="text-center font-medium text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      {formatDate(
                        record.session?.startTime || record.timestamp || "",
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium text-xs text-muted-foreground">
                          {moduleInfo.code}
                        </span>
                        <br />
                        <span className="truncate">
                          {record.session?.name || moduleInfo.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {record.checkInTime ? (
                        <span className="flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {formatTime(record.checkInTime)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {record.checkOutTime ? (
                        <span className="flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {formatTime(record.checkOutTime)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
                          status === "PRESENT"
                            ? "bg-green-500 text-white"
                            : status === "LATE"
                              ? "bg-yellow-500 text-white"
                              : status === "CHECKED_IN"
                                ? "bg-blue-500 text-white"
                                : status === "EXCUSED"
                                  ? "bg-blue-400 text-white"
                                  : "bg-red-500 text-white",
                        )}
                      >
                        {isPresent ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            {status === "CHECKED_IN"
                              ? "Checked In"
                              : status === "LATE"
                                ? "Late"
                                : "Present"}
                          </>
                        ) : status === "EXCUSED" ? (
                          <>
                            <AlertCircle className="w-3 h-3" />
                            Excused
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            Absent
                          </>
                        )}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          Present: {stats.present}
        </div>
        {stats.late > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            Late: {stats.late}
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          Absent: {stats.absent}
        </div>
        {stats.checkedIn > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            Checked In: {stats.checkedIn}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAttendanceSheet;
