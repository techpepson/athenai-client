import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Shield,
  Clock,
  Save,
  BookOpen,
  ScanFace,
  Loader2,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/enums/enums";
import { PhotoCapture } from "@/components/ui/PhotoCapture";
// Removed: MultiSelect import no longer needed
import { FacialRegistration } from "@/components/auth/FacialRegistration";
import { EmptyState } from "@/components/ui/EmptyState";
import { usersServices } from "@/services/users.services";
import { coursesService, Course } from "@/services/courses.services";
import { modulesService } from "@/services/modules.service";
import { getStudentLevel } from "@/data/mockAttendanceData";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ProfileSetting = () => {
  const { user, updateUser } = useAuth();

  // State for editable fields
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [facialImages, setFacialImages] = useState<string[] | null>(null);
  const [facialData, setFacialData] = useState<string | null>(null);
  const [studentIdCard, setStudentIdCard] = useState<string>("");
  const [studentLevel, setStudentLevel] = useState<number>(
    user?.student?.level || 100,
  );
  const [savingLevel, setSavingLevel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaveAlert, setShowSaveAlert] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Enrolled courses state (fetched from backend)
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [currentSemester, setCurrentSemester] = useState<number>(1);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Courses where user is assigned as a rep (for Level Rep display only)
  const [repAssignedCourses, setRepAssignedCourses] = useState<Course[]>([]);
  const [repCoursesLoading, setRepCoursesLoading] = useState(false);

  const [lecturerAssignedTopics, setLecturerAssignedTopics] = useState<
    {
      subtopicId: string;
      moduleId: string;
      moduleCode: string;
      moduleName: string;
      topic: string;
      level: number;
    }[]
  >([]);
  const [loadingLecturerTopics, setLoadingLecturerTopics] = useState(false);

  const isStudent = user?.role === Role.STUDENT;
  const isCourseRep = user?.role === Role.REP;
  const isLecturer = user?.role === Role.LECTURER;
  const isStaff = user?.role === Role.STAFF || isLecturer;

  // Threshold settings for lecturers and reps
  const [lateThreshold, setLateThreshold] = useState<number>(15);
  const [absentThreshold, setAbsentThreshold] = useState<number>(30);
  const [savingThresholds, setSavingThresholds] = useState(false);

  // Fetch rep-assigned courses only (for Level Rep display)
  useEffect(() => {
    const fetchRepCourses = async () => {
      if (!isCourseRep || !user?.id) return;
      setRepCoursesLoading(true);

      const res = await coursesService.getAllCourses();
      if (res.success && res.data?.data) {
        // Find courses where current user is assigned as rep
        const assignedCourses = res.data.data.filter((course) => {
          if (!course.reps || !Array.isArray(course.reps)) return false;
          return course.reps.some(
            (rep: {
              userId?: string;
              studentId?: string;
              id?: string;
              student?: { userId?: string };
            }) => {
              return (
                rep.userId === user.id ||
                rep.studentId === user.student?.id ||
                rep.id === user.id ||
                rep.student?.userId === user.id
              );
            },
          );
        });
        setRepAssignedCourses(assignedCourses);
      } else {
        setRepAssignedCourses([]);
      }
      setRepCoursesLoading(false);
    };
    fetchRepCourses();
  }, [isCourseRep, user?.id, user?.student?.id]);

  // Fetch available courses (filtered by level/semester on backend) and enrolled courses
  useEffect(() => {
    if (!isStudent && !isCourseRep) return;

    const fetchStudentCourseInfo = async () => {
      setLoadingCourses(true);
      try {
        // Fetch global semester
        const semRes = await coursesService.getSemester();
        if (semRes.success && semRes.data) {
          setCurrentSemester(semRes.data.semester);
        }

        // Fetch enrolled courses
        const enrolledRes = await coursesService.getStudentCourses();
        if (enrolledRes.success && enrolledRes.data?.data) {
          setEnrolledCourses(enrolledRes.data.data);
        } else {
          setEnrolledCourses([]);
        }

        // Fetch all available courses for this level and semester
        const availableRes = await coursesService.getAllCourses();
        if (availableRes.success && availableRes.data?.data) {
          setAvailableCourses(availableRes.data.data);
        } else {
          setAvailableCourses([]);
        }
      } catch (error) {
        console.error("Failed to load student courses:", error);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchStudentCourseInfo();
  }, [isStudent, isCourseRep, studentLevel]);

  useEffect(() => {
    const fetchLecturerAssignedTopics = async () => {
      if (!isLecturer || !user?.id) return;

      setLoadingLecturerTopics(true);
      try {
        const res = await modulesService.getModules();
        const modules = res.success && res.data?.data ? res.data.data : [];

        const lecturerUserId = user.id;
        const lecturerProfileId = user.lecturer?.id;

        const assigned = modules.flatMap((mod) =>
          (mod.subtopics || [])
            .filter((st) => {
              const assignedId = st.lecturerId || st.lecturer?.id;
              if (!assignedId) return false;
              return (
                assignedId === lecturerUserId ||
                (!!lecturerProfileId && assignedId === lecturerProfileId)
              );
            })
            .map((st) => ({
              subtopicId: st.id,
              moduleId: mod.id,
              moduleCode: mod.code,
              moduleName: mod.name,
              topic: st.name,
              level: mod.level,
            })),
        );

        const uniqueAssigned = Array.from(
          new Map(
            assigned.map((item) => [
              `${item.moduleId}-${item.subtopicId}`,
              item,
            ]),
          ).values(),
        ).sort((a, b) => {
          if (a.level !== b.level) return a.level - b.level;
          if (a.moduleCode !== b.moduleCode) {
            return a.moduleCode.localeCompare(b.moduleCode);
          }
          return a.topic.localeCompare(b.topic);
        });

        setLecturerAssignedTopics(uniqueAssigned);
      } catch {
        setLecturerAssignedTopics([]);
      } finally {
        setLoadingLecturerTopics(false);
      }
    };

    fetchLecturerAssignedTopics();
  }, [isLecturer, user?.id, user?.lecturer?.id]);

  // Available student levels
  const STUDENT_LEVELS = [100, 200, 300, 400, 500, 600];

  // Track changes
  useEffect(() => {
    if (!user) return;

    let hasChanges = false;

    // Check photo changes
    if (profilePhoto !== (user.profilePicture || null)) hasChanges = true;

    // Check facial data changes
    if (facialData) hasChanges = true;

    // Check student ID card changes (for students)
    if (isStudent && studentIdCard !== (user.student?.studentId || "")) {
      hasChanges = true;
    }

    // Check level changes (for students and reps)
    if (
      (isStudent || isCourseRep) &&
      studentLevel !== (user.student?.level || 100)
    ) {
      hasChanges = true;
    }

    setHasUnsavedChanges(hasChanges);
  }, [
    profilePhoto,
    facialData,
    studentIdCard,
    studentLevel,
    user,
    isStudent,
    isCourseRep,
  ]);

  // Initialize state from user data
  useEffect(() => {
    if (user) {
      // Set profile photo from user data
      setProfilePhoto(user.profilePicture || user.imageUrl || null);
      // Facial data status from embeddingStatus
      setFacialData(user.embeddingStatus === "UPLOADED" ? "verified" : null);
      // Set student ID card from user data
      setStudentIdCard(user.student?.studentId || "");
      // Set student level from user data
      setStudentLevel(user.student?.level || 100);
    }
  }, [user]);

  if (!user) return null;

  const handleCourseToggle = async (course: Course) => {
    const isEnrolled = enrolledCourses.some((c) => c.id === course.id);
    const token = await usersServices.utilService.getTokenFromLocalStorage();

    if (!token) {
      toast.error("You must be logged in to modify course enrollment");
      return;
    }

    if (isEnrolled) {
      // Unenroll / remove course enrollment
      const studentId = user?.student?.id;
      if (!studentId) {
        toast.error("Student ID not found");
        return;
      }
      const res = await coursesService.removeStudentFromCourse(course.id, studentId);
      if (res.success || !res.error) {
        setEnrolledCourses((prev) => prev.filter((c) => c.id !== course.id));
        toast.success(`Unenrolled from ${course.code} successfully`);
      } else {
        toast.error(res.error || `Failed to unenroll from ${course.code}`);
      }
    } else {
      // Enroll / add course enrollment
      const res = await usersServices.updateRecords(
        { courses: [course.code] },
        token
      );
      if (res.success) {
        setEnrolledCourses((prev) => [...prev, course]);
        toast.success(`Enrolled in ${course.code} successfully`);
      } else {
        toast.error(res.error || `Failed to enroll in ${course.code}`);
      }
    }
  };

  const handleSaveProfile = () => {
    setShowSaveAlert(true);
  };

  // Use the singleton usersServices directly

  const confirmSave = async () => {
    const token = await usersServices.utilService.getTokenFromLocalStorage();
    if (!token) {
      toast.error("You must be logged in to update your profile");
      return;
    }
    setSaving(true);
    try {
      // If student, determine if enrolled (has studentId) or not
      if (isStudent) {
        const alreadyEnrolled = !!user.student?.studentId;
        if (alreadyEnrolled) {
          // Only update records (student already exists)
          const updateRecordsPayload: Record<string, string | number> = {};
          if (
            studentIdCard &&
            studentIdCard !== (user.student?.studentId || "")
          ) {
            updateRecordsPayload.studentId = studentIdCard;
          }
          if (studentLevel !== (user.student?.level || 100)) {
            updateRecordsPayload.level = studentLevel;
          }
          if (Object.keys(updateRecordsPayload).length > 0) {
            const res = await usersServices.updateRecords(
              updateRecordsPayload,
              token,
            );
            if (!res.success)
              throw new Error(res.error || "Failed to update records");
          }

          // If facial images were captured, also enroll face with level
          if (facialImages && facialImages.length === 3) {
            const files = await Promise.all(
              facialImages.map(async (img, i) => {
                const blob = await fetch(img).then((r) => r.blob());
                return new File([blob], `face${i + 1}.jpg`, {
                  type: "image/jpeg",
                });
              }),
            );
            const faceRes = await usersServices.enrollFace(
              files,
              studentIdCard || undefined,
              studentLevel,
            );
            if (!faceRes.success)
              throw new Error(faceRes.error || "Failed to enroll face data");
          }
        } else {
          // Not enrolled: enroll new student (requires facial images)
          if (facialImages && facialImages.length === 3) {
            const files = await Promise.all(
              facialImages.map(async (img, i) => {
                const blob = await fetch(img).then((r) => r.blob());
                return new File([blob], `face${i + 1}.jpg`, {
                  type: "image/jpeg",
                });
              }),
            );

            const res = await usersServices.enrollFace(
              files,
              studentIdCard || undefined,
              studentLevel,
            );
            if (!res.success)
              throw new Error(res.error || "Failed to enroll face data");
          } else {
            throw new Error("Please capture 3 facial images to enroll.");
          }
        }
      }

      // Update profile photo if changed (for all roles)
      if (profilePhoto && profilePhoto !== (user.profilePicture || null)) {
        // Convert base64 to File
        const file = await fetch(profilePhoto)
          .then((r) => r.blob())
          .then(
            (blob) => new File([blob], "profile.jpg", { type: "image/jpeg" }),
          );
        const res = await usersServices.updateUserDetails({}, file);
        if (!res.success)
          throw new Error(res.error || "Failed to update profile photo");
      }

      toast.success("Profile updated successfully");
      setShowSaveAlert(false);
      setHasUnsavedChanges(false);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update profile";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <AlertDialog open={showSaveAlert} onOpenChange={setShowSaveAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save these changes to your profile?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSave}>
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Profile Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your personal information
          </p>
        </div>
        <Button
          variant="gradient"
          onClick={handleSaveProfile}
          disabled={!hasUnsavedChanges || saving}
        >
          {saving ? (
            <span className="flex items-center">
              <Save className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </span>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Identity & Photo */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-card rounded-xl border border-border p-4 sm:p-6 space-y-4">
            <h3 className="font-semibold text-lg">Identity</h3>
            <div className="flex flex-col items-center">
              <PhotoCapture
                currentImage={profilePhoto}
                onCapture={setProfilePhoto}
                label="Profile Picture"
              />
            </div>

            <div className="space-y-2 pt-4">
              <Label>Full Name (Read Only)</Label>
              <Input value={user.name} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Email (Read Only)</Label>
              <Input value={user.email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>
                ID Card Number{" "}
                {isStudent ? "(School-issued, editable)" : "(Read Only)"}
              </Label>
              {isStudent ? (
                <Input
                  value={studentIdCard}
                  onChange={(e) => setStudentIdCard(e.target.value)}
                  placeholder="Enter your student ID card number"
                  className="bg-background"
                />
              ) : (
                <Input
                  value={
                    isCourseRep
                      ? user.student?.studentId || user.id
                      : user.lecturer?.staffNo || user.staff?.staffNo || user.id
                  }
                  disabled
                  className="bg-muted"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Role (Read Only)</Label>
              <div className="px-3 py-2 rounded-md border border-input bg-muted text-sm capitalize">
                {user.role?.replace("_", " ")}
              </div>
            </div>

            {/* Student Level Selection */}
            {(isStudent || isCourseRep) && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Academic Level
                </Label>
                <Select
                  value={String(studentLevel)}
                  onValueChange={(value) => setStudentLevel(Number(value))}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select your level" />
                  </SelectTrigger>
                  <SelectContent>
                    {STUDENT_LEVELS.map((level) => (
                      <SelectItem key={level} value={String(level)}>
                        Level {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select your current academic year/level
                </p>
                {studentLevel !== (user?.student?.level || 100) && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs text-amber-600 border-amber-300 bg-amber-50"
                    >
                      Changed from Level {user?.student?.level || 100}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={async () => {
                        const token =
                          await usersServices.utilService.getTokenFromLocalStorage();
                        if (!token) {
                          toast.error("You must be logged in");
                          return;
                        }
                        setSavingLevel(true);
                        try {
                          const res = await usersServices.updateRecords(
                              { level: String(studentLevel) },
                            token,
                          );
                          if (res.success) {
                            toast.success(`Level updated to ${studentLevel}`);
                          } else {
                            toast.error(res.error || "Failed to update level");
                          }
                        } catch {
                          toast.error("Failed to update level");
                        } finally {
                          setSavingLevel(false);
                        }
                      }}
                      disabled={savingLevel}
                    >
                      {savingLevel ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        "Update Now"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Facial Data & Courses */}
        <div className="xl:col-span-2 space-y-6">
          {/* Facial Registration Section - Only for students and level reps */}
          {(isStudent || isCourseRep) && (
            <div className="bg-card rounded-xl border border-border p-4 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <ScanFace className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">
                  Facial Recognition Data
                </h3>
                <div
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${facialData ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}
                >
                  {facialData ? "Verified" : "Not Verified"}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Update your facial data for kiosk mode and attendance marking.
              </p>
              <div className="p-2 sm:p-4 bg-secondary/10 rounded-xl relative overflow-visible min-h-[350px] sm:min-h-[400px]">
                <FacialRegistration
                  onCapture={(data) => {
                    if (Array.isArray(data)) {
                      setFacialImages(data);
                      setFacialData("verified");
                    } else {
                      setFacialImages(null);
                      setFacialData(null);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Attendance Settings Section - Only for lecturers and level reps */}
          {(isLecturer || isCourseRep) && (
            <div className="bg-card rounded-xl border border-border p-6 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Attendance Rules</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Configure attendance thresholds for your classes. These settings
                apply when creating new sessions.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Late Threshold (minutes)</Label>
                  <Input
                    type="number"
                    value={lateThreshold}
                    onChange={(e) => setLateThreshold(Number(e.target.value))}
                    min={1}
                    max={120}
                  />
                  <p className="text-xs text-muted-foreground">
                    Students arriving after this time will be marked as late
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Absent Threshold (minutes)</Label>
                  <Input
                    type="number"
                    value={absentThreshold}
                    onChange={(e) => setAbsentThreshold(Number(e.target.value))}
                    min={1}
                    max={180}
                  />
                  <p className="text-xs text-muted-foreground">
                    Students not checked in after this time will be marked
                    absent
                  </p>
                </div>
              </div>

              <Button
                onClick={async () => {
                  const token =
                    await usersServices.utilService.getTokenFromLocalStorage();
                  if (!token) {
                    toast.error("You must be logged in");
                    return;
                  }
                  if (lateThreshold >= absentThreshold) {
                    toast.error(
                      "Late threshold must be less than absent threshold",
                    );
                    return;
                  }
                  setSavingThresholds(true);
                  try {
                    const res = await usersServices.updateThresholds(
                      { lateThreshold, absentThreshold },
                      token,
                    );
                    if (res.success) {
                      toast.success("Thresholds updated successfully");
                    } else {
                      toast.error(res.error || "Failed to update thresholds");
                    }
                  } catch (error) {
                    toast.error("Failed to update thresholds");
                  } finally {
                    setSavingThresholds(false);
                  }
                }}
                disabled={savingThresholds}
                className="w-full sm:w-auto"
              >
                {savingThresholds ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Thresholds
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Level Rep Specifics */}
          {isCourseRep && (
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">
                  Assigned Courses (Level Assistant)
                </h3>
                {repAssignedCourses.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {repAssignedCourses.length} course
                    {repAssignedCourses.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                You are an assistant for the following courses. This is
                assigned by administrators.
              </p>
              <div className="space-y-2">
                {repCoursesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading your assistant assignments...
                  </div>
                ) : repAssignedCourses.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground p-3 bg-muted rounded-lg">
                    You are not assigned as an assistant for any courses
                    yet.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {repAssignedCourses.map((course) => (
                      <div
                        key={course.id}
                        className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg"
                      >
                        <Shield className="w-4 h-4 text-primary" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">
                            {course.code}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {course.title}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modules Assigned Section - Lecturers only (read-only) */}
          {isLecturer && (
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Subtopics Assigned</h3>
              </div>

              {/* Stats Summary */}
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary">
                  {
                    new Set(lecturerAssignedTopics.map((item) => item.moduleId))
                      .size
                  }{" "}
                  module
                  {new Set(lecturerAssignedTopics.map((item) => item.moduleId))
                    .size !== 1
                    ? "s"
                    : ""}
                </Badge>
                <Badge variant="secondary">
                  {lecturerAssignedTopics.length} subtopic
                  {lecturerAssignedTopics.length !== 1 ? "s" : ""}
                </Badge>
                <Badge variant="outline">
                  Levels:{" "}
                  {Array.from(
                    new Set(lecturerAssignedTopics.map((item) => item.level)),
                  )
                    .sort((a, b) => a - b)
                    .join(", ") || "-"}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                These subtopics are assigned to you by Admin during module
                setup. Contact an administrator to request changes.
              </p>

              <div className="space-y-3">
                {loadingLecturerTopics ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading your assigned subtopics...
                  </div>
                ) : lecturerAssignedTopics.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground p-3 bg-muted rounded-lg">
                    No subtopics have been assigned to you yet.
                  </p>
                ) : (
                  lecturerAssignedTopics.map((item) => (
                    <div
                      key={`${item.moduleId}-${item.subtopicId}`}
                      className="flex items-start gap-3 p-3 bg-muted/50 border border-border rounded-lg"
                    >
                      <BookOpen className="w-4 h-4 text-primary mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {item.moduleCode}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.moduleName}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mt-1">
                          {item.topic}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        Level {item.level}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Enroll Courses Section - Students and Reps only */}
          {(isStudent || isCourseRep) && (
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">
                  Semester Course Enrollment
                </h3>
                {enrolledCourses.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {enrolledCourses.length} course
                    {enrolledCourses.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>

              <div className="p-3 bg-muted/40 rounded-lg flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Current Status:</span>
                  <span>Level {studentLevel}</span>
                  <span>•</span>
                  <span>Semester {currentSemester}</span>
                </div>
                <Badge variant="outline" className="bg-background text-primary border-primary/20">
                  UG TRACE
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                Select the courses you will be offering for the semester. Changes are updated in real-time.
              </p>

              {loadingCourses ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Loading available courses...
                </div>
              ) : availableCourses.length === 0 ? (
                <EmptyState
                  title="No Courses Available"
                  message={`No courses have been added for Level ${studentLevel}, Semester ${currentSemester} yet.`}
                />
              ) : (
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {availableCourses.map((course) => {
                    const isEnrolled = enrolledCourses.some((c) => c.id === course.id);
                    return (
                      <div
                        key={course.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                          isEnrolled
                            ? "bg-primary/5 border-primary/20 shadow-sm"
                            : "bg-background border-border hover:bg-muted/50"
                        }`}
                        onClick={() => handleCourseToggle(course)}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <Checkbox
                            id={`course-${course.id}`}
                            checked={isEnrolled}
                            onCheckedChange={() => handleCourseToggle(course)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={`course-${course.id}`}
                              className="text-sm font-semibold text-foreground cursor-pointer block"
                            >
                              {course.code} - {course.title}
                            </label>
                            {course.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {course.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {course.creditHours !== undefined && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              {course.creditHours} Credits
                            </Badge>
                          )}
                          {isEnrolled && (
                            <Badge variant="default" className="text-xs font-semibold">
                              Enrolled
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSetting;
