import { useState, useEffect } from 'react';
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
import { toast } from 'sonner';
import { User, MOCK_COURSES } from '@/contexts/AuthContext';

interface CreateSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export const CreateSessionModal = ({ open, onOpenChange, user }: CreateSessionModalProps) => {
  const [selectedCourse, setSelectedCourse] = useState('');
  
  // Pre-fill for Course Rep
  useEffect(() => {
    if (open && user?.isCourseRep && user?.courseRepData && user.courseRepData.length > 0) {
        // Default to the first course assigned
        setSelectedCourse(user.courseRepData[0].courseId);
    }
  }, [open, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Logic would go here to actually create the session with selectedCourse/Dept
    toast.success('Session created successfully!');
    onOpenChange(false);
  };
  
  const isCourseRep = user?.isCourseRep;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create New Session</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sessionName">Session Name</Label>
            <Input id="sessionName" placeholder="e.g., Introduction to Programming" required />
          </div>

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
          
          {/* Course Selection */}
          <div className="space-y-2">
              <Label htmlFor="course">Course</Label>
              <Select 
                value={selectedCourse} 
                onValueChange={setSelectedCourse}
                disabled={isCourseRep}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                   {MOCK_COURSES.map(course => (
                       <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                   ))}
                </SelectContent>
              </Select>
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
