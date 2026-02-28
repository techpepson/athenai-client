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
import { usersServices } from "@/services/users.services";
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

interface LecturerOption {
  id: string; // Lecturer table id
  userId: string;
  name: string;
  email: string;
  staffNo?: string;
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
  const [selectedLecturer, setSelectedLecturer] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [sessionType, setSessionType] = useState<SessionType>(
    SessionType.CLASS,
  );
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [lecturers, setLecturers] = useState<LecturerOption[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingLecturers, setIsLoadingLecturers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLecturer = user?.role === Role.LECTURER;
  const isRep = user?.role === Role.REP;

  // Fetch courses for lecturers when modal opens
  useEffect(() => {
    if (open && isLecturer) {
      setIsLoadingCourses(true);
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
          console.error("Failed to load courses:", error);
          setCourses([]);
        })
        .finally(() => setIsLoadingCourses(false));
    }
  }, [open, isLecturer]);

  // Fetch lecturers for level reps when modal opens
  useEffect(() => {
    if (open && isRep) {
      setIsLoadingLecturers(true);
      usersServices
        .getAllUsers()
        .then((res) => {
          if (res.success && res.data?.users) {
            // Filter only lecturers and map to the format we need
            const lecturerUsers = res.data.users
              .filter((u) => u.role === Role.LECTURER && u.lecturer?.id)
              .map((u) => ({
                id: u.lecturer!.id,
                userId: u.id,
                name: u.name,
                email: u.email,
                staffNo: u.lecturer?.staffNo || undefined,
              }));
            setLecturers(lecturerUsers);
          } else {
            setLecturers([]);
          }
        })
        .catch((error) => {
          console.error("Failed to load lecturers:", error);
          setLecturers([]);
        })
        .finally(() => setIsLoadingLecturers(false));
    }
  }, [open, isRep]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedCourse("");
      setSelectedLecturer("");
      setSessionName("");
      setSessionType(SessionType.CLASS);
      setLocation("");
      setStartTime("");
      setEndTime("");
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

    // Validate based on role
    if (isLecturer && !selectedCourse) {
      toast.error("Please select a course");
      return;
    }

    if (isRep && !selectedLecturer) {
      toast.error("Please select a lecturer");
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
        location: location || undefined,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      };

      // Add courseId for lecturers, lecturerId for reps
      if (isLecturer) {
        payload.courseId = selectedCourse;
      } else if (isRep) {
        payload.lecturerId = selectedLecturer;
      }

      const response = await createSession(payload, token);

      if (response.success && response.data) {
        const course = courses.find((c) => c.id === selectedCourse);
        const lecturer = lecturers.find((l) => l.id === selectedLecturer);

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
          location: location || undefined,
          expectedCount: 0,
          presentCount: 0,
          courseId: selectedCourse || undefined,
          courseName:
            course?.title ||
            (isRep ? `Session for ${lecturer?.name}` : undefined),
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

          {/* Course Selection - Only for Lecturers */}
          {isLecturer && (
            <div className="space-y-2">
              <Label htmlFor="course">Course</Label>
              {isLoadingCourses ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading your courses...
                </div>
              ) : (
                <Select
                  value={selectedCourse}
                  onValueChange={setSelectedCourse}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course you teach" />
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
                        No courses assigned to you
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
              {courses.length === 0 && !isLoadingCourses && (
                <p className="text-xs text-muted-foreground">
                  You need to be assigned to courses before creating sessions.
                </p>
              )}
            </div>
          )}

          {/* Lecturer Selection - Only for Course Reps */}
          {isRep && (
            <div className="space-y-2">
              <Label htmlFor="lecturer">Lecturer</Label>
              {isLoadingLecturers ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading lecturers...
                </div>
              ) : (
                <Select
                  value={selectedLecturer}
                  onValueChange={setSelectedLecturer}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select lecturer for this session" />
                  </SelectTrigger>
                  <SelectContent>
                    {lecturers.length > 0 ? (
                      lecturers.map((lecturer) => (
                        <SelectItem key={lecturer.id} value={lecturer.id}>
                          {lecturer.name}{" "}
                          {lecturer.staffNo ? `(${lecturer.staffNo})` : ""}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        No lecturers found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                Select the lecturer you are creating this session for.
              </p>
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
                <SelectItem value={SessionType.WORKSHIFT}>
                  Work Shift
                </SelectItem>
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
                isLoadingLecturers ||
                (isLecturer && courses.length === 0) ||
                (isRep && lecturers.length === 0)
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
