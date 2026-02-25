import { useState, useEffect } from "react";
import { Member } from "@/types/attendance";
import { Role } from "@/enums/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usersServices } from "@/services/users.services";
import { coursesService, Course } from "@/services/courses.services";
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
import { Loader2 } from "lucide-react";

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
  const { token, user } = useAuth();

  // Check if current user is admin/system admin to determine if they can edit other users
  const isAdminUser =
    user?.role === Role.ADMIN || user?.role === Role.SYSTEM_ADMIN;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [allCourses, setAllCourses] = useState<
    { label: string; value: string }[]
  >([]);
  const [fullCoursesData, setFullCoursesData] = useState<Course[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: Role.STUDENT as Role,
    department: "",
    studentId: "",
    lecturerId: "",
    staffId: "",
    hourlyRate: "",
    creditHours: "",
    isMinor: false,
    status: "active" as "active" | "inactive",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    coursesTaken: [] as string[],
    coursesTaught: [] as string[],
    courseRepCourses: [] as string[],
  });

  // Store original data for comparison
  const [originalData, setOriginalData] = useState(formData);

  const [roleAlertOpen, setRoleAlertOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<Role | null>(null);

  // Fetch all courses when modal opens
  useEffect(() => {
    if (open && member) {
      setIsLoadingCourses(true);
      coursesService
        .getAllCourses()
        .then((res) => {
          if (res.success && res.data?.data) {
            const courses = res.data.data;
            setFullCoursesData(courses);
            setAllCourses(
              courses.map((c) => ({
                label: `${c.title} (${c.code})`,
                value: c.code,
              })),
            );
          } else {
            setAllCourses([]);
            setFullCoursesData([]);
          }
        })
        .finally(() => setIsLoadingCourses(false));
    }
  }, [open, member]);

  useEffect(() => {
    if (member && fullCoursesData.length > 0) {
      // Extract courses for this member based on their role
      let memberCoursesTaken: string[] = [];
      let memberCoursesTaught: string[] = [];

      if (member.role === Role.STUDENT || member.role === Role.REP) {
        // Find courses where this student is enrolled
        // Check by member.id (userId) in enrollments
        memberCoursesTaken = fullCoursesData
          .filter((course) => {
            const enrollments = course.enrollments as
              | Array<{
                  studentId?: string;
                  student?: { userId?: string };
                }>
              | undefined;
            return enrollments?.some(
              (e) =>
                e.student?.userId === member.id ||
                e.studentId === member.studentId,
            );
          })
          .map((c) => c.code);
      } else if (member.role === Role.LECTURER) {
        // Find courses where this lecturer is teaching
        // Check by member.id (userId) in lecturers
        memberCoursesTaught = fullCoursesData
          .filter((course) => {
            const lecturers = course.lecturers as
              | Array<{
                  lecturerId?: string;
                  userId?: string;
                  user?: { id?: string };
                }>
              | undefined;
            return lecturers?.some(
              (l) => l.user?.id === member.id || l.userId === member.id,
            );
          })
          .map((c) => c.code);
      }

      const initialData = {
        name: member.name,
        email: member.email,
        phone: member.phone || "",
        role: member.role,
        department: member.department || "",
        studentId:
          member.role === Role.STUDENT || member.role === Role.REP
            ? member.studentId || ""
            : "",
        lecturerId: member.role === Role.LECTURER ? member.studentId || "" : "",
        staffId: member.role === Role.STAFF ? member.studentId || "" : "",
        hourlyRate: member.hourlyRate?.toString() || "",
        creditHours: member.creditHours?.toString() || "",
        isMinor: member.isMinor,
        status: member.status,
        parentName: member.parentContact?.name || "",
        parentEmail: member.parentContact?.email || "",
        parentPhone: member.parentContact?.phone || "",
        coursesTaken:
          memberCoursesTaken.length > 0
            ? memberCoursesTaken
            : member.coursesEnrolled || [],
        coursesTaught:
          memberCoursesTaught.length > 0
            ? memberCoursesTaught
            : member.coursesTaught || [],
        courseRepCourses: [],
      };
      setFormData(initialData);
      setOriginalData(initialData);
    } else if (member) {
      // Fallback when courses haven't loaded yet
      const initialData = {
        name: member.name,
        email: member.email,
        phone: member.phone || "",
        role: member.role,
        department: member.department || "",
        studentId:
          member.role === Role.STUDENT || member.role === Role.REP
            ? member.studentId || ""
            : "",
        lecturerId: member.role === Role.LECTURER ? member.studentId || "" : "",
        staffId: member.role === Role.STAFF ? member.studentId || "" : "",
        hourlyRate: member.hourlyRate?.toString() || "",
        creditHours: member.creditHours?.toString() || "",
        isMinor: member.isMinor,
        status: member.status,
        parentName: member.parentContact?.name || "",
        parentEmail: member.parentContact?.email || "",
        parentPhone: member.parentContact?.phone || "",
        coursesTaken: member.coursesEnrolled || [],
        coursesTaught: member.coursesTaught || [],
        courseRepCourses: [],
      };
      setFormData(initialData);
      setOriginalData(initialData);
    }
  }, [member, fullCoursesData]);

  if (!member) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Determine which fields changed for user details (name, phone, status)
      const userDetailsChanged =
        formData.name !== originalData.name ||
        formData.phone !== originalData.phone ||
        formData.status !== originalData.status ||
        formData.email !== originalData.email;

      // Determine which fields changed for records (studentId, lecturerId, staffId, courses, hourlyRate, creditHours)
      const recordsChanged =
        formData.studentId !== originalData.studentId ||
        formData.lecturerId !== originalData.lecturerId ||
        formData.staffId !== originalData.staffId ||
        formData.hourlyRate !== originalData.hourlyRate ||
        formData.creditHours !== originalData.creditHours ||
        JSON.stringify(formData.coursesTaken) !==
          JSON.stringify(originalData.coursesTaken) ||
        JSON.stringify(formData.coursesTaught) !==
          JSON.stringify(originalData.coursesTaught);

      let userUpdateSuccess = true;
      let recordsUpdateSuccess = true;

      // Call updateUserDetails if name or phone or status changed
      if (userDetailsChanged) {
        const userPayload: Record<string, string> = {};
        if (formData.name !== originalData.name) {
          userPayload.name = formData.name;
        }
        if (formData.phone && formData.phone !== originalData.phone) {
          userPayload.phone = formData.phone;
        }
        if (formData.status !== originalData.status) {
          // Convert to uppercase to match backend AccountStatus enum (ACTIVE, INACTIVE)
          userPayload.status = formData.status.toUpperCase();
        }

        // Always include the target user's email so the backend knows which user to update
        // This is critical - without this, the backend will update the admin's own record
        if (!formData.email) {
          toast.error("Target user email is missing");
          setIsSubmitting(false);
          return;
        }
        userPayload.email = formData.email;

        console.log(
          "User details payload being sent:",
          JSON.stringify(userPayload, null, 2),
        );
        console.log("Target member email:", formData.email);
        console.log("Current user (admin) role:", user?.role);

        const response = await usersServices.updateUserDetails(userPayload);
        console.log("Update user details response:", response);
        if (!response.success) {
          toast.error(response.error || "Could not update user details");
          userUpdateSuccess = false;
        }
      }

      // Call updateRecords if role-specific fields changed
      if (recordsChanged && token) {
        const recordsPayload: Record<string, string | string[] | number> = {};

        if (member.role === Role.STUDENT || member.role === Role.REP) {
          if (formData.studentId !== originalData.studentId) {
            recordsPayload.studentId = formData.studentId;
          }
          if (
            JSON.stringify(formData.coursesTaken) !==
            JSON.stringify(originalData.coursesTaken)
          ) {
            recordsPayload.courses = formData.coursesTaken;
          }
        } else if (member.role === Role.LECTURER) {
          if (formData.lecturerId !== originalData.lecturerId) {
            recordsPayload.lecturerId = formData.lecturerId;
          }
          if (formData.hourlyRate !== originalData.hourlyRate) {
            recordsPayload.lecturerHourlyRate =
              parseFloat(formData.hourlyRate) || 0;
          }
          if (formData.creditHours !== originalData.creditHours) {
            recordsPayload.lecturerCreditHours =
              parseInt(formData.creditHours) || 0;
          }
          if (
            JSON.stringify(formData.coursesTaught) !==
            JSON.stringify(originalData.coursesTaught)
          ) {
            recordsPayload.courses = formData.coursesTaught;
          }
        } else if (member.role === Role.STAFF) {
          if (formData.staffId !== originalData.staffId) {
            recordsPayload.staffId = formData.staffId;
          }
        }

        if (Object.keys(recordsPayload).length > 0) {
          // Always include the target user's email so the backend knows which user's records to update
          // This is needed when admin/system admin is editing another user's records
          recordsPayload.email = formData.email;

          console.log("Records payload:", recordsPayload);
          const response = await usersServices.updateRecords(
            recordsPayload,
            token,
          );
          console.log("Update records response:", response);
          if (!response.success) {
            toast.error(response.error || "Could not update records");
            recordsUpdateSuccess = false;
          }
        }
      }

      if (userUpdateSuccess && recordsUpdateSuccess) {
        const updatedMember: Member = {
          ...member,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          studentId:
            member.role === Role.STUDENT || member.role === Role.REP
              ? formData.studentId
              : member.role === Role.LECTURER
                ? formData.lecturerId
                : formData.staffId || undefined,
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
      }
    } catch (error) {
      toast.error("Failed to update member");
    } finally {
      setIsSubmitting(false);
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
                disabled
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                title="Email cannot be changed"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                disabled
                value={formData.role}
                onValueChange={(value) => {
                  const newRole = value as Role;
                  if (
                    (member.role === Role.REP && newRole === Role.STUDENT) ||
                    (member.role === Role.ADMIN && newRole === Role.STAFF)
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
                  {member.role === Role.STUDENT || member.role === Role.REP ? (
                    <>
                      <SelectItem value={Role.STUDENT}>Student</SelectItem>
                      <SelectItem value={Role.REP}>Level Rep</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value={Role.STAFF}>Staff</SelectItem>
                      <SelectItem value={Role.ADMIN}>Admin</SelectItem>
                      <SelectItem value={Role.LECTURER}>Lecturer</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Student ID for students/reps */}
            {(member.role === Role.STUDENT || member.role === Role.REP) && (
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID</Label>
                <Input
                  id="studentId"
                  value={formData.studentId}
                  onChange={(e) =>
                    setFormData({ ...formData, studentId: e.target.value })
                  }
                  placeholder="e.g., STU2024001"
                />
              </div>
            )}

            {/* Lecturer ID for lecturers */}
            {member.role === Role.LECTURER && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="lecturerId">Lecturer ID</Label>
                  <Input
                    id="lecturerId"
                    value={formData.lecturerId}
                    onChange={(e) =>
                      setFormData({ ...formData, lecturerId: e.target.value })
                    }
                    placeholder="e.g., LEC2024001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Rate (GHS)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    value={formData.hourlyRate}
                    onChange={(e) =>
                      setFormData({ ...formData, hourlyRate: e.target.value })
                    }
                    placeholder="e.g., 50.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="creditHours">Credit Hours</Label>
                  <Input
                    id="creditHours"
                    type="number"
                    value={formData.creditHours}
                    onChange={(e) =>
                      setFormData({ ...formData, creditHours: e.target.value })
                    }
                    placeholder="e.g., 12"
                  />
                </div>
              </>
            )}

            {/* Staff ID for staff */}
            {member.role === Role.STAFF && (
              <div className="space-y-2">
                <Label htmlFor="staffId">Staff ID</Label>
                <Input
                  id="staffId"
                  value={formData.staffId}
                  onChange={(e) =>
                    setFormData({ ...formData, staffId: e.target.value })
                  }
                  placeholder="e.g., STF2024001"
                />
              </div>
            )}

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

          {/* Courses for Student */}
          {(formData.role === Role.STUDENT || formData.role === Role.REP) && (
            <div className="space-y-2">
              <Label>Courses Registered</Label>
              {isLoadingCourses ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading courses...
                </div>
              ) : allCourses.length > 0 ? (
                <MultiSelect
                  options={allCourses}
                  selected={formData.coursesTaken}
                  onChange={(courses) =>
                    setFormData({ ...formData, coursesTaken: courses })
                  }
                  placeholder="Select courses"
                />
              ) : (
                <p className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
                  No courses available
                </p>
              )}
            </div>
          )}

          {/* Courses for Lecturer */}
          {formData.role === Role.LECTURER && (
            <div className="space-y-2">
              <Label>Courses Teaching</Label>
              {isLoadingCourses ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading courses...
                </div>
              ) : allCourses.length > 0 ? (
                <MultiSelect
                  options={allCourses}
                  selected={formData.coursesTaught}
                  onChange={(courses) =>
                    setFormData({ ...formData, coursesTaught: courses })
                  }
                  placeholder="Select courses"
                />
              ) : (
                <p className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
                  No courses available
                </p>
              )}
            </div>
          )}

          {/* Courses for Level Rep */}
          {formData.role === Role.REP && (
            <div className="space-y-2">
              <Label>Courses Assigned as Rep</Label>
              <p className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
                Level rep assignments are managed separately via the
                assign/remove rep feature.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <AlertDialog open={roleAlertOpen} onOpenChange={setRoleAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingRole === Role.STUDENT
                ? "Warning: Changing Level Rep to Student"
                : "Warning: Changing Admin to Staff"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRole === Role.STUDENT
                ? "Check this box if you want to proceed. This action will cause the student to lose all level rep privileges, including all assigned courses."
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
                    courseRepCourses: [],
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
