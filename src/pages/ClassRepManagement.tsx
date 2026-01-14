import { useState, useEffect } from 'react';
import { Plus, Trash2, UserCheck, Copy, Check, GraduationCap } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { addClassRepUser, getClassRepUsers, deleteClassRepUser, User } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

const ClassRepManagement = () => {
  const [classRepList, setClassRepList] = useState<User[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClassRep, setSelectedClassRep] = useState<User | null>(null);
  const [newRepName, setNewRepName] = useState('');
  const [newRepEmail, setNewRepEmail] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadClassReps();
  }, []);

  const loadClassReps = () => {
    setClassRepList(getClassRepUsers());
  };

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleAddClassRep = () => {
    if (!newRepName.trim() || !newRepEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    const tempPassword = generateTempPassword();
    const result = addClassRepUser(newRepEmail, newRepName, tempPassword);

    if (result.success) {
      setGeneratedPassword(tempPassword);
      loadClassReps();
      toast({
        title: 'Class Rep added',
        description: 'Share the temporary password with the class representative',
      });
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClassRep = () => {
    if (selectedClassRep) {
      const success = deleteClassRepUser(selectedClassRep.id);
      if (success) {
        loadClassReps();
        toast({
          title: 'Class Rep removed',
          description: `${selectedClassRep.name} has been removed from class rep role`,
        });
      }
    }
    setDeleteDialogOpen(false);
    setSelectedClassRep(null);
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
    setNewRepName('');
    setNewRepEmail('');
    setGeneratedPassword('');
  };

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
          Add Class Rep
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
              Add students as class reps to help manage attendance
            </p>
            <Button variant="outline" onClick={() => setAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Class Rep
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
                    <p className="text-sm text-muted-foreground">{rep.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {rep.mustChangePassword && (
                    <span className="text-xs bg-warning/10 text-warning px-2 py-1 rounded-full">
                      Password change required
                    </span>
                  )}
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

      {/* Add Class Rep Modal */}
      <Dialog open={addModalOpen} onOpenChange={closeAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Class Representative</DialogTitle>
          </DialogHeader>
          
          {!generatedPassword ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Student Name</Label>
                <Input
                  id="name"
                  placeholder="Enter student name"
                  value={newRepName}
                  onChange={(e) => setNewRepName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@school.com"
                  value={newRepEmail}
                  onChange={(e) => setNewRepEmail(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeAddModal}>Cancel</Button>
                <Button variant="gradient" onClick={handleAddClassRep}>Add Class Rep</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                <p className="text-sm text-success font-medium mb-2">Class representative added!</p>
                <p className="text-sm text-muted-foreground">
                  Share this temporary password with {newRepName}. They will be required to change it on first login.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <div className="flex gap-2">
                  <Input value={generatedPassword} readOnly className="font-mono" />
                  <Button variant="outline" size="icon" onClick={copyPassword}>
                    {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="gradient" onClick={closeAddModal}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Class Representative?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {selectedClassRep?.name} from the class rep role. They will no longer be able to create sessions or manage attendance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClassRep}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClassRepManagement;
