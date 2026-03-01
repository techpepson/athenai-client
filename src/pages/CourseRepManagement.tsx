import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  UserCheck,
  GraduationCap,
  Search,
  BookOpen,
  Pencil,
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
import { useToast } from "@/hooks/use-toast";
import { usersServices } from "@/services/users.services";
import { Role } from "@/enums/enums";
import { Badge } from "@/components/ui/badge";
import { EditMemberModal } from "@/components/members/EditMemberModal";
import { Member } from "@/types/attendance";
import { useAuth } from "@/contexts/AuthContext";

// Rep user type for this component
interface RepUser {
  id: string; // User ID
  studentTableId: string; // Student table ID (needed for API calls)
  name: string;
  email: string;
  phone?: string;
  studentId?: string; // Student number/matric
  level?: number;
  assignedAt?: string;
  enrolledCourses?: Array<{
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
  level?: number;
}

const CourseRepManagement = () => {
  const { token } = useAuth();
  const [repList, setRepList] = useState<RepUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRep, setSelectedRep] = useState<RepUser | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Add modal state
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(
    null,
  );
  const [availableStudents, setAvailableStudents] = useState<StudentOption[]>(
    [],
  );
  const [loadingStudents, setLoadingStudents] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      loadReps();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (addModalOpen) {
      setStudentSearch("");
      setSelectedStudent(null);
      loadStudents();
    }
  }, [addModalOpen]);

  const loadStudents = async () => {
    setLoadingStudents(true);
    try {
      const response = await usersServices.getAllUsers();
      if (response.success && response.data?.users) {
        // Only students (not already REP) are eligible
        const students = response.data.users
          .filter((u) => u.role === Role.STUDENT && u.student)
          .map((u) => ({
            id: u.id,
            studentTableId: u.student!.id,
            name: u.name,
            email: u.email,
            studentNo: u.student?.studentId || u.student?.matricNo,
            level: u.student?.level,
          }));
        setAvailableStudents(students);
      }
    } catch {
      setAvailableStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadReps = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await usersServices.getAllReps(token);

      if (response.success && response.data?.data) {
        const reps: RepUser[] = response.data.data.map((rep) => ({
          id: rep.student?.user?.id || rep.studentId,
          studentTableId: rep.studentId,
          name: rep.student?.user?.name || "Unknown",
          email: rep.student?.user?.email || "",
          phone: rep.student?.user?.phone,
          studentId:
            rep.student?.studentId || rep.student?.matricNo || undefined,
          level: rep.student?.level,
          assignedAt: rep.assignedAt,
          enrolledCourses:
            rep.student?.enrollments?.map((e) => ({
              courseId: e.courseId,
              courseName: e.course?.title || "Unknown Course",
              courseCode: e.course?.code || "",
            })) || [],
        }));

        setRepList(reps);
      } else {
        setRepList([]);
      }
    } catch {
      setRepList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedStudent || !token) {
      toast({
        title: "Error",
        description: "Please select a student",
        variant: "destructive",
      });
      return;
    }

    setIsAssigning(true);
    try {
      const response = await usersServices.assignRep(
        selectedStudent.studentTableId,
        token,
      );

      if (response.success) {
        toast({
          title: "Success",
          description: `${selectedStudent.name} has been assigned as a student representative`,
        });
        setAddModalOpen(false);
        loadReps();
      } else {
        toast({
          title: "Error",
          description:
            response.error || "Failed to assign student representative",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveRep = async () => {
    if (!selectedRep || !token) {
      setDeleteDialogOpen(false);
      return;
    }

    if (!selectedRep.studentTableId) {
      toast({
        title: "Error",
        description: "Student information not found",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      setSelectedRep(null);
      return;
    }

    setIsRemoving(true);
    try {
      const response = await usersServices.removeRep(
        selectedRep.studentTableId,
        token,
      );

      if (response.success) {
        toast({
          title: "Success",
          description: `${selectedRep.name} has been removed as student representative`,
        });
        loadReps();
      } else {
        toast({
          title: "Error",
          description:
            response.error || "Failed to remove student representative",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
      setDeleteDialogOpen(false);
      setSelectedRep(null);
    }
  };

  const filteredStudents = availableStudents
    .filter(
      (s) =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.studentNo?.toLowerCase().includes(studentSearch.toLowerCase()),
    )
    .slice(0, 8);

  // Filter reps by search text (name, student ID, email)
  const filteredReps = repList.filter((rep) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      rep.name.toLowerCase().includes(q) ||
      rep.email.toLowerCase().includes(q) ||
      rep.studentId?.toLowerCase().includes(q) ||
      rep.enrolledCourses?.some(
        (c) =>
          c.courseName.toLowerCase().includes(q) ||
          c.courseCode.toLowerCase().includes(q),
      )
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Student Representatives
          </h1>
          <p className="text-muted-foreground mt-1">
            Assign students as representatives to manage attendance sessions
          </p>
        </div>
        <Button variant="gradient" onClick={() => setAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Assign Rep
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <GraduationCap className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Student Rep Permissions
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Student representatives can create attendance sessions and take
              attendance of lecturers for all courses they are enrolled in. They
              serve as reps throughout their studies, not per-course.
            </p>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, student ID, or course..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {filteredReps.length} rep{filteredReps.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Rep List */}
      <div className="bg-card rounded-xl border border-border">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-muted-foreground mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">Loading representatives...</p>
          </div>
        ) : filteredReps.length === 0 && searchQuery ? (
          <div className="p-12 text-center">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No results found
            </h3>
            <p className="text-muted-foreground mb-4">
              No student representatives match your search
            </p>
            <Button variant="outline" onClick={() => setSearchQuery("")}>
              Clear Search
            </Button>
          </div>
        ) : repList.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No student representatives
            </h3>
            <p className="text-muted-foreground mb-4">
              Assign students as reps to help manage attendance
            </p>
            <Button variant="outline" onClick={() => setAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Assign First Rep
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredReps.map((rep) => (
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
                        Student Rep
                      </Badge>
                      {rep.level && (
                        <Badge variant="outline" className="text-xs">
                          Level {rep.level}
                        </Badge>
                      )}
                    </div>

                    {rep.studentId && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ID: {rep.studentId}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {rep.enrolledCourses && rep.enrolledCourses.length > 0 ? (
                        rep.enrolledCourses.map((course, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-[10px] font-normal gap-1"
                          >
                            <BookOpen className="w-3 h-3" />
                            {course.courseCode || course.courseName}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          No enrolled courses
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
                      const memberData: Member = {
                        id: rep.id,
                        name: rep.name,
                        email: rep.email,
                        role: "REP" as Member["role"],
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
                      setSelectedRep(rep);
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

      {/* Assign Rep Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Student Representative</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <Label>Search Student</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or student ID..."
                className="pl-9"
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setSelectedStudent(null);
                }}
              />
            </div>

            {loadingStudents ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading students...
                </span>
              </div>
            ) : studentSearch.length > 0 ? (
              <div className="border rounded-md max-h-[240px] overflow-y-auto">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className={`p-3 text-sm cursor-pointer hover:bg-muted transition-colors ${selectedStudent?.id === student.id ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}
                      onClick={() => setSelectedStudent(student)}
                    >
                      <div className="font-medium">{student.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {student.email}
                        {student.studentNo && ` · ${student.studentNo}`}
                        {student.level && ` · Level ${student.level}`}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    No students match your search
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Type to search for a student by name, email, or student ID
              </p>
            )}

            {selectedStudent && (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                <p className="text-sm font-medium">
                  Selected: {selectedStudent.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedStudent.email}
                  {selectedStudent.studentNo &&
                    ` · ${selectedStudent.studentNo}`}
                  {selectedStudent.level && ` · Level ${selectedStudent.level}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Will be promoted to Student Representative role
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
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
                  Assign Rep <UserCheck className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Modal */}
      <EditMemberModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        member={editingMember}
        onSave={() => {
          loadReps();
          setEditModalOpen(false);
        }}
      />

      {/* Remove Rep Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Student Representative?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {selectedRep?.name} from the student
              representative role and demote them back to a regular student.
              They will no longer be able to create sessions or take attendance.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveRep}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Rep"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CourseRepManagement;
