import { useState, useEffect } from 'react';
import { Plus, Trash2, UserCheck, Copy, Check, GraduationCap, ArrowRight, Search, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  assignClassRep, 
  removeClassRep, 
  getClassRepUsers, 
  getAllUsers, 
  User, 
  MOCK_DEPARTMENTS, 
  MOCK_COURSES 
} from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

const ClassRepManagement = () => {
  const [classRepList, setClassRepList] = useState<User[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClassRep, setSelectedClassRep] = useState<User | null>(null);
  
  // Wizard State
  const [step, setStep] = useState(1);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [availableStudents, setAvailableStudents] = useState<User[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    loadClassReps();
  }, []);

  useEffect(() => {
    if (addModalOpen) {
       // Reset wizard
       setStep(1);
       setSelectedDept('');
       setSelectedCourse('');
       setStudentSearch('');
       setSelectedStudent(null);
    }
  }, [addModalOpen]);

  // Load students for search
  useEffect(() => {
      if (step === 3) {
          const allUsers = getAllUsers();
          // Filter for students. 
          // Ideally we would filter by Department/Program too, but mapping might be loose.
          // Let's filter by role 'student'.
          const students = allUsers.filter(u => u.role === 'student');
          setAvailableStudents(students);
      }
  }, [step]);


  const loadClassReps = () => {
    setClassRepList(getClassRepUsers());
  };

  const handleAssign = () => {
    if (!selectedStudent || !selectedCourse) return;

    const result = assignClassRep(selectedStudent.id, selectedCourse);

    if (result.success) {
      loadClassReps();
      setAddModalOpen(false);
      toast({
        title: 'Class Rep Assigned',
        description: `${selectedStudent.name} is now Class Rep for the selected course.`,
      });
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveClassRep = () => {
    if (selectedClassRep) {
      const success = removeClassRep(selectedClassRep.id);
      if (success) {
        loadClassReps();
        toast({
          title: 'Role Removed',
          description: `${selectedClassRep.name} has been removed from class rep role`,
        });
      }
    }
    setDeleteDialogOpen(false);
    setSelectedClassRep(null);
  };

  // Filtered Lists
  const filteredCourses = MOCK_COURSES.filter(c => c.department === selectedDept);
  
  const filteredStudents = availableStudents.filter(s => 
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
      s.email.toLowerCase().includes(studentSearch.toLowerCase())
  ).slice(0, 5); // Limit results

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Class Representatives</h1>
          <p className="text-muted-foreground mt-1">
            Assign students as class reps to manage attendance sessions
          </p>
        </div>
        <Button variant="gradient" onClick={() => setAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Assign Class Rep
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <GraduationCap className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Class Rep Permissions</p>
            <p className="text-sm text-muted-foreground mt-1">
              Class representatives can create attendance sessions and take attendance of lecturers. 
              They cannot manage members or other system settings.
            </p>
          </div>
        </div>
      </div>

      {/* Class Rep List */}
      <div className="bg-card rounded-xl border border-border">
        {classRepList.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No class representatives</h3>
            <p className="text-muted-foreground mb-4">
              Assign students as class reps to courses to help manage attendance
            </p>
            <Button variant="outline" onClick={() => setAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Assign First Rep
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {classRepList.map((rep) => (
              <div key={rep.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                       <p className="font-medium text-foreground">{rep.name}</p>
                       <Badge variant="secondary" className="text-xs">Class Rep</Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] font-normal gap-1">
                             <BookOpen className="w-3 h-3" />
                             {rep.classRepData?.courseName || 'Assigned Course'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">• {rep.classRepData?.department?.toUpperCase()}</span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">{rep.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setSelectedClassRep(rep);
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

      {/* Add Class Rep Wizard Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Class Representative (Step {step}/3)</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
             {/* Step 1: Select Department */}
             {step === 1 && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                     <Label>Select Department</Label>
                     <Select value={selectedDept} onValueChange={setSelectedDept}>
                        <SelectTrigger>
                            <SelectValue placeholder="Choose department..." />
                        </SelectTrigger>
                        <SelectContent>
                            {MOCK_DEPARTMENTS.map(dept => (
                                <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                            ))}
                        </SelectContent>
                     </Select>
                 </div>
             )}

             {/* Step 2: Select Course */}
             {step === 2 && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                     <Label>Select Course in {MOCK_DEPARTMENTS.find(d => d.value === selectedDept)?.label}</Label>
                     <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                        <SelectTrigger>
                            <SelectValue placeholder="Choose course..." />
                        </SelectTrigger>
                        <SelectContent>
                            {filteredCourses.length > 0 ? (
                                filteredCourses.map(course => (
                                    <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                                ))
                            ) : (
                                <div className="p-2 text-sm text-muted-foreground text-center">No courses found</div>
                            )}
                        </SelectContent>
                     </Select>
                 </div>
             )}

             {/* Step 3: Select Student */}
             {step === 3 && (
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
                                filteredStudents.map(student => (
                                    <div 
                                        key={student.id} 
                                        className={`p-3 text-sm cursor-pointer hover:bg-muted ${selectedStudent?.id === student.id ? 'bg-primary/10' : ''}`}
                                        onClick={() => setSelectedStudent(student)}
                                    >
                                        <div className="font-medium">{student.name}</div>
                                        <div className="text-xs text-muted-foreground">{student.email}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-3 text-sm text-muted-foreground text-center">No students match</div>
                            )}
                         </div>
                     )}

                     {selectedStudent && (
                         <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                             <p className="text-sm font-medium">Selected: {selectedStudent.name}</p>
                             <p className="text-xs text-muted-foreground">Will be assigned to: {MOCK_COURSES.find(c => c.id === selectedCourse)?.name}</p>
                         </div>
                     )}
                 </div>
             )}
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
            ) : (
                <Button variant="outline" onClick={() => setAddModalOpen(false)}>Cancel</Button>
            )}

            {step < 3 ? (
                <Button 
                    variant="gradient" 
                    onClick={() => setStep(step + 1)} 
                    disabled={(step === 1 && !selectedDept) || (step === 2 && !selectedCourse)}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Class Representative?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {selectedClassRep?.name} from the class rep role for {selectedClassRep?.classRepData?.courseName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveClassRep}
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

export default ClassRepManagement;
