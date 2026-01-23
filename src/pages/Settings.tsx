import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
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
    Building, Bell, Shield, Monitor, Clock, Save, Phone, Upload, ImageIcon, 
    BookOpen, Users, ScanFace, CheckCircle2 
} from 'lucide-react';
import { toast } from 'sonner';
import { MOCK_DEPARTMENTS, MOCK_COURSES, getAllUsers, User, useAuth } from '@/contexts/AuthContext';
import { PhotoCapture } from "@/components/ui/PhotoCapture";
import { MultiSelect } from "@/components/ui/multi-select";
import { FacialRegistration } from '@/components/auth/FacialRegistration';

// --- Profile Settings Component ---
const ProfileSettings = () => {
    const { user } = useAuth();
    
    // State for editable fields
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const [coursesTaken, setCoursesTaken] = useState<string[]>([]);
    const [facialData, setFacialData] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            // Load initial data
            if (Array.isArray(user.coursesTaken)) {
                setCoursesTaken(user.coursesTaken);
            } else if (typeof user.coursesTaken === 'string') {
                setCoursesTaken(user.coursesTaken.split(',').filter(Boolean));
            }
        }
    }, [user]);

    if (!user) return null;

    const isStudent = user.role === 'student';
    const isCourseRep = user.role === 'course_rep';

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showSaveAlert, setShowSaveAlert] = useState(false);

    // Track changes
    useEffect(() => {
        if (!user) return;
        
        let hasChanges = false;
        
        // Check courses changed
        const originalCourses = Array.isArray(user.coursesTaken) ? user.coursesTaken : (typeof user.coursesTaken === 'string' ? user.coursesTaken.split(',').filter(Boolean) : []);
        // Simple comparison for arrays
        const sortedOriginal = [...originalCourses].sort();
        const sortedCurrent = [...coursesTaken].sort();
        
        if (sortedOriginal.length !== sortedCurrent.length) {
            hasChanges = true;
        } else {
            const isSame = sortedOriginal.every((val, index) => val === sortedCurrent[index]);
            if (!isSame) hasChanges = true;
        }

        if (profilePhoto) hasChanges = true; // Assuming any new capture is a change
        if (facialData) hasChanges = true;

        setHasUnsavedChanges(hasChanges);
    }, [profilePhoto, coursesTaken, facialData, user]);

    const handleSaveProfile = () => {
       setShowSaveAlert(true);
    };

    const confirmSave = async () => {
         // Mock save logic
        console.log("Saving profile:", { profilePhoto, coursesTaken, facialData });
        
        // In reality: await updateUser(user.id, { coursesTaken: coursesTaken, ... })
        // Since updateUser is not exposed in mock context yet, we simulate delay and success.
        console.log("Mocking update user", { coursesTaken, facialData, profilePhoto });
        
        toast.success("Profile updated successfully");
        setShowSaveAlert(false);
        setHasUnsavedChanges(false);
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
                        <AlertDialogAction onClick={confirmSave}>Save Changes</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex items-start justify-between">
                <div>
                   <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
                   <p className="text-muted-foreground mt-1">Manage your personal information</p>
                </div>
                 <Button variant="gradient" onClick={handleSaveProfile} disabled={!hasUnsavedChanges}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Identity & Photo */}
                <div className="md:col-span-1 space-y-6">
                     <div className="bg-card rounded-xl border border-border p-6 space-y-4">
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
                            <Input value={user.studentId || user.staffId || user.id} disabled className="bg-muted" />
                        </div>
                         <div className="space-y-2">
                            <Label>Role (Read Only)</Label>
                             <div className="px-3 py-2 rounded-md border border-input bg-muted text-sm capitalize">
                                {user.role?.replace('_', ' ')}
                            </div>
                        </div>
                     </div>
                </div>

                {/* Right Column: Facial Data & Courses */}
                <div className="md:col-span-2 space-y-6">
                     {/* Facial Registration Section */}
                     <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <ScanFace className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold text-lg">Facial Recognition Data</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Update your facial data for kiosk mode and attendance marking.
                        </p>
                        <div className="p-4 bg-secondary/10 rounded-xl">
                             <FacialRegistration 
                                onCapture={(data) => setFacialData(data)}
                             />
                        </div>
                     </div>

                    {/* Course Rep Specifics */}
                    {isCourseRep && (
                        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Shield className="w-5 h-5 text-primary" />
                                <h3 className="font-semibold text-lg">Assigned Courses (Course Rep)</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                You are a representative for the following courses. This is assigned by administrators.
                            </p>
                            <div className="space-y-2">
                                {user.courseRepData?.map(c => (
                                    <div key={c.courseId} className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/50">
                                        <span className="font-medium">{c.courseName}</span>
                                        <span className="text-xs text-muted-foreground uppercase">{c.department}</span>
                                    </div>
                                ))}
                                {(!user.courseRepData || user.courseRepData.length === 0) && (
                                     <p className="text-sm italic text-muted-foreground">No courses assigned.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Courses Taken / Taught */}
                    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                         <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold text-lg">
                                {isStudent || isCourseRep ? "Courses Registered" : "Courses Taught"}
                            </h3>
                        </div>
                        {isStudent || isCourseRep ? (
                            <div className="space-y-2">
                                <Label>Select Courses</Label>
                                <MultiSelect
                                    options={MOCK_COURSES.map(c => ({ label: c.name, value: c.id }))}
                                    selected={coursesTaken}
                                    onChange={setCoursesTaken}
                                    placeholder="Select courses..."
                                    className="w-full"
                                />
                                <p className="text-xs text-muted-foreground">You can update your registered courses here.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label>Teaching Courses (Read Only)</Label>
                                <div className="space-y-2">
                                    {(user.coursesTaught || []).map(cid => {
                                        const c = MOCK_COURSES.find(mc => mc.id === cid);
                                        return (
                                            <div key={cid} className="p-2 border border-border rounded bg-muted/50 text-sm">
                                                {c?.name || cid}
                                            </div>
                                        )
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

// --- System Settings Component (Original Logic) ---
const SystemSettings = () => {
    const [adminPhoneNumber, setAdminPhoneNumber] = useState('');
    const [organizationLogo, setOrganizationLogo] = useState<string | null>(null);
    const [staffList, setStaffList] = useState<User[]>([]);

    useEffect(() => {
        setStaffList(getAllUsers().filter(u => u.role === 'staff'));
    }, []);

    const handleSave = () => {
        // In a real app, save these to localStorage or backend
        localStorage.setItem('kioskSettings', JSON.stringify({
            adminPhoneNumber,
            organizationLogo
        }));
        toast.success('Settings saved successfully!');
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
        return staffList.filter(s => s.coursesTaught?.includes(courseId));
    };

    return (
        <div className="space-y-6 animate-fade-in">
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
                    <TabsTrigger value="security" className="gap-2">
                        <Shield className="w-4 h-4" />
                        Security
                    </TabsTrigger>
                    <TabsTrigger value="kiosk" className="gap-2">
                        <Monitor className="w-4 h-4" />
                        Kiosk
                    </TabsTrigger>
                </TabsList>

                {/* Organization Settings */}
                <TabsContent value="organization">
                    <div className="bg-card rounded-xl border border-border p-6 space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-foreground mb-4">Organization Details</h3>
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
                                <h3 className="text-lg font-semibold text-foreground">Departments & Courses</h3>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm">+ Add Department</Button>
                                    <Button variant="outline" size="sm">+ Add Course</Button>
                                </div>
                            </div>

                            <Accordion type="single" collapsible className="w-full">
                                {MOCK_DEPARTMENTS.map(dept => {
                                    const deptCourses = MOCK_COURSES.filter(c => c.department === dept.value);
                                    return (
                                        <AccordionItem key={dept.value} value={dept.value}>
                                            <AccordionTrigger className="hover:no-underline">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                                        <Building className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-medium text-base">{dept.label}</span>
                                                    <span className="text-xs text-muted-foreground font-normal ml-2">
                                                        {deptCourses.length} Courses
                                                    </span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pl-4">
                                                <div className="space-y-3 pt-2">
                                                    {deptCourses.map(course => {
                                                        const lecturers = getStaffForCourse(course.id);
                                                        return (
                                                            <div key={course.id} className="border border-border rounded-lg p-3 bg-secondary/10">
                                                                <div className="flex items-start justify-between">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                                                                        <span className="font-medium">{course.name}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="pl-6">
                                                                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                                                        <Users className="w-3 h-3" /> Assigned Lecturers:
                                                                    </p>
                                                                    {lecturers.length > 0 ? (
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {lecturers.map(l => (
                                                                                <span key={l.id} className="text-xs bg-background border border-border px-2 py-0.5 rounded-full">
                                                                                    {l.name}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground italic">No lecturers assigned</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                    {deptCourses.length === 0 && (
                                                        <p className="text-sm text-muted-foreground italic pl-4">No courses available.</p>
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
                        <h3 className="text-lg font-semibold text-foreground">Attendance Rules</h3>

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
                                    <p className="font-medium text-foreground">Auto-complete sessions</p>
                                    <p className="text-sm text-muted-foreground">
                                        Automatically end sessions after scheduled time
                                    </p>
                                </div>
                                <Switch defaultChecked />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                                <div>
                                    <p className="font-medium text-foreground">Allow manual check-in</p>
                                    <p className="text-sm text-muted-foreground">
                                        Allow admins to manually mark attendance
                                    </p>
                                </div>
                                <Switch defaultChecked />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                                <div>
                                    <p className="font-medium text-foreground">Require check-out</p>
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
                        <h3 className="text-lg font-semibold text-foreground">Notification Preferences</h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                                <div>
                                    <p className="font-medium text-foreground">Parent notifications</p>
                                    <p className="text-sm text-muted-foreground">
                                        Send check-in/out alerts to parents of minors
                                    </p>
                                </div>
                                <Switch defaultChecked />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                                <div>
                                    <p className="font-medium text-foreground">Late arrival alerts</p>
                                    <p className="text-sm text-muted-foreground">
                                        Notify admins when members arrive late
                                    </p>
                                </div>
                                <Switch defaultChecked />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                                <div>
                                    <p className="font-medium text-foreground">Absence pattern alerts</p>
                                    <p className="text-sm text-muted-foreground">
                                        Alert when attendance patterns are abnormal
                                    </p>
                                </div>
                                <Switch defaultChecked />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                                <div>
                                    <p className="font-medium text-foreground">Daily summary emails</p>
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
                <TabsContent value="security">
                    <div className="bg-card rounded-xl border border-border p-6 space-y-6">
                        <h3 className="text-lg font-semibold text-foreground">Security Settings</h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                                <div>
                                    <p className="font-medium text-foreground">Liveness detection</p>
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
                                    Minimum facial recognition confidence required for verification
                                </p>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Kiosk Settings */}
                <TabsContent value="kiosk">
                    <div className="bg-card rounded-xl border border-border p-6 space-y-6">
                        <h3 className="text-lg font-semibold text-foreground">Kiosk Configuration</h3>

                        {/* Organization Logo */}
                        <div className="space-y-4 pb-4 border-b border-border">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="w-5 h-5 text-primary" />
                                <Label className="text-base font-medium">Organization Logo</Label>
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
                                <Label className="text-base font-medium">Admin Contact Number</Label>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Visitors not in the database can call this number directly from the kiosk
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
                                    <p className="font-medium text-foreground">Auto-capture mode</p>
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
                                    <p className="font-medium text-foreground">QR code fallback</p>
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
            </Tabs>
        </div>
    );
};

const Settings = () => {
    const { user } = useAuth();

    if (!user) return null;

    if (user.role === 'super_admin' || user.role === 'admin') {
        return <SystemSettings />;
    }

    return <ProfileSettings />;
};

export default Settings;
