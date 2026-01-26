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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  MOCK_DEPARTMENTS,
  MOCK_COURSES,
  getAllUsers,
  User,
  useAuth,
  addDepartment,
  addCourse,
  getDepartments,
  getCourses,
} from "@/contexts/AuthContext";

const SystemSetting = () => {
  const { user } = useAuth();
  const [adminPhoneNumber, setAdminPhoneNumber] = useState("");
  const [organizationLogo, setOrganizationLogo] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<User[]>([]);

  // Department modal state
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [newDeptLabel, setNewDeptLabel] = useState("");
  const [newDeptValue, setNewDeptValue] = useState("");

  // Course modal state
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseId, setNewCourseId] = useState("");
  const [newCourseDept, setNewCourseDept] = useState("");

  // Trigger re-render when data changes
  const [refreshKey, setRefreshKey] = useState(0);

  const isSuperAdmin = user?.role === "super_admin";

  useEffect(() => {
    // Filter for lecturers (those with coursesTaught)
    setStaffList(getAllUsers().filter((u) => u.role === "lecturer" || u.coursesTaught));
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

  // Helper to get staff for a course
  const getStaffForCourse = (courseId: string) => {
    return staffList.filter((s) => s.coursesTaught?.includes(courseId));
  };

  // Handle adding a new department
  const handleAddDepartment = () => {
    if (!newDeptLabel.trim() || !newDeptValue.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    const success = addDepartment(
      newDeptLabel.trim(),
      newDeptValue.trim().toLowerCase(),
    );
    if (success) {
      toast.success(`Department "${newDeptLabel}" added successfully`);
      setDepartmentModalOpen(false);
      setNewDeptLabel("");
      setNewDeptValue("");
      setRefreshKey((prev) => prev + 1);
    } else {
      toast.error("Department already exists");
    }
  };

  // Handle adding a new course
  const handleAddCourse = () => {
    if (!newCourseName.trim() || !newCourseId.trim() || !newCourseDept) {
      toast.error("Please fill in all fields");
      return;
    }
    const success = addCourse(
      newCourseId.trim().toLowerCase(),
      newCourseName.trim(),
      newCourseDept,
    );
    if (success) {
      toast.success(`Course "${newCourseName}" added successfully`);
      setCourseModalOpen(false);
      setNewCourseName("");
      setNewCourseId("");
      setNewCourseDept("");
      setRefreshKey((prev) => prev + 1);
    } else {
      toast.error("Course already exists");
    }
  };

  // Get current departments and courses (for re-render)
  const departments = getDepartments();
  const courses = getCourses();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Add Department Modal */}
      <Dialog open={departmentModalOpen} onOpenChange={setDepartmentModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deptLabel">Department Name</Label>
              <Input
                id="deptLabel"
                placeholder="e.g., Computer Science"
                value={newDeptLabel}
                onChange={(e) => setNewDeptLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deptValue">Department Code</Label>
              <Input
                id="deptValue"
                placeholder="e.g., cs"
                value={newDeptValue}
                onChange={(e) => setNewDeptValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Short code used internally (lowercase)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDepartmentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddDepartment}>Add Department</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Course Modal */}
      <Dialog open={courseModalOpen} onOpenChange={setCourseModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="courseName">Course Name</Label>
              <Input
                id="courseName"
                placeholder="e.g., Data Structures"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseId">Course Code</Label>
              <Input
                id="courseId"
                placeholder="e.g., ds101"
                value={newCourseId}
                onChange={(e) => setNewCourseId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier for this course (lowercase)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseDept">Department</Label>
              <Select value={newCourseDept} onValueChange={setNewCourseDept}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCourseModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCourse}>Add Course</Button>
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
                  Departments & Courses
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDepartmentModalOpen(true)}
                  >
                    + Add Department
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCourseModalOpen(true)}
                  >
                    + Add Course
                  </Button>
                </div>
              </div>

              <Accordion
                type="single"
                collapsible
                className="w-full"
                key={refreshKey}
              >
                {departments.map((dept) => {
                  const deptCourses = courses.filter(
                    (c) => c.department === dept.value,
                  );
                  return (
                    <AccordionItem key={dept.value} value={dept.value}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Building className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-base">
                            {dept.label}
                          </span>
                          <span className="text-xs text-muted-foreground font-normal ml-2">
                            {deptCourses.length} Courses
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pl-4">
                        <div className="space-y-3 pt-2">
                          {deptCourses.map((course) => {
                            const lecturers = getStaffForCourse(course.id);
                            return (
                              <div
                                key={course.id}
                                className="border border-border rounded-lg p-3 bg-secondary/10"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2 mb-2">
                                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium">
                                      {course.name}
                                    </span>
                                  </div>
                                </div>
                                <div className="pl-6">
                                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                    <Users className="w-3 h-3" /> Assigned
                                    Lecturers:
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
                          {deptCourses.length === 0 && (
                            <p className="text-sm text-muted-foreground italic pl-4">
                              No courses available.
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
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
                    Parent notifications
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Send check-in/out alerts to parents of minors
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

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
