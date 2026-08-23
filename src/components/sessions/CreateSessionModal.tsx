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
import { Loader2 } from "lucide-react";
import { coursesService } from "@/services/courses.services";
import {
  createSession,
  SessionType,
  SessionMode,
  CreateSessionPayload,
} from "@/services/sessions.service";

interface Course {
  id: string;
  code: string;
  title: string;
}

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
  const [sessionName, setSessionName] = useState("");
  const [sessionType, setSessionType] = useState<SessionType>(
    SessionType.CLASS,
  );
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [duration, setDuration] = useState("60"); // Default: 60 minutes (1 Hour)
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLecturer = user?.role === Role.LECTURER;
  const isRep = user?.role === Role.REP;
  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SYSTEM_ADMIN;

  // Fetch courses depending on role
  useEffect(() => {
    if (open) {
      setIsLoadingCourses(true);
      if (isLecturer) {
        coursesService
          .getLecturerCourses()
          .then((res) => {
            if (res.success && res.data?.data) {
              setCourses(res.data.data);
            } else {
              setCourses([]);
            }
          })
          .catch((error) => {
            console.error("Failed to load lecturer courses:", error);
            setCourses([]);
          })
          .finally(() => setIsLoadingCourses(false));
      } else if (isRep) {
        coursesService
          .getRepCourses()
          .then((res) => {
            if (res.success && res.data?.data) {
              setCourses(res.data.data);
            } else {
              setCourses([]);
            }
          })
          .catch((error) => {
            console.error("Failed to load rep courses:", error);
            setCourses([]);
          })
          .finally(() => setIsLoadingCourses(false));
      } else if (isAdmin) {
        coursesService
          .getAllCourses()
          .then((res) => {
            if (res.success && res.data?.data) {
              setCourses(res.data.data);
            } else {
              setCourses([]);
            }
          })
          .catch((error) => {
            console.error("Failed to load all courses:", error);
            setCourses([]);
          })
          .finally(() => setIsLoadingCourses(false));
      } else {
        setIsLoadingCourses(false);
      }
    }
  }, [open, isLecturer, isRep, isAdmin]);

  // Auto-calculate end time from start time and duration
  useEffect(() => {
    if (startTime && duration) {
      const start = new Date(startTime);
      const end = new Date(start.getTime() + parseInt(duration) * 60 * 1000);
      const offset = end.getTimezoneOffset();
      const localEnd = new Date(end.getTime() - offset * 60 * 1000);
      setEndTime(localEnd.toISOString().slice(0, 16));
    }
  }, [startTime, duration]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedCourse("");
      setSessionName("");
      setSessionType(SessionType.CLASS);
      setLocation("");
      setStartTime("");
      setEndTime("");
      setIsOnline(false);
      setDuration("60");
    }
  }, [open]);

  // Get token from localStorage
  const getToken = (): string | null => {
    return localStorage.getItem("accessToken");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = getToken();
    if (!token) {
      toast.error("You must be logged in to create a session");
      return;
    }

    if (!selectedCourse) {
      toast.error("Please select a course");
      return;
    }

    if (!sessionName.trim()) {
      toast.error("Please enter a session name");
      return;
    }

    if (!startTime || !endTime) {
      toast.error("Please set start and end times");
      return;
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (endDate <= startDate) {
      toast.error("End time must be after start time");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateSessionPayload = {
        name: sessionName,
        type: sessionType,
        mode: SessionMode.CHECK_IN,
        location: isOnline ? "Online Class" : (location || undefined),
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        isOnline: isOnline,
        courseId: selectedCourse,
      };

      const response = await createSession(payload, token);

      if (response.success && response.data) {
        const course = courses.find((c) => c.id === selectedCourse);

        // Create local session object for immediate UI update
        const newSession: AttendanceSession = {
          id: response.data.data?.id || `session-${Date.now()}`,
          name: sessionName,
          type:
            sessionType === SessionType.CLASS
              ? "class"
              : sessionType === SessionType.EXAM
                ? "exam"
                : sessionType === SessionType.EVENT
                  ? "event"
                  : "shift",
          attendanceType: "checkin",
          startTime: startDate,
          endTime: endDate,
          status: startDate <= new Date() ? "active" : "scheduled",
          location: isOnline ? "Online Class" : (location || undefined),
          expectedCount: 0,
          presentCount: 0,
          courseId: selectedCourse || undefined,
          courseName: course?.title || undefined,
          createdBy: user?.id,
          createdByRole: user?.role,
        };

        if (onCreateSession) {
          onCreateSession(newSession);
        }

        toast.success("Session created successfully!");
        onOpenChange(false);
      } else {
        toast.error(response.error || "Failed to create session");
      }
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Failed to create session");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Create New Session
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Session Name */}
          <div className="space-y-2">
            <Label htmlFor="sessionName">Session Name</Label>
            <Input
              id="sessionName"
              placeholder="e.g., Week 5 Lecture"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              required
            />
          </div>

          {/* Course Selection */}
          {(isLecturer || isRep || isAdmin) && (
            <div className="space-y-2">
              <Label htmlFor="course">Course</Label>
              {isLoadingCourses ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading courses...
                </div>
              ) : (
                <Select
                  value={selectedCourse}
                  onValueChange={setSelectedCourse}
                  required
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isLecturer
                          ? "Select a course you teach"
                          : isRep
                            ? "Select a course you represent"
                            : "Select a course"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.length > 0 ? (
                      courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.code} - {course.title}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        {isLecturer
                          ? "No courses assigned to you"
                          : isRep
                            ? "No represented courses found"
                            : "No courses found"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
              {courses.length === 0 && !isLoadingCourses && (
                <p className="text-xs text-destructive">
                  {isLecturer
                    ? "You need to be assigned to courses before creating sessions."
                    : isRep
                      ? "You are not assigned as a representative for any courses."
                      : "No courses found in system."}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="sessionType">Session Type</Label>
            <Select
              value={sessionType}
              onValueChange={(value) => setSessionType(value as SessionType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SessionType.CLASS}>Class</SelectItem>
                <SelectItem value={SessionType.EXAM}>Examination</SelectItem>
                <SelectItem value={SessionType.LAB}>Lab</SelectItem>
                <SelectItem value={SessionType.TUTORIAL}>Tutorial</SelectItem>
                <SelectItem value={SessionType.EVENT}>Event</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Delivery Mode Toggle */}
          <div className="space-y-2">
            <Label htmlFor="deliveryMode">Delivery Mode</Label>
            <Select
              value={isOnline ? "online" : "inperson"}
              onValueChange={(val) => setIsOnline(val === "online")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select delivery mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inperson">In-Person Class</SelectItem>
                <SelectItem value="online">Online Class (Video Conference)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location - only if in person */}
          {!isOnline && (
            <div className="space-y-2">
              <Label htmlFor="location">Location / Venue</Label>
              <Input
                id="location"
                placeholder="e.g., Room 101, Building A"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required={!isOnline}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Label htmlFor="duration">Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 Minutes</SelectItem>
                  <SelectItem value="60">1 Hour</SelectItem>
                  <SelectItem value="90">1.5 Hours</SelectItem>
                  <SelectItem value="120">2 Hours</SelectItem>
                  <SelectItem value="180">3 Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              disabled={
                isSubmitting ||
                isLoadingCourses ||
                (courses.length === 0 && (isLecturer || isRep))
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Session"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
