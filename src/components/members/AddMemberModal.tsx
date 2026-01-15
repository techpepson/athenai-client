import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Camera, Upload, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addStudentUser, addStaffUserComplete } from '@/contexts/AuthContext';

interface AddMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddMemberModal = ({ open, onOpenChange }: AddMemberModalProps) => {
  const [isMinor, setIsMinor] = useState(false);
  const [captureMode, setCaptureMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'student' | 'staff'>('student');
  const [department, setDepartment] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let result;
    if (role === 'student') {
        // For mock purposes, using 'cs' as program if dept not set correctly for student schema
        result = addStudentUser(idNumber, email, name, department || 'cs', '1');
    } else {
        result = addStaffUserComplete(idNumber, email, name, department || 'cs');
    }

    if (result.success) {
        toast({
            title: 'Member Added',
            description: `${name} has been added successfully.`,
        });
        resetForm();
        onOpenChange(false);
    } else {
        toast({
            title: 'Error',
            description: result.error,
            variant: 'destructive',
        });
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setRole('student');
    setDepartment('');
    setIdNumber('');
    setIsMinor(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add New Member</DialogTitle>
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
              <p className="text-sm font-medium text-foreground">Profile Photo</p>
              <p className="text-xs text-muted-foreground">Add a photo for facial recognition</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCaptureMode(true)}>
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
              <Select value={role} onValueChange={(v: 'student' | 'staff') => setRole(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cs">Computer Science</SelectItem>
                  <SelectItem value="eng">Engineering</SelectItem>
                  <SelectItem value="bus">Business</SelectItem>
                  <SelectItem value="med">Medicine</SelectItem>
                  <SelectItem value="arts">Arts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentId">ID Number</Label>
              <Input 
                id="studentId" 
                placeholder="e.g., CS2024001" 
                required
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Minor Toggle */}
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
            <div>
              <p className="font-medium text-sm text-foreground">Is this member a minor?</p>
              <p className="text-xs text-muted-foreground">Parent/guardian contact will be required</p>
            </div>
            <Switch checked={isMinor} onCheckedChange={setIsMinor} />
          </div>

          {/* Guardian Info */}
          {isMinor && (
            <div className="space-y-4 p-4 bg-warning/5 border border-warning/20 rounded-lg animate-fade-in">
              <p className="font-medium text-sm text-foreground">Parent/Guardian Information</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guardianName">Guardian Name</Label>
                  <Input id="guardianName" placeholder="Enter name" required={isMinor} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardianEmail">Guardian Email</Label>
                  <Input id="guardianEmail" type="email" placeholder="email@example.com" required={isMinor} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="guardianPhone">Guardian Phone</Label>
                  <Input id="guardianPhone" type="tel" placeholder="+1 555-0100" required={isMinor} />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
