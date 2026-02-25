import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Upload,
  Download,
  Building2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberCard } from "@/components/members/MemberCard";
import { AddMemberModal } from "@/components/members/AddMemberModal";
import { ViewAttendanceModal } from "@/components/members/ViewAttendanceModal";
import { EditMemberModal } from "@/components/members/EditMemberModal";
import { DeleteMemberDialog } from "@/components/members/DeleteMemberDialog";
import { Member } from "@/types/attendance";
import { useAuth } from "@/contexts/AuthContext";
import { usersServices } from "@/services/users.services";
import { coursesService, Lecturer } from "@/services/courses.services";
import { ROLE_FILTER_OPTIONS } from "@/constants/appConstants";
import { Role } from "@/enums/enums";
import { EmptyState } from "@/components/ui/EmptyState";
import { IUserPublic } from "@/interface/user.interface";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { utilServices, MemberPDFData } from "@/services/utils.services";
import { getAllAttendancesAdmin } from "@/services/attendance.services";

// Placeholder courses until API integration
const Members = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewAttendanceOpen, setViewAttendanceOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseRepActionDialogOpen, setCourseRepActionDialogOpen] =
    useState(false);
  const [removePrivilegeConfirmOpen, setRemovePrivilegeConfirmOpen] =
    useState(false);
  const [deleteEntirelyConfirmOpen, setDeleteEntirelyConfirmOpen] =
    useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [attendanceRates, setAttendanceRates] = useState<
    Record<string, number>
  >({});
  const { user, token } = useAuth();
  const { toast } = useToast();

  const loadMembers = async () => {
    setLoading(true);
    try {
      const response = await usersServices.getAllUsers();
      if (!response.success || !response.data?.users) {
        setMembers([]);
        setLoading(false);
        return;
      }
      const users = response.data.users;
      let filteredUsers: IUserPublic[] = users;

      // Lecturer: only see students/reps in their courses
      if (user?.role === Role.LECTURER) {
        const coursesRes = await coursesService.getLecturerCourses();
        console.log("Lecturer courses response:", coursesRes);

        if (coursesRes.success && coursesRes.data?.data) {
          filteredUsers = users.filter((u) => {
            if (
              (u.role === Role.STUDENT || u.role === Role.REP) &&
              u.student?.id
            ) {
              // Check if student is enrolled in any of the lecturer's courses
              // CourseEnrollment.studentId references Student.id (the cuid), not studentId string
              const isEnrolled = coursesRes.data?.data.some((course) =>
                course.enrollments?.some(
                  (enr: { studentId: string }) =>
                    enr.studentId === u.student?.id,
                ),
              );
              return isEnrolled;
            }
            return false;
          });
        } else {
          filteredUsers = [];
        }
      }
      // Rep: only see lecturers for their courses
      else if (user?.role === Role.REP) {
        // First get the courses the rep is enrolled in
        const studentCoursesRes = await coursesService.getStudentCourses();
        console.log("Rep enrolled courses response:", studentCoursesRes);

        if (
          studentCoursesRes.success &&
          studentCoursesRes.data?.data &&
          studentCoursesRes.data.data.length > 0
        ) {
          const enrolledCourseIds = new Set(
            studentCoursesRes.data.data.map((c) => c.id),
          );
          console.log(
            "Rep enrolled course IDs:",
            Array.from(enrolledCourseIds),
          );

          // Now get ALL courses to find lecturers for those courses
          const allCoursesRes = await coursesService.getAllCourses();
          console.log("All courses response:", allCoursesRes);

          if (
            allCoursesRes.success &&
            allCoursesRes.data?.data &&
            allCoursesRes.data.data.length > 0
          ) {
            // Collect ALL possible lecturer identifiers from courses the rep is enrolled in
            const lecturerIdentifiers = new Set<string>();

            allCoursesRes.data.data.forEach((course) => {
              if (enrolledCourseIds.has(course.id)) {
                console.log(
                  "Course:",
                  course.code,
                  "Full lecturer data:",
                  JSON.stringify(course.lecturers, null, 2),
                );
                if (course.lecturers && Array.isArray(course.lecturers)) {
                  course.lecturers.forEach((lect: Lecturer) => {
                    // Add all possible ID fields to match against
                    if (lect.id) lecturerIdentifiers.add(lect.id);
                    if (lect.userId) lecturerIdentifiers.add(lect.userId);
                    // Check nested user object
                    if (lect.user?.id) lecturerIdentifiers.add(lect.user.id);
                  });
                }
              }
            });

            console.log(
              "All lecturer identifiers found:",
              Array.from(lecturerIdentifiers),
            );

            // Filter users to only include lecturers that match ANY identifier
            filteredUsers = users.filter((u) => {
              if (u.role !== Role.LECTURER) return false;

              // Check ALL possible matching fields
              const matchById = lecturerIdentifiers.has(u.id);
              const matchByLecturerId = u.lecturer?.id
                ? lecturerIdentifiers.has(u.lecturer.id)
                : false;
              const matchByLecturerUserId = u.lecturer?.userId
                ? lecturerIdentifiers.has(u.lecturer.userId)
                : false;

              const isMatch =
                matchById || matchByLecturerId || matchByLecturerUserId;
              console.log(
                "User:",
                u.name,
                "| u.id:",
                u.id,
                "| lecturer.id:",
                u.lecturer?.id,
                "| lecturer.userId:",
                u.lecturer?.userId,
                "| Match:",
                isMatch,
              );
              return isMatch;
            });

            console.log("Final filtered lecturers for rep:", filteredUsers);
          } else {
            console.log(
              "getAllCourses failed or returned empty data:",
              allCoursesRes,
            );
            filteredUsers = [];
          }
        } else {
          console.log(
            "getStudentCourses failed or returned empty data:",
            studentCoursesRes,
          );
          filteredUsers = [];
        }
      }
      // Student: only see other students/reps in their courses
      else if (user?.role === Role.STUDENT) {
        const studentCoursesRes = await coursesService.getStudentCourses();
        filteredUsers = users.filter((u) => {
          if (
            (u.role === Role.STUDENT || u.role === Role.REP) &&
            u.student?.studentId
          ) {
            // Check if student is enrolled in any of the current student's courses
            return studentCoursesRes.data?.data.some((course) =>
              course.enrollments?.some(
                (enr: { studentId: string }) =>
                  enr.studentId === u.student?.studentId,
              ),
            );
          }
          return false;
        });
      }
      // Admin: cannot see other admins or system admins
      else if (user?.role === Role.ADMIN) {
        filteredUsers = users.filter(
          (u) => u.role !== Role.ADMIN && u.role !== Role.SYSTEM_ADMIN,
        );
      }
      // System admins (super admins), staff, owner: see all

      const mappedMembers: Member[] = filteredUsers.map(
        (u: IUserPublic): Member => {
          // Get appropriate ID based on role
          let idNumber: string | undefined;
          if (u.role === Role.STUDENT || u.role === Role.REP) {
            idNumber = u.student?.studentId;
          } else if (u.role === Role.LECTURER) {
            idNumber = u.lecturer?.staffNo || undefined;
          } else if (u.role === Role.STAFF) {
            idNumber = u.staff?.staffNo;
          } else if (u.role === Role.ADMIN || u.role === Role.SYSTEM_ADMIN) {
            idNumber = u.admin?.adminNo;
          }

          return {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            phone: u.phone || undefined,
            department: undefined,
            studentId: idNumber,
            photoUrl: u.profilePicture || u.imageUrl || undefined,
            isMinor: false,
            createdAt: new Date(u.createdAt),
            status: u.isActive ? "active" : "inactive",
            // Lecturer-specific fields
            hourlyRate: u.lecturer?.hourlyRate,
            creditHours: u.lecturer?.creditHours,
            // Note: coursesTaught and coursesEnrolled need to be fetched separately
            // as they are not included in the getAllUsers response
          };
        },
      );
      setMembers(mappedMembers);
    } catch (error) {
      console.error("Failed to load members:", error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  // Load attendance rates for all users
  const loadAttendanceRates = async (userIds: string[]) => {
    if (!token || userIds.length === 0) return;
    try {
      const response = await getAllAttendancesAdmin(token);
      if (response.success && response.data) {
        const rates: Record<string, number> = {};

        // Group attendances by userId
        const attendancesByUser: Record<string, { status: string }[]> = {};
        response.data.forEach((att: { userId: string; status: string }) => {
          if (!attendancesByUser[att.userId]) {
            attendancesByUser[att.userId] = [];
          }
          attendancesByUser[att.userId].push({ status: att.status });
        });

        // Calculate rate for each user - default to 0 if no attendances found
        userIds.forEach((userId) => {
          const userAttendances = attendancesByUser[userId] || [];
          if (userAttendances.length > 0) {
            const stats =
              utilServices.calculateAttendanceStats(userAttendances);
            rates[userId] = stats.attendanceRate;
          } else {
            // No attendance records = 0% (not N/A)
            rates[userId] = 0;
          }
        });

        setAttendanceRates(rates);
      } else {
        // If API fails, set all users to 0%
        const rates: Record<string, number> = {};
        userIds.forEach((userId) => {
          rates[userId] = 0;
        });
        setAttendanceRates(rates);
      }
    } catch (error) {
      console.error("Failed to load attendance rates:", error);
      // On error, set all users to 0%
      const rates: Record<string, number> = {};
      userIds.forEach((userId) => {
        rates[userId] = 0;
      });
      setAttendanceRates(rates);
    }
  };

  // Load members on mount, when modals close, or when user changes
  useEffect(() => {
    if (user) {
      loadMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addModalOpen, deleteDialogOpen, editModalOpen, user?.role]);

  // Load attendance rates when members change or token becomes available
  useEffect(() => {
    if (members.length > 0 && token) {
      loadAttendanceRates(members.map((m) => m.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, token]);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const pdfData: MemberPDFData[] = filteredMembers.map((m) => ({
        name: m.name,
        email: m.email,
        role: m.role,
        idNumber: m.studentId || "-",
        status: m.status,
        attendanceRate: `${attendanceRates[m.id] ?? 0}%`,
        createdAt: m.createdAt ? m.createdAt.toLocaleDateString() : "-",
      }));

      utilServices.exportMembersToPDF(pdfData, "Members Report");
      toast({
        title: "Export Successful",
        description: `Exported ${pdfData.length} members to PDF.`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "Could not export members to PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleViewAttendance = (member: Member) => {
    setSelectedMember(member);
    setViewAttendanceOpen(true);
  };

  const handleDownloadReport = async (member: Member) => {
    try {
      if (!token) {
        toast({
          title: "Error",
          description: "Please log in to download reports.",
          variant: "destructive",
        });
        return;
      }

      // Fetch all attendances and filter for this member
      const response = await getAllAttendancesAdmin(token);
      if (!response.success || !response.data) {
        toast({
          title: "Error",
          description: "Could not fetch attendance data.",
          variant: "destructive",
        });
        return;
      }

      // Filter attendance records for this member
      const memberAttendances = response.data.filter(
        (att) => att.userId === member.id,
      );

      // Calculate stats
      const stats = utilServices.calculateAttendanceStats(memberAttendances);

      // Format attendance records for PDF
      const formattedRecords = memberAttendances.map((att) => ({
        sessionName: att.session?.name || "Unknown Session",
        courseName: att.session?.course?.title || att.session?.course?.code,
        date: att.session?.startTime
          ? new Date(att.session.startTime).toLocaleDateString()
          : att.checkInTime
            ? new Date(att.checkInTime).toLocaleDateString()
            : "-",
        status: att.status,
        checkInTime: att.checkInTime
          ? new Date(att.checkInTime).toLocaleTimeString()
          : "-",
        checkOutTime: att.checkOutTime
          ? new Date(att.checkOutTime).toLocaleTimeString()
          : "-",
      }));

      // Export to PDF
      utilServices.exportIndividualAttendanceReportToPDF(
        {
          name: member.name,
          email: member.email,
          role: member.role,
          idNumber: member.studentId,
        },
        formattedRecords,
        stats,
      );

      toast({
        title: "Report Downloaded",
        description: `Attendance report for ${member.name} has been downloaded.`,
      });
    } catch (error) {
      console.error("Failed to download report:", error);
      toast({
        title: "Error",
        description: "Could not download attendance report.",
        variant: "destructive",
      });
    }
  };

  const handleEditMember = (member: Member) => {
    setSelectedMember(member);
    setEditModalOpen(true);
  };

  const handleDeleteMember = (member: Member) => {
    setSelectedMember(member);
    if (member.role === Role.REP) {
      setCourseRepActionDialogOpen(true);
    } else {
      setDeleteDialogOpen(true);
    }
  };

  const handleRemoveCourseRepPrivilege = () => {
    setCourseRepActionDialogOpen(false);
    setRemovePrivilegeConfirmOpen(true);
  };

  const handleDeleteCourseRepEntirely = () => {
    setCourseRepActionDialogOpen(false);
    setDeleteEntirelyConfirmOpen(true);
  };

  const confirmRemovePrivilege = async () => {
    if (!selectedMember) return;

    // TODO: Implement remove level rep privilege via API
    // For now, show a placeholder message
    toast({
      title: "Feature Coming Soon",
      description:
        "Level rep privilege removal will be available once the API is integrated.",
    });
    setRemovePrivilegeConfirmOpen(false);
    setSelectedMember(null);
  };

  const confirmDeleteEntirely = async () => {
    if (!selectedMember) return;

    try {
      const response = await usersServices.removeUser(selectedMember.email);
      if (response.success) {
        toast({
          title: "Student Deleted",
          description: `${selectedMember.name} has been permanently removed from the system.`,
        });
        loadMembers();
        setDeleteEntirelyConfirmOpen(false);
        setSelectedMember(null);
      } else {
        toast({
          title: "Error",
          description: response.error || "Could not delete student.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Could not delete student.",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!selectedMember) return;

    try {
      const response = await usersServices.removeUser(selectedMember.email);
      if (response.success) {
        toast({
          title: "Member removed",
          description: `${selectedMember.name} has been removed.`,
        });
        loadMembers();
        setDeleteDialogOpen(false);
        setSelectedMember(null);
      } else {
        toast({
          title: "Error",
          description: response.error || "Could not remove member.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Could not remove member.",
        variant: "destructive",
      });
    }
  };

  // Permission checks using Role enum
  const canAddMembers =
    user?.role === Role.SYSTEM_ADMIN ||
    user?.role === Role.OWNER ||
    user?.role === Role.ADMIN;
  const isLecturer = user?.role === Role.LECTURER;
  const isRep = user?.role === Role.REP;

  // Filter role options for lecturers - only show students and level reps
  // For reps - only show lecturers
  const roleFilterOptions = isLecturer
    ? ROLE_FILTER_OPTIONS.filter(
        (option) =>
          option.value === "all" ||
          option.value === Role.STUDENT ||
          option.value === Role.REP,
      )
    : isRep
      ? ROLE_FILTER_OPTIONS.filter(
          (option) => option.value === "all" || option.value === Role.LECTURER,
        )
      : ROLE_FILTER_OPTIONS;

  // Map Role enum values for comparison with Member.role
  const getRoleFilterValue = (filterValue: string): Role[] => {
    if (filterValue === "all") return [];
    const roleMap: Record<string, Role[]> = {
      [Role.STUDENT]: [Role.STUDENT, Role.REP],
      [Role.REP]: [Role.REP],
      [Role.LECTURER]: [Role.LECTURER],
      [Role.STAFF]: [Role.STAFF],
      [Role.ADMIN]: [Role.ADMIN],
      [Role.SYSTEM_ADMIN]: [Role.SYSTEM_ADMIN],
      [Role.OWNER]: [Role.OWNER],
    };
    return roleMap[filterValue] || [filterValue as Role];
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.studentId &&
        member.studentId.toLowerCase().includes(searchQuery.toLowerCase()));

    // Match role filter
    const roleValues = getRoleFilterValue(roleFilter);
    const matchesRole =
      roleFilter === "all" || roleValues.includes(member.role);

    // Match course filter (simplified - courses API not yet integrated)
    const matchesCourse = courseFilter === "all";

    return matchesSearch && matchesRole && matchesCourse;
  });

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Members Management
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage students, staff, and administrators
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* {canAddMembers && (
            <Button variant="outline" size="sm" className="sm:size-default">
              <Upload className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Import CSV</span>
            </Button>
          )} */}
          <Button
            variant="outline"
            size="sm"
            className="sm:size-default"
            onClick={handleExportPDF}
            disabled={isExporting || members.length === 0}
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 sm:mr-2" />
            )}
            <span className="hidden sm:inline">
              {isExporting ? "Exporting..." : "Export PDF"}
            </span>
          </Button>
          {canAddMembers && (
            <Button
              variant="gradient"
              size="sm"
              className="sm:size-default"
              onClick={() => setAddModalOpen(true)}
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Member</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4 bg-card p-3 sm:p-4 rounded-lg sm:rounded-xl border border-border">
        <div className="relative flex-1 min-w-0 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {/* Role Filter */}
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[130px] sm:w-40 text-sm">
              <Filter className="w-4 h-4 mr-1 sm:mr-2" />
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              {roleFilterOptions.map((option) => (
                <SelectItem key={option.label} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Course Filter */}
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-[140px] sm:w-52 text-sm">
              <Building2 className="w-4 h-4 mr-1 sm:mr-2" />
              <SelectValue placeholder="Course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            {filteredMembers.length} member
            {filteredMembers.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading members...</p>
        </div>
      )}

      {/* Members Grid */}
      {!loading && filteredMembers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onEdit={isLecturer || isRep ? undefined : handleEditMember}
              onDelete={isLecturer || isRep ? undefined : handleDeleteMember}
              onViewAttendance={handleViewAttendance}
              onDownloadReport={isRep ? handleDownloadReport : undefined}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredMembers.length === 0 && (
        <EmptyState
          type={searchQuery || roleFilter !== "all" ? "search" : "members"}
          title={
            searchQuery || roleFilter !== "all"
              ? "No results found"
              : "No members yet"
          }
          message={
            searchQuery || roleFilter !== "all"
              ? "Try adjusting your filters or search terms."
              : "Add your first member to get started."
          }
          action={
            canAddMembers && !searchQuery && roleFilter === "all" ? (
              <Button variant="gradient" onClick={() => setAddModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Modals */}
      <AddMemberModal open={addModalOpen} onOpenChange={setAddModalOpen} />
      <ViewAttendanceModal
        open={viewAttendanceOpen}
        onOpenChange={setViewAttendanceOpen}
        member={selectedMember}
      />
      <EditMemberModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        member={selectedMember}
      />
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {selectedMember?.name} from the
              system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Level Rep Action Dialog - Choose between remove privilege or delete */}
      <AlertDialog
        open={courseRepActionDialogOpen}
        onOpenChange={setCourseRepActionDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Level Rep</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedMember?.name} is a Level Representative. How would you
              like to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              variant="outline"
              className="justify-start h-auto p-4"
              onClick={handleRemoveCourseRepPrivilege}
            >
              <div className="text-left">
                <p className="font-medium">Remove Level Rep Privilege</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Demote to regular student. Keep all attendance and course
                  data.
                </p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto p-4 border-destructive/50 hover:bg-destructive/10"
              onClick={handleDeleteCourseRepEntirely}
            >
              <div className="text-left">
                <p className="font-medium text-destructive">Delete Entirely</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Permanently remove student from the system.
                </p>
              </div>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Privilege Confirmation Dialog */}
      <AlertDialog
        open={removePrivilegeConfirmOpen}
        onOpenChange={setRemovePrivilegeConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Level Rep Privilege</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                <strong>{selectedMember?.name}</strong> will return back as a
                regular student.
              </span>
              <span className="block text-success font-medium">
                All data is completely safe. Attendance records and course
                registrations will be preserved.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemovePrivilege}>
              Remove Privilege
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Entirely Confirmation Dialog */}
      <AlertDialog
        open={deleteEntirelyConfirmOpen}
        onOpenChange={setDeleteEntirelyConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Delete Student Permanently
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                <strong>{selectedMember?.name}</strong> will be deleted
                completely from the system.
              </span>
              <span className="block text-destructive font-medium">
                ⚠️ All data about this student will be permanently lost,
                including attendance records, course registrations, and course
                rep assignments.
              </span>
              <span className="block text-sm text-muted-foreground mt-2">
                Consider using "Remove Privilege" action instead to preserve
                data.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteEntirely}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Members;
