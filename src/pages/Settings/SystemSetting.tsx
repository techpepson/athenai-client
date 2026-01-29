import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/enums/enums";
import { coursesService, Course } from "@/services/courses.services";
import { usersServices } from "@/services/users.services";
import { IUserPublic } from "@/interface/user.interface";

const SystemSetting = () => {
  const { user } = useAuth();
  const [adminPhoneNumber, setAdminPhoneNumber] = useState("");
  const [organizationLogo, setOrganizationLogo] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<IUserPublic[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Course modal state
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseDescription, setNewCourseDescription] = useState("");
  const [addingCourse, setAddingCourse] = useState(false);

  const isSuperAdmin =
    user?.role === Role.SYSTEM_ADMIN || user?.role === Role.OWNER;

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
    // Load courses from API
    const loadCourses = async () => {
      setLoadingCourses(true);
      try {
        const response = await coursesService.getAllCourses();
        if (response.success && response.data?.data) {
          setCourses(response.data.data);
        } else {
          setCourses([]);
        }
      } catch {
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };
    loadCourses();
  }, []);

  const handleSave = () => {
    // In a real app, save these to localStorage or backend
    localStorage.setItem(
      "kioskSettings",
      JSON.stringify({
        adminPhoneNumber,
        organizationLogo,
      }),
    );
    toast.success("Settings saved successfully!");
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

  // Helper to get lecturers for a course
  const getLecturersForCourse = (course: Course) => {
    // Course may have lecturers array from API
    if (course.lecturers && course.lecturers.length > 0) {
      // Map lecturer IDs to staff list
      return staffList.filter((s) =>
        course.lecturers?.some((l) => l.userId === s.id),
      );
    }
    return [];
  };

  // Handle adding a new course
  const handleAddCourse = async () => {
    if (!newCourseCode.trim() || !newCourseTitle.trim()) {
      toast.error("Please fill in course code and title");
      return;
    }
    setAddingCourse(true);
    try {
      const response = await coursesService.addCourse({
        courseCode: newCourseCode.trim().toUpperCase(),
        title: newCourseTitle.trim(),
        description: newCourseDescription.trim() || newCourseTitle.trim(),
      });

      if (response.success) {
        toast.success(`Course "${newCourseTitle}" added successfully`);
        setCourseModalOpen(false);
        setNewCourseCode("");
        setNewCourseTitle("");
        setNewCourseDescription("");
        // Reload courses
        const coursesResponse = await coursesService.getAllCourses();
        if (coursesResponse.success && coursesResponse.data?.data) {
          setCourses(coursesResponse.data.data);
        }
      } else {
        toast.error(response.error || "Failed to add course");
      }
    } catch {
      toast.error("Failed to add course");
    } finally {
      setAddingCourse(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Add Course Modal */}
      <Dialog open={courseModalOpen} onOpenChange={setCourseModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="courseCode">Course Code</Label>
              <Input
                id="courseCode"
                placeholder="e.g., CS101"
                value={newCourseCode}
                onChange={(e) => setNewCourseCode(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier for this course
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseTitle">Course Title</Label>
              <Input
                id="courseTitle"
                placeholder="e.g., Introduction to Computer Science"
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseDescription">Description (Optional)</Label>
              <Input
                id="courseDescription"
                placeholder="Brief description of the course"
                value={newCourseDescription}
                onChange={(e) => setNewCourseDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCourseModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCourse} disabled={addingCourse}>
              {addingCourse ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Course"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your attendance system preferences
          </p>
        </div>
        <Button variant="gradient" onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="organization" className="gap-2">
            <Building className="w-4 h-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2">
            <Clock className="w-4 h-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
          )}
          {isSuperAdmin && (
            <TabsTrigger value="kiosk" className="gap-2">
              <Monitor className="w-4 h-4" />
              Kiosk
            </TabsTrigger>
          )}
        </TabsList>

        {/* Organization Settings */}
        <TabsContent value="organization">
          <div className="bg-card rounded-xl border border-border p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Organization Details
              </h3>
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
                  <Select defaultValue="est">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="est">Eastern Time (EST)</SelectItem>
                      <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                      <SelectItem value="utc">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select defaultValue="mdy">
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

            <div className="border-t border-border pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Courses
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCourseModalOpen(true)}
                >
                  + Add Course
                </Button>
              </div>

              {loadingCourses ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : courses.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No courses available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add your first course to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {courses.map((course) => {
                    const lecturers = getLecturersForCourse(course);
                    return (
                      <div
                        key={course.id}
                        className="border border-border rounded-lg p-4 bg-secondary/10"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-medium">
                                {course.title}
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {course.code}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 pl-11">
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Users className="w-3 h-3" /> Assigned Lecturers:
                          </p>
                          {lecturers.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {lecturers.map((l) => (
                                <span
                                  key={l.id}
                                  className="text-xs bg-background border border-border px-2 py-0.5 rounded-full"
                                >
                                  {l.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              No lecturers assigned
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                  placeholder="+1 (555) 123-4567"
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
