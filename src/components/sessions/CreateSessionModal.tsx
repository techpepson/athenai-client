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
import { User, MOCK_COURSES } from "@/contexts/AuthContext";
import { AttendanceSession } from "@/types/attendance";

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
  useEffect(() => {
    if (open) {
      // Course rep: default to first assigned course
      if (
        user?.isCourseRep &&
        user?.courseRepData &&
        user.courseRepData.length > 0
      ) {
        setSelectedCourse(user.courseRepData[0].courseId);
      }
      // Lecturer: default to first course they teach if only one
      else if (user?.role === "lecturer" && user.coursesTaught) {
        const coursesTaught = Array.isArray(user.coursesTaught)
          ? user.coursesTaught
          : [user.coursesTaught];
        if (coursesTaught.length === 1) {
          setSelectedCourse(coursesTaught[0]);
        }
      }
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

    const course = MOCK_COURSES.find((c) => c.id === selectedCourse);

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
      createdByRole: user?.role,
    };

    if (onCreateSession) {
      onCreateSession(newSession);
    }

    toast.success("Session created successfully!");
    onOpenChange(false);
  };

  const isCourseRep = user?.isCourseRep;

  // Get available courses based on user role
  const getAvailableCourses = () => {
    // Super admin and admin can see all courses
    if (user?.role === "super_admin" || user?.role === "admin") {
      return MOCK_COURSES;
    }

    // Lecturers can only see courses they teach
    if (user?.role === "lecturer" && user.coursesTaught) {
      const coursesTaught = Array.isArray(user.coursesTaught)
        ? user.coursesTaught
        : [user.coursesTaught];
      return MOCK_COURSES.filter((course) => coursesTaught.includes(course.id));
    }

    // Course reps can only see courses they're assigned to
    if (user?.isCourseRep && user.courseRepData) {
      const courseRepCourseIds = user.courseRepData.map((c) => c.courseId);
      return MOCK_COURSES.filter((course) =>
        courseRepCourseIds.includes(course.id),
      );
    }

    return [];
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
