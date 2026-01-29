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
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MultiSelect } from "@/components/ui/multi-select";
import { useAuth } from "@/contexts/AuthContext";
import { DEPARTMENTS, MEMBER_ROLES } from "@/constants/appConstants";
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
  const [isMinor, setIsMinor] = useState(false);
  const [captureMode, setCaptureMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(Role.STUDENT);
  const [department, setDepartment] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [courses, setCourses] = useState<string[]>([]);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [createdMemberName, setCreatedMemberName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if current user can add admins
  const canAddAdmin =
    user?.role === Role.OWNER || user?.role === Role.SYSTEM_ADMIN;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const tempPassword = password || generateTempPassword();

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

      // Check if photo is captured
      if (!capturedPhoto) {
        toast({
          title: "Photo Required",
          description: "Please capture a photo for facial recognition.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const response = await usersServices.enrollUser(
        {
          fullName: name,
          email,
          phone,
          password: tempPassword,
          role,
        },
        capturedPhoto,
      );

      if (response.success) {
        setCreatedMemberName(name);
        setGeneratedPassword(tempPassword);
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
    setRole(Role.STUDENT);
    setDepartment("");
    setIdNumber("");
    setHourlyRate("");
    setIsMinor(false);
    setCourses([]);
    setCapturedPhoto(null);
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
                onCapture={(imageData) => {
                  if (imageData) {
                    // Convert base64 to File
                    fetch(imageData)
                      .then((res) => res.blob())
                      .then((blob) => {
                        const file = new File([blob], "face-photo.jpg", {
                          type: "image/jpeg",
                        });
                        setCapturedPhoto(file);
                      });
                  } else {
                    setCapturedPhoto(null);
                  }
                }}
                label="Profile Photo"
                description="Add a photo for facial recognition (required)"
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
                    {MEMBER_ROLES.filter(
                      (option) => option.value !== Role.ADMIN || canAddAdmin,
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
                    {DEPARTMENTS.length > 0 ? (
                      DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept.value} value={dept.value}>
                          {dept.label}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">
                        No departments available
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {role === Role.LECTURER && (
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
