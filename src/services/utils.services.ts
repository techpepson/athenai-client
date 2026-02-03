import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface MemberPDFData {
  name: string;
  email: string;
  role: string;
  idNumber: string;
  status: string;
  attendanceRate: string;
  createdAt: string;
}

export interface AttendanceStats {
  totalSessions: number;
  presentCount: number;
  checkedInCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  attendanceRate: number;
}

export class UtilServices {
  async getTokenFromLocalStorage(): Promise<string | null> {
    try {
      const token = localStorage.getItem("accessToken");
      return token;
    } catch (error) {
      console.error("Error retrieving token from localStorage:", error);
      throw error;
    }
  }

  async saveTokenToLocalStorage(token: string): Promise<void> {
    try {
      localStorage.setItem("accessToken", token);
    } catch (error) {
      console.error("Error saving token to localStorage:", error);
      throw error;
    }
  }

  /**
   * Calculate attendance rate from attendance records
   * @param attendances - Array of attendance records for a user
   * @returns AttendanceStats object with calculated rates
   */
  calculateAttendanceStats(attendances: { status: string }[]): AttendanceStats {
    const totalSessions = attendances.length;
    if (totalSessions === 0) {
      return {
        totalSessions: 0,
        presentCount: 0,
        checkedInCount: 0,
        lateCount: 0,
        absentCount: 0,
        excusedCount: 0,
        attendanceRate: 0,
      };
    }

    // PRESENT = fully completed (checked in AND checked out)
    const presentCount = attendances.filter(
      (a) => a.status === "PRESENT",
    ).length;
    // CHECKED_IN = only checked in, waiting for checkout
    const checkedInCount = attendances.filter(
      (a) => a.status === "CHECKED_IN",
    ).length;
    const lateCount = attendances.filter((a) => a.status === "LATE").length;
    const absentCount = attendances.filter((a) => a.status === "ABSENT").length;
    const excusedCount = attendances.filter(
      (a) => a.status === "EXCUSED",
    ).length;

    // Attendance rate = (present + late + excused) / total * 100
    // Note: CHECKED_IN is NOT counted as attended since checkout is required
    const attendedCount = presentCount + lateCount + excusedCount;
    const attendanceRate = Math.round((attendedCount / totalSessions) * 100);

    return {
      totalSessions,
      presentCount,
      checkedInCount,
      lateCount,
      absentCount,
      excusedCount,
      attendanceRate,
    };
  }

  /**
   * Export members list to PDF with attendance rates
   * @param members - Array of member data to export
   * @param title - Title for the PDF document
   */
  exportMembersToPDF(
    members: MemberPDFData[],
    title: string = "Members List",
  ): void {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.setTextColor(41, 128, 185);
    doc.text(title, 14, 20);

    // Add generation date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

    // Add summary stats
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text(`Total Members: ${members.length}`, 14, 36);

    // Create table
    autoTable(doc, {
      startY: 42,
      head: [
        [
          "Name",
          "Email",
          "Role",
          "ID Number",
          "Status",
          "Attendance Rate",
          "Created At",
        ],
      ],
      body: members.map((m) => [
        m.name,
        m.email,
        m.role.charAt(0).toUpperCase() + m.role.slice(1).replace("_", " "),
        m.idNumber || "-",
        m.status.charAt(0).toUpperCase() + m.status.slice(1),
        m.attendanceRate,
        m.createdAt,
      ]),
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 45 },
        2: { cellWidth: 22 },
        3: { cellWidth: 25 },
        4: { cellWidth: 18 },
        5: { cellWidth: 25 },
        6: { cellWidth: 25 },
      },
    });

    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" },
      );
    }

    // Save the PDF
    doc.save(`members-report-${new Date().toISOString().split("T")[0]}.pdf`);
  }

  /**
   * Export individual member's attendance report to PDF
   * @param member - Member data
   * @param attendanceRecords - Array of attendance records for the member
   * @param stats - Attendance statistics
   */
  exportIndividualAttendanceReportToPDF(
    member: { name: string; email: string; role: string; idNumber?: string },
    attendanceRecords: {
      sessionName?: string;
      courseName?: string;
      date: string;
      status: string;
      checkInTime?: string;
      checkOutTime?: string;
    }[],
    stats: AttendanceStats,
  ): void {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.setTextColor(41, 128, 185);
    doc.text("Attendance Report", 14, 20);

    // Add member info
    doc.setFontSize(12);
    doc.setTextColor(60);
    doc.text(`Name: ${member.name}`, 14, 32);
    doc.text(`Email: ${member.email}`, 14, 40);
    doc.text(`Role: ${member.role}`, 14, 48);
    if (member.idNumber) {
      doc.text(`ID: ${member.idNumber}`, 14, 56);
    }

    // Add generation date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Generated on: ${new Date().toLocaleString()}`,
      14,
      member.idNumber ? 66 : 58,
    );

    // Add stats summary
    const statsY = member.idNumber ? 78 : 70;
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text(`Total Sessions: ${stats.totalSessions}`, 14, statsY);
    doc.text(`Present: ${stats.presentCount}`, 70, statsY);
    doc.text(`Late: ${stats.lateCount}`, 110, statsY);
    doc.text(`Absent: ${stats.absentCount}`, 140, statsY);
    doc.text(`Attendance Rate: ${stats.attendanceRate}%`, 14, statsY + 8);

    // Create table
    autoTable(doc, {
      startY: statsY + 16,
      head: [["Session/Course", "Date", "Status", "Check In", "Check Out"]],
      body: attendanceRecords.map((r) => [
        r.sessionName || r.courseName || "-",
        r.date,
        r.status.charAt(0).toUpperCase() +
          r.status.slice(1).toLowerCase().replace("_", " "),
        r.checkInTime || "-",
        r.checkOutTime || "-",
      ]),
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" },
      );
    }

    // Save the PDF
    const safeName = member.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    doc.save(
      `attendance-report-${safeName}-${new Date().toISOString().split("T")[0]}.pdf`,
    );
  }
}

export const utilServices = new UtilServices();
