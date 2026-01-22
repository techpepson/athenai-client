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
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadMembers();
  }, [addModalOpen, deleteDialogOpen, editModalOpen]);

  const loadMembers = () => {
    const users = getAllUsers();
    // Map User to Member
    const mappedMembers: Member[] = users.map((u) => {
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
    setDeleteDialogOpen(true);
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
            {ROLE_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.label} value={option.value}>
                {option.value.charAt(0).toUpperCase() + option.value.slice(1)}
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
            onEdit={handleEditMember}
            onDelete={handleDeleteMember}
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
    </div>
  );
};

export default Members;
