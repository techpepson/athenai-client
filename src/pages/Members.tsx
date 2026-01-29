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
import { useAuth } from "@/contexts/AuthContext";
import { usersServices } from "@/services/users.services";
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

// Placeholder courses until API integration
const PLACEHOLDER_COURSES = [
  { id: "cs101", name: "Introduction to Computer Science", department: "cs" },
  { id: "cs201", name: "Data Structures", department: "cs" },
  { id: "cs301", name: "Algorithms", department: "cs" },
];

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
  const { user } = useAuth();
  const { toast } = useToast();

  const loadMembers = async () => {
    setLoading(true);
    try {
      const response = await usersServices.getAllUsers();
      if (response.success && response.data?.users) {
        const users = response.data.users;
        // Map IUserPublic to Member
        const mappedMembers: Member[] = users
          .filter((u: IUserPublic) => {
            // Filter members based on logged-in user role
            if (!user) return false;

            // Lecturers only see students in their courses (simplified - show all students for now)
            if (user.role === Role.LECTURER) {
              return u.role === Role.STUDENT || u.role === Role.REP;
            }

            // Students/Reps see other students in their courses (simplified - show students)
            if (user.role === Role.REP || user.role === Role.STUDENT) {
              return u.role === Role.STUDENT || u.role === Role.REP;
            }

            // Admin/SystemAdmin/Staff/Owner see all
            return true;
          })
          .map((u: IUserPublic): Member => {
            // Map Role enum to Member role type
            const roleMap: Record<string, Member["role"]> = {
              [Role.STUDENT]: "student",
              [Role.REP]: "course_rep",
              [Role.LECTURER]: "lecturer",
              [Role.STAFF]: "staff",
              [Role.ADMIN]: "admin",
              [Role.SYSTEM_ADMIN]: "super_admin",
              [Role.OWNER]: "super_admin",
            };

            return {
              id: u.id,
              name: u.name,
              email: u.email,
              role: roleMap[u.role] || "student",
              department: undefined, // Department not available in current interfaces
              studentId: u.student?.studentId || u.staff?.staffNo,
              photoUrl: u.profilePicture || u.imageUrl || undefined,
              isMinor: false,
              createdAt: new Date(u.createdAt),
              status: u.isActive ? "active" : "inactive",
            };
          });
        setMembers(mappedMembers);
      } else {
        // Gracefully handle empty state
        setMembers([]);
      }
    } catch (error) {
      console.error("Failed to load members:", error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  // Load members on mount and when modals close
  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addModalOpen, deleteDialogOpen, editModalOpen]);

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

  const confirmRemovePrivilege = async () => {
    if (!selectedMember) return;

    // TODO: Implement remove course rep privilege via API
    // For now, show a placeholder message
    toast({
      title: "Feature Coming Soon",
      description:
        "Course rep privilege removal will be available once the API is integrated.",
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

  // Filter role options for lecturers - only show students and course reps
  const roleFilterOptions = isLecturer
    ? ROLE_FILTER_OPTIONS.filter(
        (option) =>
          option.value === "all" ||
          option.value === Role.STUDENT ||
          option.value === Role.REP,
      )
    : ROLE_FILTER_OPTIONS;

  // Map Role enum values to lowercase for comparison with Member.role
  const getRoleFilterValue = (filterValue: string): string[] => {
    if (filterValue === "all") return [];
    const roleMap: Record<string, string[]> = {
      [Role.STUDENT]: ["student", "course_rep"],
      [Role.REP]: ["course_rep"],
      [Role.LECTURER]: ["lecturer"],
      [Role.STAFF]: ["staff"],
      [Role.ADMIN]: ["admin"],
      [Role.SYSTEM_ADMIN]: ["super_admin"],
      [Role.OWNER]: ["super_admin"],
    };
    return roleMap[filterValue] || [filterValue];
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
          {canAddMembers && (
            <Button variant="outline" size="sm" className="sm:size-default">
              <Upload className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Import CSV</span>
            </Button>
          )}
          <Button variant="outline" size="sm" className="sm:size-default">
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
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
              {PLACEHOLDER_COURSES.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name}
                </SelectItem>
              ))}
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
              onEdit={isLecturer ? undefined : handleEditMember}
              onDelete={isLecturer ? undefined : handleDeleteMember}
              onViewAttendance={handleViewAttendance}
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
