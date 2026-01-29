import { useState, useEffect } from "react";
import { Member } from "@/types/attendance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usersServices } from "@/services/users.services";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
  onSave?: (member: Member) => void;
}

export const EditMemberModal = ({
  open,
  onOpenChange,
  member,
  onSave,
}: EditMemberModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "student" as Member["role"],
    department: "",
    studentId: "",
    isMinor: false,
    status: "active" as "active" | "inactive",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    coursesTaken: [] as string[],

    coursesTaught: [] as string[],
    courseRepCourses: [] as string[],
  });

  const [roleAlertOpen, setRoleAlertOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<Member["role"] | null>(null);

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name,
        email: member.email,
        role: member.role,
        department: member.department || "",
        studentId: member.studentId || "",
        isMinor: member.isMinor,
        status: member.status,
        parentName: member.parentContact?.name || "",
        parentEmail: member.parentContact?.email || "",
        parentPhone: member.parentContact?.phone || "",
        coursesTaken: [],
        coursesTaught: [],
        courseRepCourses: [],
      });
    }
  }, [member]);

  if (!member) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await usersServices.updateUserDetails({
        fullName: formData.name,
        email: formData.email,
      });

      if (!response.success) {
        toast.error(response.error || "Could not update member");
        return;
      }

      const updatedMember: Member = {
        ...member,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department,
        studentId: formData.studentId || undefined,
        isMinor: formData.isMinor,
        status: formData.status,
        parentContact: formData.isMinor
          ? {
              name: formData.parentName,
              email: formData.parentEmail,
              phone: formData.parentPhone,
            }
          : undefined,
      };

      onSave?.(updatedMember);
      toast.success("Member updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update member");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {member.photoUrl ? (
              <img
                src={member.photoUrl}
                alt={member.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                <span className="text-sm font-bold text-primary-foreground">
                  {member.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
              </div>
            )}
            Edit Member
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => {
                  const newRole = value as Member["role"];
                  if (
                    (member.role === "course_rep" && newRole === "student") ||
                    (member.role === "admin" && newRole === "staff")
                  ) {
                    setPendingRole(newRole);
                    setRoleAlertOpen(true);
                  } else {
                    setFormData({ ...formData, role: newRole });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {member.role === "student" || member.role === "course_rep" ? (
                    // Student can only be student or course_rep
                    <>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="course_rep">Course Rep</SelectItem>
                    </>
                  ) : (
                    // Other roles can access all roles except student/course_rep
                    <>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="lecturer">Lecturer</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="studentId">Student/Staff ID</Label>
              <Input
                id="studentId"
                value={formData.studentId}
                onChange={(e) =>
                  setFormData({ ...formData, studentId: e.target.value })
                }
                placeholder="e.g., CS2024001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "active" | "inactive") =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Courses for Student and Lecturer - TODO: Fetch from API */}
          {(formData.role === "lecturer" || formData.role === "student") && (
            <div className="space-y-2">
              {formData.role === "student" && (
                <Label htmlFor="courses">Courses Registered</Label>
              )}
              {formData.role === "lecturer" && (
                <Label htmlFor="courses">Courses Teaching</Label>
              )}

              <p className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
                Course management will be available once connected to the course
                API.
              </p>
            </div>
          )}

          {/* Courses for Course Rep - TODO: Fetch from API */}
          {formData.role === "course_rep" && (
            <div className="space-y-2">
              <Label htmlFor="courseRepCourses">Courses Assigned as Rep</Label>
              <p className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
                Course rep assignment will be available once connected to the
                course API.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient">
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <AlertDialog open={roleAlertOpen} onOpenChange={setRoleAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingRole === "student"
                ? "Warning: Changing Course Rep to Student"
                : "Warning: Changing Admin to Staff"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRole === "student"
                ? "Check this box if you want to proceed. This action will cause the student to lose all course rep privileges, including all assigned courses."
                : "Check this box if you want to proceed. This action will cause the admin to lose all admin privileges."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingRole(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingRole) {
                  setFormData({
                    ...formData,
                    role: pendingRole,
                    courseRepCourses: [], // Clear assigned courses
                  });
                  setPendingRole(null);
                }
              }}
            >
              Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
