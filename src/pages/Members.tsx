import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Upload,
  Download,
  Building2,
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
import {
  useAuth,
  getAllUsers,
  deleteStudentUser,
  deleteStaffUser,
  deleteAdminStaffUser,
  removeCourseRep,
  MOCK_DEPARTMENTS,
  MOCK_COURSES,
  ROLE_FILTER_OPTIONS,
} from "@/contexts/AuthContext";
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

const Members = () => {
  const [members, setMembers] = useState<Member[]>([]);
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
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadMembers();
  }, [addModalOpen, deleteDialogOpen, editModalOpen]);

  const loadMembers = () => {
    const users = getAllUsers();
    // Map User to Member
    const mappedMembers: Member[] = users
      .filter((u) => {
        // Filter members based on logged-in user role
        if (!user) return false;

        if (user.role === "lecturer") {
          // Lecturer can only see students registered to their courses
          // And fellow staff? "members-limited to only student registered to his or her courses"
          // So we exclude admin/staff/lecturer from the list? Requirement says "only student".
          if (u.role !== "student" && u.role !== "course_rep") return false;

          // Check if student takes any of the lecturer's courses
          const studentCourses = Array.isArray(u.coursesTaken)
            ? u.coursesTaken
            : typeof u.coursesTaken === "string"
              ? u.coursesTaken.split(",").map((c) => c.trim())
              : [];

          const lecturerCourses = user.coursesTaught || [];
          return studentCourses.some((c) => lecturerCourses.includes(c));
        }

        if (user.role === "course_rep" || user.role === "student") {
          // Students/Reps see peers in their relevant courses
          if (u.role !== "student" && u.role !== "course_rep") return false;

          // For Course Reps: Courses they rep. For Students: Courses they take.
          let relevantCourseIds: string[] = [];

          if (user.role === "course_rep") {
            relevantCourseIds =
              user.courseRepData?.map((c) => c.courseId) || [];
          } else {
            relevantCourseIds = Array.isArray(user.coursesTaken)
              ? user.coursesTaken
              : typeof user.coursesTaken === "string"
                ? user.coursesTaken.split(",").map((c) => c.trim())
                : [];
          }

          const studentCourses = Array.isArray(u.coursesTaken)
            ? u.coursesTaken
            : typeof u.coursesTaken === "string"
              ? u.coursesTaken.split(",").map((c) => c.trim())
              : [];
          return studentCourses.some((c) => relevantCourseIds.includes(c));
        }

        return true; // Admin/SuperAdmin/Staff see all (Staff visibility unclear but leaving as all for now per typical extensive access)
      })
      .map((u) => {
        // Determine status: only students with registered courses are active
        let status: "active" | "inactive" = "inactive";
        if (u.role === "student") {
          const courses = Array.isArray(u.coursesTaken)
            ? u.coursesTaken
            : typeof u.coursesTaken === "string"
              ? u.coursesTaken
                  .split(",")
                  .map((c) => c.trim())
                  .filter(Boolean)
              : [];
          status = courses.length > 0 ? "active" : "inactive";
        }

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department,
          studentId: u.studentId || u.staffId, // Map both to generic ID field if needed or keep separate
          photoUrl: undefined, // Mock users don't have photoUrl yet
          isMinor: false, // Default
          createdAt: new Date(), // Mock date
          status,
        };
      });
    setMembers(mappedMembers);
  };

  const handleViewAttendance = (member: Member) => {
    setSelectedMember(member);
    setViewAttendanceOpen(true);
  };

  const handleEditMember = (member: Member) => {
    setSelectedMember(member);
    setEditModalOpen(true);
  };

  const handleDeleteMember = (member: Member) => {
    setSelectedMember(member);
    if (member.role === "course_rep") {
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

  const confirmRemovePrivilege = () => {
    if (!selectedMember) return;

    const success = removeCourseRep(selectedMember.id);

    if (success) {
      toast({
        title: "Privilege Removed",
        description: `${selectedMember.name} has been returned to student status. All data is safe.`,
      });
      loadMembers();
      setRemovePrivilegeConfirmOpen(false);
      setSelectedMember(null);
    } else {
      toast({
        title: "Error",
        description: "Could not remove course rep privilege.",
        variant: "destructive",
      });
    }
  };

  const confirmDeleteEntirely = () => {
    if (!selectedMember) return;

    const success = deleteStudentUser(selectedMember.id);

    if (success) {
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
        description: "Could not delete student.",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = () => {
    if (!selectedMember) return;

    let success = false;
    if (
      selectedMember.role === "student" ||
      selectedMember.role === "course_rep"
    ) {
      success = deleteStudentUser(selectedMember.id);
    } else if (
      selectedMember.role === "staff" ||
      selectedMember.role === "lecturer"
    ) {
      success = deleteStaffUser(selectedMember.id);
    } else if (selectedMember.role === "admin") {
      // If viewing admin staff (e.g. by super admin), allow delete
      success = deleteAdminStaffUser(selectedMember.id);
    }

    if (success) {
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
        description: "Could not remove member.",
        variant: "destructive",
      });
    }
  };

  // Super admin and admin staff can add members
  const canAddMembers = user?.role === "super_admin" || user?.role === "admin";
  const isLecturer = user?.role === "lecturer";

  // Filter role options for lecturers - only show students and course reps
  const roleFilterOptions = isLecturer
    ? ROLE_FILTER_OPTIONS.filter(
        (option) =>
          option.value === "all" ||
          option.value === "student" ||
          option.value === "course_rep",
      )
    : ROLE_FILTER_OPTIONS;

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.studentId &&
        member.studentId.toLowerCase().includes(searchQuery.toLowerCase()));

    // Match role filter: "student" includes both plain students and course reps.
    const matchesRole =
      roleFilter === "all" ||
      (roleFilter === "student"
        ? member.role === "student" || member.role === "course_rep"
        : member.role === roleFilter);

    // Match course filter - check if member has this course
    const matchesCourse =
      courseFilter === "all" ||
      (() => {
        const users = getAllUsers();
        const fullUser = users.find((u) => u.id === member.id);
        if (!fullUser) return false;

        // Check coursesTaught for staff/lecturer
        if (fullUser.coursesTaught) {
          return fullUser.coursesTaught.includes(courseFilter);
        }
        // Check coursesTaken for students
        if (fullUser.coursesTaken) {
          const courses =
            typeof fullUser.coursesTaken === "string"
              ? fullUser.coursesTaken.split(",")
              : fullUser.coursesTaken;
          return courses.includes(courseFilter);
        }
        return false;
      })();

    return matchesSearch && matchesRole && matchesCourse;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Members Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage students, staff, and administrators
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canAddMembers && (
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
          )}
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          {canAddMembers && (
            <Button variant="gradient" onClick={() => setAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Role Filter */}
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by role" />
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
          <SelectTrigger className="w-52">
            <Building2 className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {MOCK_COURSES.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {filteredMembers.length} member
          {filteredMembers.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            onEdit={isLecturer ? undefined : handleEditMember}
            onDelete={isLecturer ? undefined : handleDeleteMember}
            onViewAttendance={handleViewAttendance}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredMembers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No members found matching your criteria.
          </p>
          {(searchQuery || roleFilter !== "all" || courseFilter !== "all") && (
            <p className="text-sm text-muted-foreground mt-2">
              Try adjusting your filters or search terms.
            </p>
          )}
        </div>
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

      {/* Course Rep Action Dialog - Choose between remove privilege or delete */}
      <AlertDialog
        open={courseRepActionDialogOpen}
        onOpenChange={setCourseRepActionDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Course Rep</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedMember?.name} is a Course Representative. How would you
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
                <p className="font-medium">Remove Course Rep Privilege</p>
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
            <AlertDialogTitle>Remove Course Rep Privilege</AlertDialogTitle>
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
