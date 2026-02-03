import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MultiSelect } from "@/components/ui/multi-select";
import { useAuth } from "@/contexts/AuthContext";
import { DEPARTMENTS, MEMBER_ROLES } from "@/constants/appConstants";
import { coursesService } from "@/services/courses.services";
import { Role } from "@/enums/enums";
import { PhotoCapture } from "@/components/ui/PhotoCapture";
import { usersServices } from "@/services/users.services";
import { EmptyState } from "@/components/ui/EmptyState";

interface AddMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Role options imported from constants

export const AddMemberModal = ({ open, onOpenChange }: AddMemberModalProps) => {
  const [staffId, setStaffId] = useState("");
  const [lecturerCreditHours, setLecturerCreditHours] = useState("");
  const [allCourses, setAllCourses] = useState<
    { label: string; value: string }[]
  >([]);
  const [isCoursesLoading, setIsCoursesLoading] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [captureMode, setCaptureMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(Role.LECTURER);
  const [idNumber, setIdNumber] = useState(""); // Used for studentId, staffId, lecturerId
  const [hourlyRate, setHourlyRate] = useState("");
  const [courses, setCourses] = useState<string[]>([]);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [createdMemberName, setCreatedMemberName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<File[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if current user can add admins
  const canAddAdmin =
    user?.role === Role.OWNER || user?.role === Role.SYSTEM_ADMIN;

  // Fetch all courses when role is LECTURER or STUDENT
  useEffect(() => {
    if (role === Role.LECTURER || role === Role.STUDENT) {
      setIsCoursesLoading(true);
      coursesService.getAllCourses().then((res) => {
        if (res.success && res.data?.data) {
          setAllCourses(
            res.data.data.map((c) => ({ label: c.title, value: c.code })),
          );
        } else {
          setAllCourses([]);
        }
        setIsCoursesLoading(false);
      });
    } else {
      setAllCourses([]);
    }
  }, [role]);

  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Only admins can create admin users
      if (role === Role.ADMIN && !canAddAdmin) {
        toast({
          title: "Access Denied",
          description: "Only system admins can create admin users.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Check if 3 photos are captured
      if (capturedPhotos.length < 3) {
        toast({
          title: "Photo Required",
          description: "Please capture 3 photos for facial recognition.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Build payload based on role
      const payload: any = {
        fullName: name,
        email,
        phone,
        role,
      };
      if (role === Role.STUDENT) {
        payload.studentId = idNumber;
        payload.courses = courses;
      } else if (role === Role.LECTURER) {
        payload.lecturerId = idNumber;
        payload.staffId = staffId;
        payload.lecturerHourlyRate = parseFloat(hourlyRate) || 0;
        payload.lecturerCreditHours = parseInt(lecturerCreditHours) || 0;
        payload.courses = courses;
      } else if (role === Role.STAFF) {
        payload.staffId = staffId;
      }
      const response = await usersServices.enrollUser(payload, capturedPhotos);

      if (response.success) {
        setCreatedMemberName(name);
        // Use the tempPassword returned from the server
        if (response.data?.tempPassword) {
          setGeneratedPassword(response.data.tempPassword);
        }
        console.log("Member created:", response.data);
        console.log(payload);
        resetForm();
        toast({
          title: "Success",
          description: `${name} has been added successfully.`,
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to add member",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add member",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setRole(Role.LECTURER);
    // department removed
    setIdNumber("");
    setHourlyRate("");
    setLecturerCreditHours("");
    setStaffId("");
    setIsMinor(false);
    setCourses([]);
    setCapturedPhotos([]);
  };

  const closeModal = () => {
    resetForm();
    setGeneratedPassword("");
    setCreatedMemberName("");
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={closeModal}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {generatedPassword
              ? "Member Created Successfully"
              : "Add New Member"}
          </DialogTitle>
        </DialogHeader>

        {generatedPassword ? (
          <div className="space-y-4">
            <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
              <p className="text-sm text-success font-medium mb-2">
                {createdMemberName} has been added successfully!
              </p>
              <p className="text-sm text-muted-foreground">
                Share this temporary password with the new member. They must
                change it on first login.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Temporary Password</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedPassword}
                  readOnly
                  className="font-mono"
                />
                <Button variant="outline" size="icon" onClick={copyPassword}>
                  {copied ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="gradient" onClick={closeModal}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Section */}
            <div className="flex flex-col items-center justify-center pb-4">
              <PhotoCapture
                onCapture={(imageData) => {
                  if (imageData && capturedPhotos.length < 3) {
                    fetch(imageData)
                      .then((res) => res.blob())
                      .then((blob) => {
                        const file = new File(
                          [blob],
                          `face-photo-${capturedPhotos.length + 1}.jpg`,
                          {
                            type: "image/jpeg",
                          },
                        );
                        setCapturedPhotos((prev) => {
                          const arr = [...prev, file];
                          return arr.slice(0, 3);
                        });
                      });
                  }
                }}
                label={`Profile Photos (${capturedPhotos.length}/3)`}
                description="Capture 3 photos for facial recognition (required)"
              />
              <div className="flex gap-2 mt-2">
                {[...Array(3)].map((_, idx) => (
                  <span
                    key={idx}
                    className={`text-xs px-2 py-1 rounded border ${
                      idx < capturedPhotos.length
                        ? "bg-success/20 border-success text-success"
                        : "bg-muted border-muted-foreground text-muted-foreground"
                    }`}
                  >
                    {idx < capturedPhotos.length ? `Photo ${idx + 1}` : `Empty`}
                  </span>
                ))}
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter phone number"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password (optional)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Leave empty for auto-generated"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(v: Role) => setRole(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {([...MEMBER_ROLES] as { value: Role; label: string }[])
                      .filter((option) => option.value !== Role.STUDENT)
                      .filter((option) => {
                        // Only system admin or owner can add admin
                        if (option.value === Role.ADMIN) {
                          return canAddAdmin;
                        }
                        // System admin can add staff, lecturer, admin
                        if (user?.role === Role.SYSTEM_ADMIN) {
                          return (
                            option.value === Role.STAFF ||
                            option.value === Role.LECTURER ||
                            option.value === Role.ADMIN
                          );
                        }
                        // Owner can add all except student
                        if (user?.role === Role.OWNER) {
                          return true;
                        }
                        // Default: allow staff and lecturer
                        return (
                          option.value === Role.STAFF ||
                          option.value === Role.LECTURER
                        );
                      })
                      .map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Department/Program removed */}
              {role === Role.STUDENT && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="studentId">Student ID Number</Label>
                    <Input
                      id="studentId"
                      type="text"
                      placeholder="Enter student ID number"
                      required
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Courses Offered</Label>
                    {isCoursesLoading ? (
                      <div className="text-sm text-muted-foreground">
                        Loading courses...
                      </div>
                    ) : allCourses.length > 0 ? (
                      <MultiSelect
                        options={allCourses}
                        selected={courses}
                        onChange={setCourses}
                        placeholder="Select courses"
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No courses available
                      </div>
                    )}
                  </div>
                </>
              )}
              {(role === Role.STAFF || role === Role.LECTURER) && (
                <div className="space-y-2">
                  <Label
                    htmlFor={role === Role.STAFF ? "staffId" : "lecturerId"}
                  >
                    {role === Role.STAFF
                      ? "Staff ID Number"
                      : "Lecturer ID Number"}
                  </Label>
                  <Input
                    id={role === Role.STAFF ? "staffId" : "lecturerId"}
                    type="text"
                    placeholder={
                      role === Role.STAFF
                        ? "Enter staff ID number"
                        : "Enter lecturer ID number"
                    }
                    required
                    value={role === Role.STAFF ? staffId : idNumber}
                    onChange={(e) => {
                      if (role === Role.STAFF) {
                        setStaffId(e.target.value);
                      } else {
                        setIdNumber(e.target.value);
                      }
                    }}
                  />
                </div>
              )}
              {role === Role.LECTURER && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Hourly Rate</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      placeholder="e.g., 50"
                      required
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lecturerCreditHours">Credit Hours</Label>
                    <Input
                      id="lecturerCreditHours"
                      type="number"
                      placeholder="e.g., 12"
                      required
                      value={lecturerCreditHours}
                      onChange={(e) => setLecturerCreditHours(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Courses to Teach</Label>
                    {isCoursesLoading ? (
                      <div className="text-sm text-muted-foreground">
                        Loading courses...
                      </div>
                    ) : allCourses.length > 0 ? (
                      <MultiSelect
                        options={allCourses}
                        selected={courses}
                        onChange={setCourses}
                        placeholder="Select courses"
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No courses available
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="gradient" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Member"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
