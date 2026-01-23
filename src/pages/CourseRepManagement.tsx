import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  UserCheck,
  Copy,
  Check,
  GraduationCap,
  ArrowRight,
  Search,
  BookOpen,
  Pencil,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  assignCourseRep,
  removeCourseRep,
  getCourseRepUsers,
  getAllUsers,
  User,
  MOCK_DEPARTMENTS,
  MOCK_COURSES,
} from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { EditMemberModal } from "@/components/members/EditMemberModal";
import { Member } from "@/types/attendance";

const CourseRepManagement = () => {
  const [courseRepList, setCourseRepList] = useState<User[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCourseRep, setSelectedCourseRep] = useState<User | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [courseRepSearch, setCourseRepSearch] = useState("");
  const [courseRepCourseFilter, setCourseRepCourseFilter] = useState("all");

  // Wizard State - Simplified to 2 steps
  const [step, setStep] = useState(1);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [availableStudents, setAvailableStudents] = useState<User[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    loadCourseReps();
  }, []);

  useEffect(() => {
    if (addModalOpen) {
      // Reset wizard
      setStep(1);
      setSelectedCourse("");
      setStudentSearch("");
      setSelectedStudent(null);
    }
  }, [addModalOpen]);

  // Load students for search
  useEffect(() => {
    if (step === 2) {
      const allUsers = getAllUsers();
      // Filter for students.
      // Ideally we would filter by Department/Program too, but mapping might be loose.
      // Let's filter by role 'student'.
      const students = allUsers.filter((u) => u.role === "student");
      setAvailableStudents(students);
    }
  }, [step]);

  const loadCourseReps = () => {
    setCourseRepList(getCourseRepUsers());
  };

  const handleAssign = () => {
    if (!selectedStudent || !selectedCourse) return;

    const result = assignCourseRep(selectedStudent.id, selectedCourse);

    if (result.success) {
      loadCourseReps();
      setAddModalOpen(false);
      toast({
        title: "Course Rep Assigned",
        description: `${selectedStudent.name} is now Course Rep for the selected course.`,
      });
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleRemoveCourseRep = () => {
    if (selectedCourseRep) {
      const success = removeCourseRep(selectedCourseRep.id);
      if (success) {
        loadCourseReps();
        toast({
          title: "Role Removed",
          description: `${selectedCourseRep.name} has been removed from course rep role`,
        });
      }
    }
    setDeleteDialogOpen(false);
    setSelectedCourseRep(null);
  };

  // Filtered Lists - Show all courses
  const allCourses = MOCK_COURSES;

  const filteredStudents = availableStudents
    .filter(
      (s) =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(studentSearch.toLowerCase()),
    )
    .slice(0, 5); // Limit results

  // Filter course reps by course name, rep name, or student ID
  const filteredCourseReps = courseRepList.filter((rep) => {
    // Filter by course if selected
    if (courseRepCourseFilter && courseRepCourseFilter !== "all") {
      if (
        !rep.courseRepData?.some(
          (data) => data.courseId === courseRepCourseFilter,
        )
      ) {
        return false;
      }
    }

    // Filter by search text (name, course name, or student ID)
    if (courseRepSearch) {
      const searchLower = courseRepSearch.toLowerCase();
      const matchesName = rep.name.toLowerCase().includes(searchLower);
      const matchesCourse = rep.courseRepData?.some((data) =>
        data.courseName.toLowerCase().includes(searchLower),
      );
      const matchesStudentId = rep.studentId
        ?.toLowerCase()
        .includes(searchLower);
      if (!matchesName && !matchesCourse && !matchesStudentId) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Course Representatives
          </h1>
          <p className="text-muted-foreground mt-1">
            Assign students as course reps to manage attendance sessions
          </p>
        </div>
        <Button variant="gradient" onClick={() => setAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Assign Course Rep
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <GraduationCap className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Course Rep Permissions
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Course representatives can create attendance sessions and take
              attendance of lecturers. They cannot manage members or other
              system settings.
            </p>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-xl border border-border">
        {/* Search by Name/Course/Student ID */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or student ID..."
            className="pl-9"
            value={courseRepSearch}
            onChange={(e) => setCourseRepSearch(e.target.value)}
          />
        </div>

        {/* Filter by Course */}
        <Select
          value={courseRepCourseFilter}
          onValueChange={setCourseRepCourseFilter}
        >
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {MOCK_COURSES.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {filteredCourseReps.length} rep
          {filteredCourseReps.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Course Rep List */}
      <div className="bg-card rounded-xl border border-border">
        {filteredCourseReps.length === 0 &&
        (courseRepSearch || courseRepCourseFilter !== "all") ? (
          <div className="p-12 text-center">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No results found
            </h3>
            <p className="text-muted-foreground mb-4">
              No course representatives match your filters
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setCourseRepSearch("");
                setCourseRepCourseFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : courseRepList.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No course representatives
            </h3>
            <p className="text-muted-foreground mb-4">
              Assign students as course reps to courses to help manage
              attendance
            </p>
            <Button variant="outline" onClick={() => setAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Assign First Rep
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredCourseReps.map((rep) => (
              <div
                key={rep.id}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{rep.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        Course Rep
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {rep.courseRepData?.map((data, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-[10px] font-normal gap-1"
                        >
                          <BookOpen className="w-3 h-3" />
                          {data.courseName}
                        </Badge>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">
                      {rep.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      // Convert User to Member format for EditMemberModal
                      const memberData: Member = {
                        id: rep.id,
                        name: rep.name,
                        email: rep.email,
                        role: rep.role as Member["role"],
                        department: rep.department,
                        studentId: rep.studentId,
                        isMinor: false,
                        createdAt: new Date(),
                        status: "active",
                      };
                      setEditingMember(memberData);
                      setEditModalOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setSelectedCourseRep(rep);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Course Rep Wizard Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Assign Course Representative (Step {step}/2)
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {/* Step 1: Select Course */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <Label>Select Course</Label>
                <Select
                  value={selectedCourse}
                  onValueChange={setSelectedCourse}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose course..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allCourses.length > 0 ? (
                      allCourses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name} ({course.department})
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No courses found
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Step 2: Select Student */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <Label>Search Student</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    className="pl-9"
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setSelectedStudent(null);
                    }}
                  />
                </div>

                {studentSearch.length > 0 && (
                  <div className="border rounded-md mt-2 max-h-[200px] overflow-y-auto">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => (
                        <div
                          key={student.id}
                          className={`p-3 text-sm cursor-pointer hover:bg-muted ${selectedStudent?.id === student.id ? "bg-primary/10" : ""}`}
                          onClick={() => setSelectedStudent(student)}
                        >
                          <div className="font-medium">{student.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {student.email}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        No students match
                      </div>
                    )}
                  </div>
                )}

                {selectedStudent && (
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                    <p className="text-sm font-medium">
                      Selected: {selectedStudent.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Will be assigned to:{" "}
                      {MOCK_COURSES.find((c) => c.id === selectedCourse)?.name}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setAddModalOpen(false)}>
                Cancel
              </Button>
            )}

            {step < 2 ? (
              <Button
                variant="gradient"
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !selectedCourse}
              >
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                variant="gradient"
                onClick={handleAssign}
                disabled={!selectedStudent}
              >
                Assign <Check className="w-4 h-4 ml-2" />
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Modal */}
      <EditMemberModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        member={editingMember}
        onSave={() => {
          loadCourseReps();
          setEditModalOpen(false);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Course Representative?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {selectedCourseRep?.name} from the course rep
              role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveCourseRep}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CourseRepManagement;
