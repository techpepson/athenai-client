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
  X,
  Plus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/enums/enums";
import { PhotoCapture } from "@/components/ui/PhotoCapture";
import { MultiSelect } from "@/components/ui/multi-select";
import { FacialRegistration } from "@/components/auth/FacialRegistration";
import { EmptyState } from "@/components/ui/EmptyState";
import { usersServices } from "@/services/users.services";
import { coursesService, Course } from "@/services/courses.services";
import { Badge } from "@/components/ui/badge";

const ProfileSetting = () => {
  // All courses available in system
  const [allCourses, setAllCourses] = useState<
    { id: string; code: string; title: string }[]
  >([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  // User's enrolled/taught courses
  const [userCourses, setUserCourses] = useState<Course[]>([]);
  const [userCoursesLoading, setUserCoursesLoading] = useState(false);
  const [removingCourse, setRemovingCourse] = useState<string | null>(null);
  const [addingCourses, setAddingCourses] = useState(false);

  // Courses where user is assigned as a rep
  const [repAssignedCourses, setRepAssignedCourses] = useState<Course[]>([]);
  const [repCoursesLoading, setRepCoursesLoading] = useState(false);

  const { user, updateUser } = useAuth();

  const isStudent = user?.role === Role.STUDENT;
  const isCourseRep = user?.role === Role.REP;
  const isLecturer = user?.role === Role.LECTURER;
  const isStaff = user?.role === Role.STAFF || isLecturer;

  // Threshold settings for lecturers and reps
  const [lateThreshold, setLateThreshold] = useState<number>(15);
  const [absentThreshold, setAbsentThreshold] = useState<number>(30);
  const [savingThresholds, setSavingThresholds] = useState(false);

  // Fetch all courses from backend and identify rep-assigned courses
  useEffect(() => {
    const fetchCourses = async () => {
      setCoursesLoading(true);
      if (isCourseRep) setRepCoursesLoading(true);

      const res = await coursesService.getAllCourses();
      if (res.success && res.data?.data) {
        setAllCourses(
          res.data.data.map((c) => ({
            id: c.id,
            code: c.code,
            title: c.title,
          })),
        );

        // If user is a course rep, find courses where they are assigned as rep
        if (isCourseRep && user?.id) {
          const assignedCourses = res.data.data.filter((course) => {
            if (!course.reps || !Array.isArray(course.reps)) return false;
            // Check if current user is in the reps array
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
        }
      } else {
        setAllCourses([]);
        setRepAssignedCourses([]);
      }
      setCoursesLoading(false);
      setRepCoursesLoading(false);
    };
    fetchCourses();
  }, [isCourseRep, user?.id, user?.student?.id]);

  // Fetch user's enrolled/taught courses
  useEffect(() => {
    const fetchUserCourses = async () => {
      if (!user) return;
      setUserCoursesLoading(true);
      try {
        if (isStudent || isCourseRep) {
          const res = await coursesService.getStudentCourses();
          if (res.success && res.data?.data) {
            setUserCourses(res.data.data);
          }
        } else if (isLecturer) {
          const res = await coursesService.getLecturerCourses();
          if (res.success && res.data?.data) {
            setUserCourses(res.data.data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch user courses:", error);
      } finally {
        setUserCoursesLoading(false);
      }
    };
    fetchUserCourses();
  }, [user, isStudent, isCourseRep, isLecturer]);

  // State for editable fields
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [coursesTaken, setCoursesTaken] = useState<string[]>([]);
  const [facialImages, setFacialImages] = useState<string[] | null>(null);
  const [facialData, setFacialData] = useState<string | null>(null);
  const [studentIdCard, setStudentIdCard] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [showSaveAlert, setShowSaveAlert] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Track changes
  useEffect(() => {
    if (!user) return;

    let hasChanges = false;

    // Check courses changed (simplified - course data will come from API)
    if (coursesTaken.length > 0) {
      hasChanges = true;
    }

    // Check photo changes
    if (profilePhoto !== (user.profilePicture || null)) hasChanges = true;

    // Check facial data changes
    if (facialData) hasChanges = true;

    // Check student ID card changes (for students)
    if (isStudent && studentIdCard !== (user.student?.studentId || "")) {
      hasChanges = true;
    }

    setHasUnsavedChanges(hasChanges);
  }, [profilePhoto, coursesTaken, facialData, studentIdCard, user, isStudent]);

  // Initialize state from user data
  useEffect(() => {
    if (user) {
      // Courses will be loaded from API when available
      setCoursesTaken([]);
      // Set profile photo from user data
      setProfilePhoto(user.profilePicture || user.imageUrl || null);
      // Facial data status from embeddingStatus
      setFacialData(user.embeddingStatus === "UPLOADED" ? "verified" : null);
      // Set student ID card from user data
      setStudentIdCard(user.student?.studentId || "");
      // Thresholds will be fetched separately or use defaults
    }
  }, [user]);

  if (!user) return null;

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
          const updateRecordsPayload: any = {};
          if (
            studentIdCard &&
            studentIdCard !== (user.student?.studentId || "")
          ) {
            updateRecordsPayload.studentId = studentIdCard;
          }
          if (coursesTaken.length > 0) {
            updateRecordsPayload.courses = coursesTaken;
          }
          if (Object.keys(updateRecordsPayload).length > 0) {
            const res = await usersServices.updateRecords(
              updateRecordsPayload,
              token,
            );
            if (!res.success)
              throw new Error(res.error || "Failed to update records");
          }
        } else {
          // Not enrolled: enroll new student (requires facial images)
          if (facialImages && facialImages.length === 3) {
            const files = await Promise.all(
              facialImages.map(async (img, i) => {
                const blob = await fetch(img).then((r) => r.blob());
                console.log(blob);
                return new File([blob], `face${i + 1}.jpg`, {
                  type: "image/jpeg",
                });
              }),
            );

            const payload = {
              role: Role.STUDENT,
              email: user.email, // Required for backend to find existing user
              studentId: studentIdCard,
              courses: coursesTaken,
            };
            const res = await usersServices.enrollUser(payload, files);
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
      // Refresh user courses after save
      if (isStudent || isCourseRep) {
        const res = await coursesService.getStudentCourses();
        if (res.success && res.data?.data) {
          setUserCourses(res.data.data);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // Handle removing a course
  const handleRemoveCourse = async (courseId: string, courseCode: string) => {
    if (!user) return;
    setRemovingCourse(courseId);
    try {
      if (isStudent || isCourseRep) {
        // For students: remove from course enrollment
        const studentId = user.student?.id;
        if (!studentId) {
          toast.error("Student ID not found");
          return;
        }
        const res = await coursesService.removeStudentFromCourse(
          courseId,
          studentId,
        );
        if (res.success) {
          setUserCourses((prev) => prev.filter((c) => c.id !== courseId));
          toast.success(`Removed from ${courseCode}`);
        } else {
          toast.error(res.error || "Failed to remove course");
        }
      } else if (isLecturer) {
        // For lecturers: remove from course assignment
        const lecturerId = user.lecturer?.id;
        if (!lecturerId) {
          toast.error("Lecturer ID not found");
          return;
        }
        const res = await coursesService.removeLecturerFromCourse(
          courseId,
          lecturerId,
        );
        if (res.success) {
          setUserCourses((prev) => prev.filter((c) => c.id !== courseId));
          toast.success(`Removed from ${courseCode}`);
        } else {
          toast.error(res.error || "Failed to remove course");
        }
      }
    } catch (error) {
      toast.error("Failed to remove course");
    } finally {
      setRemovingCourse(null);
    }
  };

  // Handle adding new courses
  const handleAddCourses = async () => {
    if (coursesTaken.length === 0) {
      toast.error("Please select at least one course to add");
      return;
    }
    setAddingCourses(true);
    try {
      const token = await usersServices.utilService.getTokenFromLocalStorage();
      if (!token) {
        toast.error("You must be logged in");
        return;
      }
      // Filter out courses already enrolled in
      const existingCodes = userCourses.map((c) => c.code);
      const newCourses = coursesTaken.filter(
        (code) => !existingCodes.includes(code),
      );

      if (newCourses.length === 0) {
        toast.info("You are already enrolled in all selected courses");
        setCoursesTaken([]);
        return;
      }

      const res = await usersServices.updateRecords(
        { courses: newCourses },
        token,
      );
      if (res.success) {
        toast.success(`Added ${newCourses.length} course(s)`);
        setCoursesTaken([]);
        // Refresh user courses
        if (isStudent || isCourseRep) {
          const refreshRes = await coursesService.getStudentCourses();
          if (refreshRes.success && refreshRes.data?.data) {
            setUserCourses(refreshRes.data.data);
          }
        }
      } else {
        toast.error(res.error || "Failed to add courses");
      }
    } catch (error) {
      toast.error("Failed to add courses");
    } finally {
      setAddingCourses(false);
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
          </div>
        </div>

        {/* Right Column: Facial Data & Courses */}
        <div className="xl:col-span-2 space-y-6">
          {/* Facial Registration Section - Only for students and course reps */}
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

          {/* Attendance Settings Section - Only for lecturers and course reps */}
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

          {/* Course Rep Specifics */}
          {isCourseRep && (
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">
                  Assigned Courses (Course Rep)
                </h3>
                {repAssignedCourses.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {repAssignedCourses.length} course
                    {repAssignedCourses.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                You are a representative for the following courses. This is
                assigned by administrators.
              </p>
              <div className="space-y-2">
                {repCoursesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading your rep assignments...
                  </div>
                ) : repAssignedCourses.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground p-3 bg-muted rounded-lg">
                    You are not assigned as a representative for any courses
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

          {/* Courses Taken / Taught */}
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">
                {isStudent || isCourseRep
                  ? "Courses Registered"
                  : "Courses Taught"}
              </h3>
              {userCourses.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {userCourses.length} course
                  {userCourses.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            {/* Current Courses List */}
            <div className="space-y-2">
              <Label>
                {isStudent || isCourseRep
                  ? "Your Enrolled Courses"
                  : "Your Teaching Courses"}
              </Label>
              {userCoursesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading your courses...
                </div>
              ) : userCourses.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
                  {isStudent || isCourseRep
                    ? "You are not enrolled in any courses yet. Add courses below."
                    : "You are not assigned to teach any courses yet."}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {userCourses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg group hover:bg-primary/15 transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {course.code}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {course.title}
                        </span>
                      </div>
                      {(isStudent || isCourseRep || isLecturer) && (
                        <button
                          onClick={() =>
                            handleRemoveCourse(course.id, course.code)
                          }
                          disabled={removingCourse === course.id}
                          className="ml-2 p-1 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                          title={`Remove ${course.code}`}
                        >
                          {removingCourse === course.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Courses Section - Students only */}
            {(isStudent || isCourseRep) && (
              <div className="space-y-3 pt-4 border-t border-border">
                <Label className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add New Courses
                </Label>
                {coursesLoading ? (
                  <div className="text-sm text-muted-foreground">
                    Loading available courses...
                  </div>
                ) : allCourses.length === 0 ? (
                  <EmptyState
                    title="No Courses Available"
                    message="No courses have been added to the system yet. Please contact an administrator."
                  />
                ) : (
                  <>
                    <MultiSelect
                      options={allCourses
                        .filter(
                          (c) => !userCourses.some((uc) => uc.code === c.code),
                        )
                        .map((c) => ({
                          label: `${c.code} - ${c.title}`,
                          value: c.code,
                        }))}
                      selected={coursesTaken}
                      onChange={setCoursesTaken}
                      placeholder="Select courses to add..."
                      className="w-full"
                    />
                    {coursesTaken.length > 0 && (
                      <Button
                        onClick={handleAddCourses}
                        disabled={addingCourses}
                        size="sm"
                        className="mt-2"
                      >
                        {addingCourses ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Add {coursesTaken.length} Course
                            {coursesTaken.length !== 1 ? "s" : ""}
                          </>
                        )}
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Select additional courses you want to register for.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Lecturer info */}
            {isLecturer && (
              <p className="text-xs text-muted-foreground pt-2">
                You can remove yourself from courses. Contact an admin to be
                assigned to new courses.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetting;
