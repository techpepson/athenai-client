import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Shield, Clock, Save, BookOpen, ScanFace } from "lucide-react";
import { toast } from "sonner";
import { MOCK_COURSES, useAuth } from "@/contexts/AuthContext";
import { PhotoCapture } from "@/components/ui/PhotoCapture";
import { MultiSelect } from "@/components/ui/multi-select";
import { FacialRegistration } from "@/components/auth/FacialRegistration";

const ProfileSetting = () => {
  const { user, updateUser } = useAuth();

  // State for editable fields
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [coursesTaken, setCoursesTaken] = useState<string[]>([]);
  const [facialData, setFacialData] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveAlert, setShowSaveAlert] = useState(false);

  const isStudent = user?.role === "student";
  const isCourseRep = user?.role === "course_rep";
  const isStaff = user?.role === "staff" || user?.role === "lecturer";

  // Track changes
  useEffect(() => {
    if (!user) return;

    let hasChanges = false;

    // Check courses changed
    const originalCourses = Array.isArray(user.coursesTaken)
      ? user.coursesTaken
      : typeof user.coursesTaken === "string"
        ? user.coursesTaken.split(",").filter(Boolean)
        : [];
    const sortedOriginal = [...originalCourses].sort();
    const sortedCurrent = [...coursesTaken].sort();

    if (sortedOriginal.length !== sortedCurrent.length) {
      hasChanges = true;
    } else {
      const isSame = sortedOriginal.every(
        (val, index) => val === sortedCurrent[index],
      );
      if (!isSame) hasChanges = true;
    }

    // Check photo changes
    if (profilePhoto !== user.profilePhoto) hasChanges = true;

    // Check facial data changes
    if (facialData !== user.facialData) hasChanges = true;

    setHasUnsavedChanges(hasChanges);
  }, [profilePhoto, coursesTaken, facialData, user]);

  // Initialize state from user data
  useEffect(() => {
    if (user) {
      if (Array.isArray(user.coursesTaken)) {
        setCoursesTaken(user.coursesTaken);
      } else if (typeof user.coursesTaken === "string") {
        setCoursesTaken(user.coursesTaken.split(",").filter(Boolean));
      }
      // Always set profilePhoto from user data (even if null/undefined)
      setProfilePhoto(user.profilePhoto || null);
      // Always set facialData from user data (even if null/undefined)
      setFacialData(user.facialData || null);
    }
  }, [user]);

  if (!user) return null;

  const handleSaveProfile = () => {
    setShowSaveAlert(true);
  };

  const confirmSave = async () => {
    const { success, error } = await updateUser({
      coursesTaken,
      profilePhoto: profilePhoto || undefined,
      facialData: facialData || undefined,
    });

    if (success) {
      toast.success("Profile updated successfully");
      setShowSaveAlert(false);
      setHasUnsavedChanges(false);
    } else {
      toast.error(error || "Failed to update profile");
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
          disabled={!hasUnsavedChanges}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
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
              <Label>ID Number (Read Only)</Label>
              <Input
                value={user.studentId || user.staffId || user.id}
                disabled
                className="bg-muted"
              />
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
                <FacialRegistration onCapture={(data) => setFacialData(data)} />
              </div>
            </div>
          )}

          {/* Attendance Settings Section - Only for lecturers (staff) */}
          {isStaff && (
            <div className="bg-card rounded-xl border border-border p-6 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Attendance Rules</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Configure attendance thresholds for your classes.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Late Threshold (minutes)</Label>
                  <Input type="number" defaultValue="15" />
                  <p className="text-xs text-muted-foreground">
                    Students arriving after this time will be marked as late
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Absent Threshold (minutes)</Label>
                  <Input type="number" defaultValue="30" />
                  <p className="text-xs text-muted-foreground">
                    Students not checked in after this time will be marked
                    absent
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">
                      Auto-complete sessions
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Automatically end sessions after scheduled time
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">
                      Allow manual check-in
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Manually mark attendance for students
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">
                      Require check-out
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Track both check-in and check-out times
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
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
              </div>
              <p className="text-sm text-muted-foreground">
                You are a representative for the following courses. This is
                assigned by administrators.
              </p>
              <div className="space-y-2">
                {user.courseRepData?.map((c) => (
                  <div
                    key={c.courseId}
                    className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/50"
                  >
                    <span className="font-medium">{c.courseName}</span>
                    <span className="text-xs text-muted-foreground uppercase">
                      {c.department}
                    </span>
                  </div>
                ))}
                {(!user.courseRepData || user.courseRepData.length === 0) && (
                  <p className="text-sm italic text-muted-foreground">
                    No courses assigned.
                  </p>
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
            </div>
            {isStudent || isCourseRep ? (
              <div className="space-y-2">
                <Label>Select Courses</Label>
                <MultiSelect
                  options={MOCK_COURSES.map((c) => ({
                    label: c.name,
                    value: c.id,
                  }))}
                  selected={coursesTaken}
                  onChange={setCoursesTaken}
                  placeholder="Select courses..."
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  You can update your registered courses here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Teaching Courses (Read Only)</Label>
                <div className="space-y-2">
                  {(user.coursesTaught || []).map((cid) => {
                    const c = MOCK_COURSES.find((mc) => mc.id === cid);
                    return (
                      <div
                        key={cid}
                        className="p-2 border border-border rounded bg-muted/50 text-sm"
                      >
                        {c?.name || cid}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetting;
