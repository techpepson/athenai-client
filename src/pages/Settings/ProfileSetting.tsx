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
import { Shield, Clock, Save, BookOpen, ScanFace, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/enums/enums";
import { PhotoCapture } from "@/components/ui/PhotoCapture";
// Removed: MultiSelect import no longer needed
import { FacialRegistration } from "@/components/auth/FacialRegistration";
import { EmptyState } from "@/components/ui/EmptyState";
import { usersServices } from "@/services/users.services";
import { coursesService, Course } from "@/services/courses.services";
import { modulesService, Module } from "@/services/modules.service";
import { getStudentLevel } from "@/data/mockAttendanceData";
import { useAttendance } from "@/contexts/AttendanceContext";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const ProfileSetting = () => {
  // Use AttendanceContext for module enrollment
  const {
    enrolledModules: contextEnrolledModules,
    availableModules: contextAvailableModules,
    enrollModule: contextEnrollModule,
    unenrollModule: contextUnenrollModule,
    autoEnrollByLevel,
  } = useAttendance();

  // Courses where user is assigned as a rep (for Level Rep display only)
  // Note: userCourses, allCourses removed - no longer displaying Courses Registered/Taught

  // Courses where user is assigned as a rep
  const [repAssignedCourses, setRepAssignedCourses] = useState<Course[]>([]);
  const [repCoursesLoading, setRepCoursesLoading] = useState(false);

  // Module enrollment local state (for UI before using context)
  const [availableModules, setAvailableModules] = useState<Module[]>([]);

  const { user, updateUser } = useAuth();

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

  // Load modules by student level (localStorage-based)
  useEffect(() => {
    if (!isStudent && !isCourseRep) return;

    // Get student level from user data or localStorage
    const level = user?.student?.level || getStudentLevel() || 100;

    // Load modules for the student's level
    const levelModules = modulesService.getModulesByLevel(level);
    setAvailableModules(levelModules);

    // Auto-enroll all modules if none enrolled yet
    if (contextEnrolledModules.length === 0 && levelModules.length > 0) {
      autoEnrollByLevel();
    }
  }, [
    isStudent,
    isCourseRep,
    user?.student?.level,
    contextEnrolledModules.length,
    autoEnrollByLevel,
  ]);

  // State for editable fields
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
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

    // Check photo changes
    if (profilePhoto !== (user.profilePicture || null)) hasChanges = true;

    // Check facial data changes
    if (facialData) hasChanges = true;

    // Check student ID card changes (for students)
    if (isStudent && studentIdCard !== (user.student?.studentId || "")) {
      hasChanges = true;
    }

    setHasUnsavedChanges(hasChanges);
  }, [profilePhoto, facialData, studentIdCard, user, isStudent]);

  // Initialize state from user data
  useEffect(() => {
    if (user) {
      // Set profile photo from user data
      setProfilePhoto(user.profilePicture || user.imageUrl || null);
      // Facial data status from embeddingStatus
      setFacialData(user.embeddingStatus === "UPLOADED" ? "verified" : null);
      // Set student ID card from user data
      setStudentIdCard(user.student?.studentId || "");
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
          const updateRecordsPayload: Record<string, string> = {};
          if (
            studentIdCard &&
            studentIdCard !== (user.student?.studentId || "")
          ) {
            updateRecordsPayload.studentId = studentIdCard;
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
                  Assigned Courses (Level Rep)
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

          {/* Modules Assigned Section - Lecturers only (read-only) */}
          {isLecturer && (
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Topics Assigned</h3>
              </div>

              {/* Stats Summary */}
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary">2 modules</Badge>
                <Badge variant="secondary">7 topics</Badge>
                <Badge variant="outline">Levels: 100, 200</Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                These module topics have been assigned to you by the Admin.
                Contact an administrator to request changes.
              </p>

              <div className="space-y-3">
                {/* Lecturer Azumah's assigned module topics */}
                {[
                  // CMPC 103 - Professional and Behavioural Studies (Level 100)
                  {
                    moduleCode: "CMPC 103",
                    moduleName: "Professional and Behavioural Studies",
                    topic: "Medical Professionalism",
                    level: 100,
                  },
                  {
                    moduleCode: "CMPC 103",
                    moduleName: "Professional and Behavioural Studies",
                    topic: "Communication Skills in Healthcare",
                    level: 100,
                  },
                  {
                    moduleCode: "CMPC 103",
                    moduleName: "Professional and Behavioural Studies",
                    topic: "Ethics in Medical Practice",
                    level: 100,
                  },
                  {
                    moduleCode: "CMPC 103",
                    moduleName: "Professional and Behavioural Studies",
                    topic: "Behavioural Sciences Foundation",
                    level: 100,
                  },
                  // CMPC 201 - Human Body Structure and Function II (Level 200)
                  {
                    moduleCode: "CMPC 201",
                    moduleName: "Human Body Structure and Function II",
                    topic: "Anatomy of Thorax",
                    level: 200,
                  },
                  {
                    moduleCode: "CMPC 201",
                    moduleName: "Human Body Structure and Function II",
                    topic: "Anatomy of Abdomen",
                    level: 200,
                  },
                  {
                    moduleCode: "CMPC 201",
                    moduleName: "Human Body Structure and Function II",
                    topic: "Cardiovascular Physiology",
                    level: 200,
                  },
                ].map((item, index) => (
                  <div
                    key={`${item.moduleCode}-${index}`}
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
                ))}
              </div>
            </div>
          )}

          {/* Enroll Modules Section - Students and Reps only */}
          {(isStudent || isCourseRep) && (
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">
                  Enroll Modules (Level{" "}
                  {user?.student?.level || getStudentLevel() || 100})
                </h3>
                {contextEnrolledModules.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {contextEnrolledModules.length} module
                    {contextEnrolledModules.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                All modules for your level are pre-selected. Uncheck to remove
                from enrollment.
              </p>

              {availableModules.length === 0 ? (
                <EmptyState
                  title="No Modules Available"
                  message="No modules have been added for your level yet."
                />
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {availableModules.map((mod) => {
                    const isEnrolled = contextEnrolledModules.includes(
                      mod.code,
                    );
                    return (
                      <div
                        key={mod.code}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          if (isEnrolled) {
                            contextUnenrollModule(mod.code);
                          } else {
                            contextEnrollModule(mod.code);
                          }
                        }}
                      >
                        <Checkbox
                          id={`module-${mod.code}`}
                          checked={isEnrolled}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              contextEnrollModule(mod.code);
                            } else {
                              contextUnenrollModule(mod.code);
                            }
                          }}
                        />
                        <label
                          htmlFor={`module-${mod.code}`}
                          className="flex-1 text-sm cursor-pointer"
                        >
                          <span className="font-medium">{mod.code}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            - {mod.name}
                          </span>
                        </label>
                        {isEnrolled && (
                          <Badge variant="secondary" className="text-xs">
                            Enrolled
                          </Badge>
                        )}
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
