import { useState } from "react";
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
import { Camera, Upload, User, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  addStudentUser,
  addStaffUserComplete,
  addLecturerUserComplete,
  addAdminStaffUser,
  MOCK_DEPARTMENTS,
  MOCK_COURSES,
  MEMBER_ROLES,
  useAuth,
} from "@/contexts/AuthContext";
import { PhotoCapture } from "@/components/ui/PhotoCapture";

interface AddMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Role options imported from AuthContext

export const AddMemberModal = ({ open, onOpenChange }: AddMemberModalProps) => {
  const [isMinor, setIsMinor] = useState(false);
  const [captureMode, setCaptureMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"student" | "staff" | "lecturer" | "admin">(
    "student",
  );
  const [department, setDepartment] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [coursesTaught, setCoursesTaught] = useState<string[]>([]);
  const [coursesTaken, setCoursesTaken] = useState<string[]>([]);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [createdMemberName, setCreatedMemberName] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if current user is super_admin
  const isSuperAdmin = user?.role === "super_admin";

  const generateTempPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const tempPassword = generateTempPassword();
    let result;

    if (role === "student") {
      // For mock purposes, using 'cs' as program if dept not set correctly for student schema
      result = addStudentUser(
        idNumber,
        email,
        name,
        department || "",
        "1",
        coursesTaken,
        tempPassword,
      );
    } else if (role === "staff") {
      result = addStaffUserComplete(
        idNumber,
        email,
        name,
        department || "",
        coursesTaught,
        tempPassword,
      );
    } else if (role === "lecturer") {
      result = addLecturerUserComplete(
        idNumber,
        email,
        name,
        department || "",
        coursesTaught,
        tempPassword,
      );
    } else if (role === "admin") {
      // Only super_admin can create admin users
      if (!isSuperAdmin) {
        toast({
          title: "Access Denied",
          description: "Only super admins can create admin users.",
          variant: "destructive",
        });
        return;
      }
      result = addAdminStaffUser(idNumber, email, name, tempPassword);
    }

    if (result && result.success) {
      setCreatedMemberName(name);
      setGeneratedPassword(tempPassword);
      resetForm();
    } else if (result) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setRole("student");
    setDepartment("");
    setIdNumber("");
    setHourlyRate("");
    setIsMinor(false);
    setCoursesTaught([]);
    setCoursesTaken([]);
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
            <div className="flex items-center justify-center pb-4">
              <PhotoCapture
                onCapture={(data) => {
                  // Logic to handle captured data if needed elsewhere
                  console.log("Captured member photo");
                }}
                label="Profile Photo"
                description="Add a photo for facial recognition"
              />
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
                <Label htmlFor="role">Role</Label>
                <Select
                  value={role}
                  onValueChange={(v: typeof role) => setRole(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMBER_ROLES.filter(
                      (option) => option.value !== "admin" || isSuperAdmin,
                    ).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department/Program</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentId">ID Number</Label>
                <Input
                  id="studentId"
                  placeholder={
                    role === "student" ? "e.g., 123456" : "e.g., STF001"
                  }
                  required
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                />
              </div>
              {role === "lecturer" && (
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
              )}
            </div>

            {/* Courses for Student and Lecturer */}
            {(role === "lecturer" || role === "student") && (
              <div className="space-y-2">
                {role === "student" && (
                  <Label htmlFor="courses">Courses to Learn</Label>
                )}
                {role === "lecturer" && (
                  <Label htmlFor="courses">Courses to Teach</Label>
                )}

                <MultiSelect
                  options={MOCK_COURSES.filter(
                    (course) => !department || course.department === department,
                  ).map((course) => ({
                    label: course.name,
                    value: course.id,
                  }))}
                  selected={role === "student" ? coursesTaken : coursesTaught}
                  onChange={
                    role === "student" ? setCoursesTaken : setCoursesTaught
                  }
                  placeholder={
                    department ? "Select courses..." : "Select Department first"
                  }
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {role === "student"
                    ? "Select courses this student will take"
                    : "Select courses this lecturer will teach"}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient">
                Add Member
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
