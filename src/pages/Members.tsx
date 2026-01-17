import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MemberCard } from '@/components/members/MemberCard';
import { AddMemberModal } from '@/components/members/AddMemberModal';
import { ViewAttendanceModal } from '@/components/members/ViewAttendanceModal';
import { EditMemberModal } from '@/components/members/EditMemberModal';
import { DeleteMemberDialog } from '@/components/members/DeleteMemberDialog';
import { Member } from '@/types/attendance';
import { useAuth, getAllUsers, deleteStudentUser, deleteStaffUser, deleteAdminStaffUser } from '@/contexts/AuthContext';
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

const Members = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewAttendanceOpen, setViewAttendanceOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadMembers();
  }, [addModalOpen, deleteDialogOpen]);

  const loadMembers = () => {
    const users = getAllUsers();
    // Map User to Member
    const mappedMembers: Member[] = users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        studentId: u.studentId || u.staffId, // Map both to generic ID field if needed or keep separate
        photoUrl: undefined, // Mock users don't have photoUrl yet
        isMinor: false, // Default
        createdAt: new Date(), // Mock date
        status: 'active'
    }));
    setMembers(mappedMembers);
  };

  const handleViewAttendance = (member: Member) => {
    setSelectedMember(member);
    setViewAttendanceOpen(true);
  };

  const handleEditMember = (member: Member) => {
    setSelectedMember(member);
    setEditModalOpen(true);
  };

  const handleDeleteMember = (member: Member) => {
    setSelectedMember(member);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
      if (!selectedMember) return;
      
      let success = false;
      if (selectedMember.role === 'student') {
          success = deleteStudentUser(selectedMember.id);
      } else if (selectedMember.role === 'staff') {
          success = deleteStaffUser(selectedMember.id);
      } else if (selectedMember.role === 'admin_staff') {
          // If viewing admin staff (e.g. by super admin), allow delete
          success = deleteAdminStaffUser(selectedMember.id);
      }

      if (success) {
          toast({
              title: "Member removed",
              description: `${selectedMember.name} has been removed.`,
          });
          loadMembers();
          setDeleteDialogOpen(false);
          setSelectedMember(null);
      } else {
           toast({
              title: "Error",
              description: "Could not remove member.",
              variant: "destructive"
          });
      }
  };
  
  // Super admin and admin staff can add members
  const canAddMembers = user?.role === 'super_admin' || user?.role === 'admin_staff';

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.studentId && member.studentId.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Exact match for role filter or 'all'
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Members Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage students, staff, and administrators
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canAddMembers && (
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
          )}
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          {canAddMembers && (
            <Button variant="gradient" onClick={() => setAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="student">Students</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="admin_staff">Admins</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          {filteredMembers.length} members
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map(member => (
          <MemberCard 
            key={member.id} 
            member={member}
            onEdit={handleEditMember}
            onDelete={handleDeleteMember}
            onViewAttendance={handleViewAttendance}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredMembers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No members found matching your criteria.</p>
        </div>
      )}

      {/* Modals */}
      <AddMemberModal open={addModalOpen} onOpenChange={setAddModalOpen} />
      <ViewAttendanceModal 
        open={viewAttendanceOpen} 
        onOpenChange={setViewAttendanceOpen} 
        member={selectedMember} 
      />
      <EditMemberModal 
        open={editModalOpen} 
        onOpenChange={setEditModalOpen} 
        member={selectedMember} 
      />
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {selectedMember?.name} from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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

export default Members;