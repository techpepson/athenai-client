import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { User } from "@/contexts/AuthContext";
import { AttendanceSession } from "@/types/attendance";
import { Role } from "@/enums/enums";

// Placeholder courses until API is integrated
const PLACEHOLDER_COURSES = [
  { id: "cs101", name: "Introduction to Computer Science", department: "cs" },
  { id: "cs201", name: "Data Structures", department: "cs" },
  { id: "cs301", name: "Algorithms", department: "cs" },
];

interface CreateSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onCreateSession?: (session: AttendanceSession) => void;
}

export const CreateSessionModal = ({
  open,
  onOpenChange,
  user,
  onCreateSession,
}: CreateSessionModalProps) => {
  const [selectedCourse, setSelectedCourse] = useState("");
  const [sessionType, setSessionType] = useState<
    "class" | "exam" | "event" | "shift"
  >("class");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [expectedCount, setExpectedCount] = useState("");

  // Pre-fill for Course Rep or Lecturer with single course
  // TODO: Implement course pre-fill once course data is available from API
  useEffect(() => {
    if (open) {
      // Course pre-fill will be implemented when course API is integrated
      // For now, users must manually select their course
    }
  }, [open, user]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedCourse("");
      setSessionType("class");
      setLocation("");
      setStartTime("");
      setEndTime("");
      setExpectedCount("");
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const course = PLACEHOLDER_COURSES.find((c) => c.id === selectedCourse);

    const newSession: AttendanceSession = {
      id: `session-${Date.now()}`,
      name: course?.name || "New Session",
      type: sessionType,
      attendanceType: "checkin",
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: new Date(startTime) <= new Date() ? "active" : "scheduled",
      location: location || undefined,
      expectedCount: parseInt(expectedCount) || 0,
      presentCount: 0,
      courseId: selectedCourse,
      courseName: course?.name,
      createdBy: user?.id,
      createdByRole:
        user?.role?.toLowerCase() as AttendanceSession["createdByRole"],
    };

    if (onCreateSession) {
      onCreateSession(newSession);
    }

    toast.success("Session created successfully!");
    onOpenChange(false);
  };

  const isCourseRep = false; // TODO: Check from user roles

  // Get available courses based on user role - using placeholder for now
  const getAvailableCourses = () => {
    return PLACEHOLDER_COURSES;
  };

  const availableCourses = getAvailableCourses();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Create New Session
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Course Selection */}
          <div className="space-y-2">
            <Label htmlFor="course">Course</Label>
            <Select
              value={selectedCourse}
              onValueChange={setSelectedCourse}
              disabled={availableCourses.length <= 1}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {availableCourses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessionType">Session Type</Label>
            <Select
              value={sessionType}
              onValueChange={(value: "class" | "exam" | "event" | "shift") =>
                setSessionType(value)
              }
            >
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
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., Room 101, Building A"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="datetime-local"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedCount">Expected Attendees</Label>
            <Input
              id="expectedCount"
              type="number"
              placeholder="e.g., 45"
              min="1"
              required
              value={expectedCount}
              onChange={(e) => setExpectedCount(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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
