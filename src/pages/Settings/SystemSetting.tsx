import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Building,
  Bell,
  Shield,
  Monitor,
  Clock,
  Save,
  Phone,
  Upload,
  ImageIcon,
  BookOpen,
  Users,
  Loader2,
  User,
  Pencil,
  Trash2,
  Plus,
  GraduationCap,
  Layers,
} from "lucide-react";
import ModulesManagement from "@/components/modules/ModulesManagement";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/enums/enums";
import { coursesService, Course } from "@/services/courses.services";
import { usersServices } from "@/services/users.services";
import { IUserPublic } from "@/interface/user.interface";
import { Badge } from "@/components/ui/badge";

interface CourseWithDetails extends Course {
  creditHours?: number;
}

const SystemSetting = () => {
  const { user, token } = useAuth();
  const [adminPhoneNumber, setAdminPhoneNumber] = useState("");
  const [organizationLogo, setOrganizationLogo] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<IUserPublic[]>([]);
  const [courses, setCourses] = useState<CourseWithDetails[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Profile state
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Course modal state
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseWithDetails | null>(
    null,
  );
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseDescription, setNewCourseDescription] = useState("");
  const [newCourseCreditHours, setNewCourseCreditHours] = useState("3");
  const [addingCourse, setAddingCourse] = useState(false);

  // Delete course dialog
  const [deleteCourseDialogOpen, setDeleteCourseDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] =
    useState<CourseWithDetails | null>(null);
  const [deletingCourse, setDeletingCourse] = useState(false);

  const isSuperAdmin =
    user?.role === Role.SYSTEM_ADMIN || user?.role === Role.OWNER;

  // Initialize profile data from user
  useEffect(() => {
    if (user) {
      setProfileName(user.name || "");
      setProfileEmail(user.email || "");
      setProfilePhone(user.phone || "");
      setProfilePhoto(user.profilePicture || user.imageUrl || null);
    }
  }, [user]);

  useEffect(() => {
    // Load lecturers from API
    const loadStaff = async () => {
      const response = await usersServices.getAllUsers();
      if (response.success && response.data?.users) {
        setStaffList(
          response.data.users.filter(
            (u) => u.role === Role.LECTURER || u.role === Role.STAFF,
          ),
        );
      }
    };
    loadStaff();
  }, []);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      const response = await coursesService.getAllCourses();
      if (response.success && response.data) {
        const coursesData = Array.isArray(response.data)
          ? response.data
          : response.data.data || [];
        setCourses(coursesData);
      } else {
        setCourses([]);
      }
    } catch {
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleSaveSystemSettings = () => {
    localStorage.setItem(
      "kioskSettings",
      JSON.stringify({
        adminPhoneNumber,
        organizationLogo,
      }),
    );
    toast.success("System settings saved successfully!");
  };

  const handleSaveProfile = async () => {
    if (!token || !user?.email) return;

    setSavingProfile(true);
    try {
      // Admin/System Admin must include their email in the payload
      // so the backend knows whose profile to update
      // Backend expects 'name' not 'fullName'
      const response = await usersServices.updateUserDetails(
        {
          email: user.email,
          name: profileName,
          phone: profilePhone,
        },
        profilePhotoFile || undefined,
      );

      if (response.success) {
        toast.success("Profile updated successfully!");
        // Clear the file after successful upload
        setProfilePhotoFile(null);
      } else {
        toast.error(response.error || "Failed to update profile");
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOrganizationLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setOrganizationLogo(null);
  };

  const handleProfilePhotoUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // Store the file for upload
      setProfilePhotoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper to get lecturers for a course
  const getLecturersForCourse = (course: CourseWithDetails) => {
    if (course.lecturers && course.lecturers.length > 0) {
      return staffList.filter((s) =>
        course.lecturers?.some((l) => l.userId === s.id),
      );
    }
    return [];
  };

  // Open modal for adding new course
  const openAddCourseModal = () => {
    setEditingCourse(null);
    setNewCourseCode("");
    setNewCourseTitle("");
    setNewCourseDescription("");
    setNewCourseCreditHours("3");
    setCourseModalOpen(true);
  };

  // Open modal for editing course
  const openEditCourseModal = (course: CourseWithDetails) => {
    setEditingCourse(course);
    setNewCourseCode(course.code);
    setNewCourseTitle(course.title);
    setNewCourseDescription(course.description || "");
    setNewCourseCreditHours(String(course.creditHours || 3));
    setCourseModalOpen(true);
  };

  // Handle adding/editing a course
  const handleSaveCourse = async () => {
    if (!newCourseCode.trim() || !newCourseTitle.trim()) {
      toast.error("Please fill in course code and title");
      return;
    }

    setAddingCourse(true);
    try {
      if (editingCourse) {
        // Update existing course
        const response = await coursesService.updateCourse(editingCourse.id, {
          courseCode: newCourseCode.trim().toUpperCase(),
          title: newCourseTitle.trim(),
          description: newCourseDescription.trim() || undefined,
          creditHours: parseInt(newCourseCreditHours) || 3,
        });

        if (response.success) {
          toast.success(`Course "${newCourseTitle}" updated successfully`);
          setCourseModalOpen(false);
          loadCourses();
        } else {
          toast.error(response.error || "Failed to update course");
        }
      } else {
        // Add new course
        const response = await coursesService.addCourse({
          courseCode: newCourseCode.trim().toUpperCase(),
          title: newCourseTitle.trim(),
          description: newCourseDescription.trim() || newCourseTitle.trim(),
          creditHours: parseInt(newCourseCreditHours) || 3,
        });

        if (response.success) {
          toast.success(`Course "${newCourseTitle}" added successfully`);
          setCourseModalOpen(false);
          loadCourses();
        } else {
          toast.error(response.error || "Failed to add course");
        }
      }
    } catch {
      toast.error(
        editingCourse ? "Failed to update course" : "Failed to add course",
      );
    } finally {
      setAddingCourse(false);
      setEditingCourse(null);
      setNewCourseCode("");
      setNewCourseTitle("");
      setNewCourseDescription("");
    }
  };

  // Handle deleting a course
  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;

    setDeletingCourse(true);
    try {
      const response = await coursesService.removeCourse(courseToDelete.id);

      if (response.success) {
        toast.success(`Course "${courseToDelete.title}" deleted successfully`);
        loadCourses();
      } else {
        toast.error(response.error || "Failed to delete course");
      }
    } catch {
      toast.error("Failed to delete course");
    } finally {
      setDeletingCourse(false);
      setDeleteCourseDialogOpen(false);
      setCourseToDelete(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Course Add/Edit Modal */}
      <Dialog open={courseModalOpen} onOpenChange={setCourseModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingCourse ? "Edit Course" : "Add New Course"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="courseCode">Course Code *</Label>
                <Input
                  id="courseCode"
                  placeholder="e.g., CS101"
                  value={newCourseCode}
                  onChange={(e) =>
                    setNewCourseCode(e.target.value.toUpperCase())
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creditHours">Credit Hours</Label>
                <Input
                  id="creditHours"
                  type="number"
                  min="1"
                  max="6"
                  value={newCourseCreditHours}
                  onChange={(e) => setNewCourseCreditHours(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseTitle">Course Title *</Label>
              <Input
                id="courseTitle"
                placeholder="e.g., Introduction to Computer Science"
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseDescription">Description</Label>
              <Textarea
                id="courseDescription"
                placeholder="Brief description of the course content and objectives..."
                value={newCourseDescription}
                onChange={(e) => setNewCourseDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCourseModalOpen(false);
                setEditingCourse(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveCourse} disabled={addingCourse}>
              {addingCourse ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {editingCourse ? "Updating..." : "Adding..."}
                </>
              ) : editingCourse ? (
                "Update Course"
              ) : (
                "Add Course"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Course Confirmation */}
      <AlertDialog
        open={deleteCourseDialogOpen}
        onOpenChange={setDeleteCourseDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{courseToDelete?.title}" (
              {courseToDelete?.code})? This will also remove all enrollments,
              sessions, and level representative assignments associated with
              this course. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingCourse}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCourse}
              disabled={deletingCourse}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingCourse ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Course"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your profile and system configuration
          </p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-card border border-border flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="courses" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="modules" className="gap-2">
            <Layers className="w-4 h-4" />
            Modules
          </TabsTrigger>
          {/* <TabsTrigger value="organization" className="gap-2">
            <Building className="w-4 h-4" />
            Organization
          </TabsTrigger> */}
          {/* <TabsTrigger value="attendance" className="gap-2">
            <Clock className="w-4 h-4" />
            Attendance
          </TabsTrigger> */}
          {/* <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger> */}
          {/* Security and Kiosk tabs removed for system admin */}
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <div className="bg-card rounded-xl border border-border p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Your Profile
              </h3>
              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Profile
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-start gap-6">
              {/* Profile Photo */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                      <User className="w-10 h-10 text-primary" />
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  id="profile-photo-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePhotoUpload}
                />
                <Button variant="outline" size="sm" asChild>
                  <label
                    htmlFor="profile-photo-upload"
                    className="cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Change Photo
                  </label>
                </Button>
              </div>

              {/* Profile Fields */}
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input value={profileEmail} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="+233 (0) 000-000-000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Badge variant="secondary" className="text-sm">
                      {user?.role === Role.SYSTEM_ADMIN
                        ? "System Admin"
                        : user?.role === Role.OWNER
                          ? "Owner"
                          : "Admin"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="border-t border-border pt-6">
              <h4 className="text-sm font-medium text-foreground mb-4">
                Account Information
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Account Status</p>
                  <p className="font-medium text-green-600">Active</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Member Since</p>
                  <p className="font-medium">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Login</p>
                  <p className="font-medium">
                    {user?.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Courses Management */}
        <TabsContent value="courses">
          <div className="bg-card rounded-xl border border-border p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Course Management
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Add, edit, and manage courses in the system
                </p>
              </div>
              <Button onClick={openAddCourseModal}>
                <Plus className="w-4 h-4 mr-2" />
                Add Course
              </Button>
            </div>

            {loadingCourses ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium text-foreground mb-2">
                  No Courses Yet
                </h4>
                <p className="text-muted-foreground mb-4">
                  Add your first course to start managing attendance
                </p>
                <Button onClick={openAddCourseModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Course
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {courses.map((course) => {
                  const lecturers = getLecturersForCourse(course);
                  return (
                    <div
                      key={course.id}
                      className="border border-border rounded-lg p-4 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {course.title}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {course.code}
                              </Badge>
                            </div>
                            {course.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {course.description}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {course.enrollments?.length || 0} enrolled
                              </span>
                              <span className="flex items-center gap-1">
                                <GraduationCap className="w-3 h-3" />
                                {lecturers.length} lecturer
                                {lecturers.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditCourseModal(course)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setCourseToDelete(course);
                              setDeleteCourseDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {lecturers.length > 0 && (
                        <div className="mt-3 pl-11">
                          <p className="text-xs text-muted-foreground mb-1">
                            Assigned Lecturers:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {lecturers.map((l) => (
                              <span
                                key={l.id}
                                className="text-xs bg-secondary border border-border px-2 py-0.5 rounded-full"
                              >
                                {l.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Modules Management */}
        <TabsContent value="modules">
          <ModulesManagement />
        </TabsContent>

        {/* Organization Settings */}
        <TabsContent value="organization">
          <div className="bg-card rounded-xl border border-border p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Organization Details
              </h3>
              <Button onClick={handleSaveSystemSettings}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input defaultValue="Tech University" />
              </div>
              <div className="space-y-2">
                <Label>Organization Type</Label>
                <Select defaultValue="university">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="school">School</SelectItem>
                    <SelectItem value="university">University</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="organization">Organization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select defaultValue="gmt">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmt">GMT (UTC+0)</SelectItem>
                    <SelectItem value="est">Eastern Time (EST)</SelectItem>
                    <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                    <SelectItem value="utc">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date Format</Label>
                <Select defaultValue="dmy">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Attendance Settings */}
        <TabsContent value="attendance">
          <div className="bg-card rounded-xl border border-border p-6 space-y-6">
            <h3 className="text-lg font-semibold text-foreground">
              Attendance Rules
            </h3>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Late Threshold (minutes)</Label>
                <Input type="number" defaultValue="15" />
                <p className="text-xs text-muted-foreground">
                  Members arriving after this time will be marked as late
                </p>
              </div>
              <div className="space-y-2">
                <Label>Absent Threshold (minutes)</Label>
                <Input type="number" defaultValue="30" />
                <p className="text-xs text-muted-foreground">
                  Members not checked in after this time will be marked absent
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
                    Allow admins to manually mark attendance
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
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <div className="bg-card rounded-xl border border-border p-6 space-y-6">
            <h3 className="text-lg font-semibold text-foreground">
              Notification Preferences
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">
                    Late arrival alerts
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Notify admins when members arrive late
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">
                    Absence pattern alerts
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Alert when attendance patterns are abnormal
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">
                    Daily summary emails
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Send daily attendance reports to admins
                  </p>
                </div>
                <Switch />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Security Settings */}
        {isSuperAdmin && (
          <TabsContent value="security">
            <div className="bg-card rounded-xl border border-border p-6 space-y-6">
              <h3 className="text-lg font-semibold text-foreground">
                Security Settings
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">
                      Liveness detection
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Require eye blink or head movement during scan
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Audit logging</p>
                    <p className="text-sm text-muted-foreground">
                      Log all system actions for security review
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label>Minimum confidence threshold (%)</Label>
                  <Input type="number" defaultValue="95" min="80" max="100" />
                  <p className="text-xs text-muted-foreground">
                    Minimum facial recognition confidence required for
                    verification
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        )}

        {/* Kiosk Settings */}
        {isSuperAdmin && (
          <TabsContent value="kiosk">
            <div className="bg-card rounded-xl border border-border p-6 space-y-6">
              <h3 className="text-lg font-semibold text-foreground">
                Kiosk Configuration
              </h3>

              {/* Organization Logo */}
              <div className="space-y-4 pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  <Label className="text-base font-medium">
                    Organization Logo
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  This logo will be displayed on the kiosk screen
                </p>
                <div className="flex items-center gap-4">
                  {organizationLogo ? (
                    <div className="relative">
                      <img
                        src={organizationLogo}
                        alt="Organization Logo"
                        className="w-24 h-24 object-contain rounded-lg border border-border bg-secondary/50"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                        onClick={removeLogo}
                      >
                        ×
                      </Button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary/30">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <Button variant="outline" asChild>
                      <label htmlFor="logo-upload" className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Logo
                      </label>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Admin Phone Number */}
              <div className="space-y-4 pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-primary" />
                  <Label className="text-base font-medium">
                    Admin Contact Number
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Visitors not in the database can call this number directly
                  from the kiosk
                </p>
                <Input
                  type="tel"
                  placeholder="+233 (0) 123-456-789"
                  value={adminPhoneNumber}
                  onChange={(e) => setAdminPhoneNumber(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">
                      Auto-capture mode
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Automatically capture face when detected
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Sound effects</p>
                    <p className="text-sm text-muted-foreground">
                      Play sound on successful/failed verification
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">
                      QR code fallback
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Allow QR code scanning as backup method
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label>Screen timeout (seconds)</Label>
                  <Input type="number" defaultValue="30" />
                  <p className="text-xs text-muted-foreground">
                    Return to standby screen after inactivity
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SystemSetting;
