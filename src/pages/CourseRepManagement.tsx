import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  UserCheck,
  GraduationCap,
  ArrowRight,
  Search,
  BookOpen,
  Pencil,
  Filter,
  Loader2,
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
import { usersServices } from "@/services/users.services";
import { coursesService, Course } from "@/services/courses.services";
import { Role } from "@/enums/enums";
import { Badge } from "@/components/ui/badge";
import { EditMemberModal } from "@/components/members/EditMemberModal";
import { Member } from "@/types/attendance";
import { useAuth } from "@/contexts/AuthContext";

// Simplified User type for this component
interface CourseRepUser {
  id: string; // User ID
  studentTableId?: string; // Student table ID (needed for API calls)
  name: string;
  email: string;
  role: string;
  studentId?: string; // Student number/matric
  courseRepData?: Array<{
    courseId: string;
    courseName: string;
    courseCode: string;
  }>;
}

// Student type for selection
interface StudentOption {
  id: string; // User ID
  studentTableId: string; // Student table ID (needed for API calls)
  name: string;
  email: string;
  studentNo?: string;
}

const CourseRepManagement = () => {
  const { token } = useAuth();
  const [courseRepList, setCourseRepList] = useState<CourseRepUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCourseRep, setSelectedCourseRep] =
    useState<CourseRepUser | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [courseRepSearch, setCourseRepSearch] = useState("");
  const [courseRepCourseFilter, setCourseRepCourseFilter] = useState("all");
  const [isAssigning, setIsAssigning] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [selectedCourseForRemoval, setSelectedCourseForRemoval] = useState<
    string | null
  >(null);

  // Wizard State - Simplified to 2 steps
  const [step, setStep] = useState(1);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(
    null,
  );
  const [availableStudents, setAvailableStudents] = useState<StudentOption[]>(
    [],
  );
  const [allCourses, setAllCourses] = useState<Course[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      loadCourseReps();
    }
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadCourses = async () => {
    try {
      const response = await coursesService.getAllCourses();
      if (response.success && response.data) {
        const coursesData = Array.isArray(response.data)
          ? response.data
          : response.data.data || [];
        setAllCourses(coursesData);
      } else {
        setAllCourses([]);
      }
    } catch {
      setAllCourses([]);
    }
  };

  useEffect(() => {
    if (addModalOpen) {
      // Reset wizard
      setStep(1);
      setSelectedCourse("");
      setStudentSearch("");
      setSelectedStudent(null);
    }
  }, [addModalOpen]);

  // Load students for search (only students who are not already reps)
  useEffect(() => {
    if (step === 2 && selectedCourse) {
      const loadStudents = async () => {
        const response = await usersServices.getAllUsers();
        if (response.success && response.data?.users) {
          // Get students who are enrolled in the selected course but not already reps
          const students = response.data.users
            .filter((u) => u.role === Role.STUDENT && u.student)
            .map((u) => ({
              id: u.id,
              studentTableId: u.student!.id,
              name: u.name,
              email: u.email,
              studentNo: u.student?.studentId || u.student?.matricNo,
            }));
          setAvailableStudents(students);
        }
      };
      loadStudents();
    }
  }, [step, selectedCourse]);

  const loadCourseReps = async () => {
    if (!token) return;

    setLoading(true);
    try {
      // Use the dedicated fetch-reps endpoint to get course reps with their course assignments
      const response = await usersServices.fetchCourseReps(token);

      if (response.success && response.data?.reps) {
        // Transform the response data to match our CourseRepUser interface
        const reps: CourseRepUser[] = response.data.reps.map((rep) => {
          return {
            id: rep.student?.user?.id || rep.studentId,
            studentTableId: rep.studentId,
            name: rep.student?.user?.name || "Unknown",
            email: rep.student?.user?.email || "",
            role: Role.REP,
            studentId: rep.student?.studentId || rep.student?.matricNo,
            courseRepData: [
              {
                courseId: rep.course?.id || rep.courseId,
                courseName: rep.course?.title || "Unknown Course",
                courseCode: rep.course?.code || "",
              },
            ],
          };
        });

        // Group reps by user ID to combine their course assignments
        const groupedReps = reps.reduce((acc, rep) => {
          const existing = acc.find((r) => r.id === rep.id);
          if (existing && rep.courseRepData) {
            existing.courseRepData = [
              ...(existing.courseRepData || []),
              ...rep.courseRepData,
            ];
          } else {
            acc.push(rep);
          }
          return acc;
        }, [] as CourseRepUser[]);

        setCourseRepList(groupedReps);
      } else {
        setCourseRepList([]);
      }
    } catch {
      setCourseRepList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedStudent || !selectedCourse || !token) {
      toast({
        title: "Error",
        description: "Please select both a course and a student",
        variant: "destructive",
      });
      return;
    }

    setIsAssigning(true);
    try {
      // Use the student table ID (not user ID) for the API call
      const response = await usersServices.assignRep(
        selectedCourse,
        selectedStudent.studentTableId,
        token,
      );

      if (response.success) {
        toast({
          title: "Success",
          description: `${selectedStudent.name} has been assigned as course representative`,
        });
        setAddModalOpen(false);
        loadCourseReps(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description:
            response.error || "Failed to assign course representative",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveCourseRep = async () => {
    if (!selectedCourseRep || !token) {
      setDeleteDialogOpen(false);
      return;
    }

    // If we have a specific course to remove from, use that
    // Otherwise, we need to remove from all courses (or show an error)
    if (!selectedCourseRep.studentTableId) {
      toast({
        title: "Error",
        description: "Student information not found",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      setSelectedCourseRep(null);
      return;
    }

    // If the rep has course data, remove from the selected course
    // Otherwise, we need to get the course info first
    const courseId =
      selectedCourseForRemoval ||
      selectedCourseRep.courseRepData?.[0]?.courseId;

    if (!courseId) {
      toast({
        title: "Error",
        description:
          "No course assignment found for this representative. They may need to be removed manually from the database.",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      setSelectedCourseRep(null);
      return;
    }

    setIsRemoving(true);
    try {
      const response = await usersServices.removeCourseRep(
        courseId,
        selectedCourseRep.studentTableId,
        token,
      );

      if (response.success) {
        toast({
          title: "Success",
          description: `${selectedCourseRep.name} has been removed as course representative`,
        });
        loadCourseReps(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description:
            response.error || "Failed to remove course representative",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
      setDeleteDialogOpen(false);
      setSelectedCourseRep(null);
      setSelectedCourseForRemoval(null);
    }
  };

  const filteredStudents = availableStudents
    .filter(
      (s) =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.studentNo?.toLowerCase().includes(studentSearch.toLowerCase()),
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
            {allCourses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.title}
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

                    {rep.studentId && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ID: {rep.studentId}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {rep.courseRepData && rep.courseRepData.length > 0 ? (
                        rep.courseRepData.map((data, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-[10px] font-normal gap-1"
                          >
                            <BookOpen className="w-3 h-3" />
                            {data.courseName || data.courseCode}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          No course assignment data
                        </span>
                      )}
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
                      // If rep has courses, pre-select the first one for removal
                      if (rep.courseRepData && rep.courseRepData.length > 0) {
                        setSelectedCourseForRemoval(
                          rep.courseRepData[0].courseId,
                        );
                      }
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
                          {course.title} ({course.code})
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
                            {student.email}{" "}
                            {student.studentNo && `• ${student.studentNo}`}
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
                      {allCourses.find((c) => c.id === selectedCourse)?.title}
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
                disabled={!selectedStudent || isAssigning}
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    Assign <UserCheck className="w-4 h-4 ml-2" />
                  </>
                )}
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
              role and change their role back to student.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* If rep has multiple courses, let user select which one to remove from */}
          {selectedCourseRep?.courseRepData &&
            selectedCourseRep.courseRepData.length > 1 && (
              <div className="py-4">
                <Label>Select course to remove from:</Label>
                <Select
                  value={selectedCourseForRemoval || ""}
                  onValueChange={setSelectedCourseForRemoval}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select course..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCourseRep.courseRepData.map((course) => (
                      <SelectItem key={course.courseId} value={course.courseId}>
                        {course.courseName} ({course.courseCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveCourseRep}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Role"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CourseRepManagement;
