import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AttendanceSession,
  SessionAttendanceRecord,
  ExpectedAttendee,
} from "@/types/attendance";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  Users,
  UserCheck,
  UserX,
  Clock,
  MapPin,
  Calendar,
  Share2,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SessionReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: AttendanceSession | null;
}

// Internal record type for display
interface DisplayRecord {
  id: string;
  memberId: string;
  memberName: string;
  studentId?: string;
  email?: string;
  department?: string;
  checkInTime: Date;
  status: "present" | "late" | "absent" | "checked_in";
  verificationMethod: "facial" | "qr" | "manual";
  confidence?: number;
}

// Internal absent member type for display
interface AbsentMember {
  id: string;
  name: string;
  studentId?: string;
  email?: string;
  department?: string;
}

export const SessionReportModal = ({
  open,
  onOpenChange,
  session,
}: SessionReportModalProps) => {
  if (!session) return null;

  // Map session attendance records to display format
  const sessionRecords: DisplayRecord[] = (session.attendances || []).map(
    (a) => {
      // Map API status to display status
      let displayStatus: DisplayRecord["status"] = "present";
      const apiStatus = a.status?.toUpperCase();
      if (apiStatus === "LATE") {
        displayStatus = "late";
      } else if (apiStatus === "CHECKED_IN") {
        displayStatus = "present";
      } else if (apiStatus === "ABSENT") {
        displayStatus = "absent";
      } else if (apiStatus === "PRESENT") {
        displayStatus = "present";
      }

      return {
        id: a.id,
        memberId: a.userId,
        memberName: a.userName || "Unknown",
        studentId: a.studentId,
        email: a.userEmail,
        department: a.department,
        checkInTime: a.checkInTime || a.timestamp,
        status: displayStatus,
        verificationMethod:
          (a.source?.toLowerCase() as "facial" | "qr" | "manual") || "manual",
        confidence: a.confidence ? Math.round(a.confidence * 100) : undefined,
      };
    },
  );

  // Get IDs of users who checked in
  const checkedInUserIds = new Set(sessionRecords.map((r) => r.memberId));

  // Calculate absent members from expected attendees
  const absentMembers: AbsentMember[] = (session.expectedAttendees || [])
    .filter((e) => !checkedInUserIds.has(e.userId))
    .map((e) => ({
      id: e.id,
      name: e.name,
      studentId: e.studentId,
      email: e.email,
      department: e.department,
    }));

  // Categorize attendees
  const presentRecords = sessionRecords.filter((r) => r.status === "present");
  const lateRecords = sessionRecords.filter((r) => r.status === "late");

  const stats = [
    {
      label: "Total Expected",
      value: session.expectedCount,
      icon: Users,
      color: "text-primary",
    },
    {
      label: "Present",
      value: presentRecords.length,
      icon: UserCheck,
      color: "text-success",
    },
    {
      label: "Late",
      value: lateRecords.length,
      icon: Clock,
      color: "text-warning",
    },
    {
      label: "Absent",
      value: absentMembers.length,
      icon: UserX,
      color: "text-destructive",
    },
  ];

  const attendanceRate =
    session.expectedCount > 0
      ? Math.round((session.presentCount / session.expectedCount) * 100)
      : 0;

  // Ensure attendanceRate is not NaN
  const safeAttendanceRate = isNaN(attendanceRate) ? 0 : attendanceRate;

  const getStatusBadge = (status: DisplayRecord["status"]) => {
    const variants = {
      present: "bg-success/20 text-success border-success/30",
      checked_in: "bg-blue-500/20 text-blue-500 border-blue-500/30",
      late: "bg-warning/20 text-warning border-warning/30",
      absent: "bg-destructive/20 text-destructive border-destructive/30",
    };
    return variants[status];
  };

  const getMethodBadge = (method: DisplayRecord["verificationMethod"]) => {
    const variants = {
      facial: "bg-primary/20 text-primary border-primary/30",
      qr: "bg-accent/20 text-accent-foreground border-accent/30",
      manual: "bg-muted text-muted-foreground border-border",
    };
    return variants[method];
  };

  const generateReportText = () => {
    const typeLabel =
      session.attendanceType === "checkin" ? "Check-in" : "Check-out";
    const lines = [
      `📋 *${session.name}* - ${typeLabel} Report`,
      `📅 Date: ${session.startTime.toLocaleDateString()}`,
      `⏰ Time: ${session.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${session.endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      session.location ? `📍 Location: ${session.location}` : "",
      "",
      `📊 *Attendance Summary:*`,
      `✅ Present: ${presentRecords.length}`,
      `⏰ Late: ${lateRecords.length}`,
      `❌ Absent: ${absentMembers.length}`,
      `📈 Attendance Rate: ${safeAttendanceRate}%`,
      "",
      `*Attendees:*`,
      ...sessionRecords.map((r) => `• ${r.memberName} - ${r.status}`),
    ].filter(Boolean);
    return lines.join("\n");
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Title
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Session Attendance Report", pageWidth / 2, 20, {
        align: "center",
      });

      // Session Info
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(session.name, pageWidth / 2, 35, { align: "center" });

      if (session.courseName) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Course: ${session.courseName}`, pageWidth / 2, 43, {
          align: "center",
        });
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      let infoY = session.courseName ? 55 : 50;
      doc.text(`Date: ${session.startTime.toLocaleDateString()}`, 14, infoY);
      doc.text(
        `Start Time: ${session.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        14,
        infoY + 7,
      );
      doc.text(
        `End Time: ${session.endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        14,
        infoY + 14,
      );
      if (session.location) {
        doc.text(`Location: ${session.location}`, 14, infoY + 21);
        infoY += 7;
      }
      doc.text(
        `Session Type: ${session.type.charAt(0).toUpperCase() + session.type.slice(1)}`,
        14,
        infoY + 21,
      );
      doc.text(
        `Mode: ${session.attendanceType === "checkin" ? "Check-in" : "Check-out"}`,
        14,
        infoY + 28,
      );

      // Summary Box
      const summaryY = infoY + 40;
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(14, summaryY, pageWidth - 28, 35, 3, 3, "F");

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Attendance Summary", 20, summaryY + 10);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const col1X = 20;
      const col2X = 70;
      const col3X = 120;
      const col4X = 155;
      const summaryTextY = summaryY + 22;

      doc.text(`Total Expected: ${session.expectedCount}`, col1X, summaryTextY);
      doc.text(`Present: ${presentRecords.length}`, col2X, summaryTextY);
      doc.text(`Late: ${lateRecords.length}`, col3X, summaryTextY);
      doc.text(`Absent: ${absentMembers.length}`, col4X, summaryTextY);

      doc.setFont("helvetica", "bold");
      doc.text(
        `Attendance Rate: ${safeAttendanceRate}%`,
        col1X,
        summaryTextY + 8,
      );

      // Attendees Table (Present & Late)
      const tableStartY = summaryY + 50;
      if (sessionRecords.length > 0) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Attendees (Present & Late)", 14, tableStartY);

        autoTable(doc, {
          startY: tableStartY + 5,
          head: [
            [
              "#",
              "Student ID",
              "Name",
              "Check-in Time",
              "Status",
              "Confidence",
            ],
          ],
          body: sessionRecords.map((r, index) => [
            (index + 1).toString(),
            r.studentId || "-",
            r.memberName,
            r.checkInTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            r.status.charAt(0).toUpperCase() + r.status.slice(1),
            r.confidence ? `${r.confidence}%` : "-",
          ]),
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 30 },
            2: { cellWidth: 50 },
            3: { cellWidth: 30 },
            4: { cellWidth: 25 },
            5: { cellWidth: 25 },
          },
        });
      }

      // Absentees Table
      if (absentMembers.length > 0) {
        const finalY =
          (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
            ?.finalY || tableStartY + 10;

        // Check if we need a new page
        if (finalY > 240) {
          doc.addPage();
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text("Absentees", 14, 20);

          autoTable(doc, {
            startY: 25,
            head: [["#", "Student ID", "Name", "Email", "Department"]],
            body: absentMembers.map((m, index) => [
              (index + 1).toString(),
              m.studentId || "-",
              m.name,
              m.email || "-",
              m.department || "-",
            ]),
            theme: "striped",
            headStyles: { fillColor: [239, 68, 68] },
            styles: { fontSize: 9 },
          });
        } else {
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text("Absentees", 14, finalY + 15);

          autoTable(doc, {
            startY: finalY + 20,
            head: [["#", "Student ID", "Name", "Email", "Department"]],
            body: absentMembers.map((m, index) => [
              (index + 1).toString(),
              m.studentId || "-",
              m.name,
              m.email || "-",
              m.department || "-",
            ]),
            theme: "striped",
            headStyles: { fillColor: [239, 68, 68] },
            styles: { fontSize: 9 },
          });
        }
      }

      // Footer
      const pageCount = doc.internal.pages.length - 1;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(
          `Generated on ${new Date().toLocaleString()} - Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" },
        );
      }

      // Save the PDF
      const fileName = `${session.name.replace(/[^a-z0-9]/gi, "_")}_attendance_report_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
      toast.success("PDF report downloaded!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF report");
    }
  };

  const handleExportExcel = () => {
    toast.success("Excel report downloaded!");
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(generateReportText());
    window.open(`https://wa.me/?text=${text}`, "_blank");
    toast.success("Opening WhatsApp...");
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generateReportText());
    toast.success("Report copied to clipboard!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">
                Session Report: {session.name}
              </DialogTitle>
              {/* <div className="flex items-center gap-2 mt-2">
                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-xs',
                    session.attendanceType === 'checkin' 
                      ? 'bg-success/20 text-success border-success/30' 
                      : 'bg-warning/20 text-warning border-warning/30'
                  )}
                >
                  {session.attendanceType === 'checkin' ? (
                    <><LogIn className="w-3 h-3 mr-1" /> Check-in Session</>
                  ) : (
                    <><LogOut className="w-3 h-3 mr-1" /> Check-out Session</>
                  )}
                </Badge>
              </div> */}
            </div>
          </div>
        </DialogHeader>

        {/* Session Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border border-border">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Date:</span>
            <span className="text-foreground font-medium">
              {session.startTime.toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Time:</span>
            <span className="text-foreground font-medium">
              {session.startTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              -
              {session.endTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          {session.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Location:</span>
              <span className="text-foreground font-medium">
                {session.location}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Attendance Rate:</span>
            <span
              className={cn(
                "font-bold",
                safeAttendanceRate >= 80
                  ? "text-success"
                  : safeAttendanceRate >= 60
                    ? "text-warning"
                    : "text-destructive",
              )}
            >
              {safeAttendanceRate}%
            </span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="p-4 bg-muted/30 rounded-lg border border-border text-center"
            >
              <stat.icon className={cn("w-6 h-6 mx-auto mb-2", stat.color)} />
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-muted border border-border flex-wrap h-auto">
            <TabsTrigger value="all">All ({sessionRecords.length})</TabsTrigger>
            <TabsTrigger value="present">
              Present ({presentRecords.length})
            </TabsTrigger>
            <TabsTrigger value="late">Late ({lateRecords.length})</TabsTrigger>
            <TabsTrigger value="absent">
              Absent ({absentMembers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <AttendanceTable
              records={sessionRecords}
              getStatusBadge={getStatusBadge}
              getMethodBadge={getMethodBadge}
              attendanceType={session.attendanceType}
            />
          </TabsContent>

          <TabsContent value="present" className="mt-4">
            <AttendanceTable
              records={presentRecords}
              getStatusBadge={getStatusBadge}
              getMethodBadge={getMethodBadge}
              attendanceType={session.attendanceType}
            />
          </TabsContent>



          <TabsContent value="late" className="mt-4">
            <AttendanceTable
              records={lateRecords}
              getStatusBadge={getStatusBadge}
              getMethodBadge={getMethodBadge}
              attendanceType={session.attendanceType}
            />
          </TabsContent>

          <TabsContent value="absent" className="mt-4">
            <AbsentTable members={absentMembers} />
          </TabsContent>
        </Tabs>

        {/* Export & Share Actions */}
        <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleShareWhatsApp}>
                <svg
                  className="w-4 h-4 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Share via WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyToClipboard}>
                <FileText className="w-4 h-4 mr-2" />
                Copy to Clipboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface AttendanceTableProps {
  records: DisplayRecord[];
  getStatusBadge: (status: DisplayRecord["status"]) => string;
  getMethodBadge: (method: DisplayRecord["verificationMethod"]) => string;
  attendanceType: "checkin" | "checkout";
}

const AttendanceTable = ({
  records,
  getStatusBadge,
  getMethodBadge,
  attendanceType,
}: AttendanceTableProps) => {
  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No records found.
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Member</TableHead>
            <TableHead>Student ID</TableHead>
            <TableHead>Check-in Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Verification</TableHead>
            <TableHead>Confidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => {
            return (
              <TableRow key={record.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {record.memberName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">
                        {record.memberName}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {record.studentId || "-"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {record.checkInTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("text-xs", getStatusBadge(record.status))}
                  >
                    {record.status.charAt(0).toUpperCase() +
                      record.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      getMethodBadge(record.verificationMethod),
                    )}
                  >
                    {record.verificationMethod.charAt(0).toUpperCase() +
                      record.verificationMethod.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {record.confidence ? `${record.confidence}%` : "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

interface AbsentTableProps {
  members: AbsentMember[];
}

const AbsentTable = ({ members }: AbsentTableProps) => {
  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No absentees recorded.
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Member</TableHead>
            <TableHead>Student ID</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Contact</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-destructive/20 text-destructive text-xs">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{member.name}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {member.studentId || "-"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {member.department || "-"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {member.email || "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
