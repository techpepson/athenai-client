import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Camera, Upload, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  addStudentUser,
  addStaffUserComplete,
  addLecturerUserComplete,
  MOCK_DEPARTMENTS,
  MOCK_COURSES,
} from "@/contexts/AuthContext";

interface AddMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Role options
const ROLE_OPTIONS = [
  { label: "Student", value: "student" },
  { label: "Staff", value: "staff" },
  { label: "Lecturer", value: "lecturer" },
  { label: "Admin", value: "admin" },
] as const;

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
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let result;
    if (role === "student") {
      // For mock purposes, using 'cs' as program if dept not set correctly for student schema
      result = addStudentUser(
        idNumber,
        email,
        name,
        department || "cs",
        "1",
        coursesTaken.join(","),
      );
    } else if (role === "staff") {
      result = addStaffUserComplete(
        idNumber,
        email,
        name,
        department || "cs",
        coursesTaught,
      );
    } else if (role === "lecturer") {
      result = addLecturerUserComplete(
        idNumber,
        email,
        name,
        department || "cs",
        coursesTaught,
      );
    } else if (role === "admin") {
      // Add admin staff logic here (you'll need to create this function in AuthContext)
      toast({
        title: "Info",
        description: "Admin creation requires super admin privileges.",
        variant: "default",
      });
      return;
    }

    if (result && result.success) {
      toast({
        title: "Member Added",
        description: `${name} has been added successfully.`,
      });
      resetForm();
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Add New Member
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Section */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-xl bg-secondary flex items-center justify-center border-2 border-dashed border-border">
                <User className="w-10 h-10 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Profile Photo
              </p>
              <p className="text-xs text-muted-foreground">
                Add a photo for facial recognition
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCaptureMode(true)}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Capture
                </Button>
                <Button type="button" variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
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
              <Label htmlFor="role">Role</Label>
              <Select
                value={role}
                onValueChange={(v: typeof role) => setRole(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
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
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient">
              Add Member
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
