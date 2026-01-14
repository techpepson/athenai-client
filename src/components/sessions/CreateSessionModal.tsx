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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { LogIn, LogOut } from 'lucide-react';

interface CreateSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateSessionModal = ({ open, onOpenChange }: CreateSessionModalProps) => {
  const [attendanceType, setAttendanceType] = useState<'checkin' | 'checkout'>('checkin');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`${attendanceType === 'checkin' ? 'Check-in' : 'Check-out'} session created successfully!`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create New Session</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Attendance Type Selection */}
          <div className="space-y-3">
            <Label>Attendance Type</Label>
            <RadioGroup
              value={attendanceType}
              onValueChange={(value) => setAttendanceType(value as 'checkin' | 'checkout')}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem value="checkin" id="checkin" className="peer sr-only" />
                <Label
                  htmlFor="checkin"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-border bg-card p-4 hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 cursor-pointer transition-all"
                >
                  <LogIn className="mb-2 h-6 w-6 text-success" />
                  <span className="font-medium">Check-in</span>
                  <span className="text-xs text-muted-foreground">Track arrivals</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="checkout" id="checkout" className="peer sr-only" />
                <Label
                  htmlFor="checkout"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-border bg-card p-4 hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 cursor-pointer transition-all"
                >
                  <LogOut className="mb-2 h-6 w-6 text-warning" />
                  <span className="font-medium">Check-out</span>
                  <span className="text-xs text-muted-foreground">Track departures</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessionName">Session Name</Label>
            <Input id="sessionName" placeholder="e.g., Introduction to Programming" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sessionType">Session Type</Label>
              <Select defaultValue="class">
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="class">Class</SelectItem>
                  <SelectItem value="exam">Examination</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="shift">Work Shift</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="cs">Computer Science</SelectItem>
                  <SelectItem value="eng">Engineering</SelectItem>
                  <SelectItem value="bus">Business</SelectItem>
                  <SelectItem value="med">Medicine</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" placeholder="e.g., Room 101, Building A" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input id="startTime" type="datetime-local" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input id="endTime" type="datetime-local" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedCount">Expected Attendees</Label>
            <Input id="expectedCount" type="number" placeholder="e.g., 45" min="1" required />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient">
              Create Session
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
