import { useState, useEffect } from "react";
import { Plus, Trash2, UserCog, Copy, Check, Shield, Send } from "lucide-react";
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
import { useAuth, User } from "@/contexts/AuthContext";
import { usersServices } from "@/services/users.services";
import { Role } from "@/enums/enums";
import { EmptyState } from "@/components/ui/EmptyState";

const AdminManagement = () => {
  const { user: currentUser, logout } = useAuth();
  const [staffList, setStaffList] = useState<User[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selfDeleteDialogOpen, setSelfDeleteDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const isOwner = currentUser?.role === Role.OWNER;
  const isSystemAdmin = currentUser?.role === Role.SYSTEM_ADMIN;
  const isAdmin = currentUser?.role === Role.ADMIN;
  const canAddAdmin = isOwner || isSystemAdmin;
  const canDeleteAdmin = isOwner || isSystemAdmin;

  useEffect(() => {
    loadStaff();
  }, [currentUser]);

  const loadStaff = async () => {
    setIsLoading(true);
    try {
      const response = await usersServices.getAllUsers();
      if (response.success && response.data?.users) {
        // Filter showing only Admins and System Admins
        const admins = response.data.users.filter(
          (u) => u.role === Role.ADMIN || u.role === Role.SYSTEM_ADMIN,
        );
        setStaffList(admins as User[]);
      }
    } catch (error) {
      console.error("Failed to load admins:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (
      !newStaffName.trim() ||
      !newStaffEmail.trim() ||
      !newStaffPhone.trim()
    ) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await usersServices.createAdmin({
        name: newStaffName,
        email: newStaffEmail,
        phone: newStaffPhone,
      });

      if (response.success) {
        // Use the tempPassword returned from the server
        if (response.data?.data?.tempPassword) {
          setGeneratedPassword(response.data.data.tempPassword);
        }
        loadStaff();
        toast({
          title: "Admin Created",
          description: "Share the temporary password with the new admin",
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to create admin",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create admin",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (selectedStaff) {
      try {
        const response = await usersServices.removeUser(selectedStaff.email);
        if (response.success) {
          loadStaff();
          toast({
            title: "Admin removed",
            description: `${selectedStaff.name} has been removed`,
          });
        } else {
          toast({
            title: "Error",
            description: response.error || "Failed to remove admin",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to remove admin",
          variant: "destructive",
        });
      }
    }
    setDeleteDialogOpen(false);
    setSelectedStaff(null);
  };

  const handleSelfDelete = async () => {
    if (selectedStaff && currentUser && selectedStaff.id === currentUser.id) {
      try {
        const response = await usersServices.removeUser(selectedStaff.email);
        if (response.success) {
          toast({
            title: "Account Deleted",
            description: "Your admin account has been removed. Logging out...",
          });
          // Small delay to show the toast before logout
          setTimeout(() => {
            logout();
          }, 1000);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete account",
          variant: "destructive",
        });
      }
    }
    setSelfDeleteDialogOpen(false);
    setSelectedStaff(null);
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
    setNewStaffName("");
    setNewStaffEmail("");
    setNewStaffPhone("");
    setGeneratedPassword("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Admin Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage system administrators (Admin)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canAddAdmin && (
            <Button variant="gradient" onClick={() => setAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Admin
            </Button>
          )}
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-card rounded-xl border border-border">
        {isLoading ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">Loading admins...</p>
          </div>
        ) : staffList.length === 0 ? (
          <EmptyState
            type="admins"
            action={
              canAddAdmin ? (
                <Button variant="outline" onClick={() => setAddModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Admin
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {staffList.map((staff) => (
              <div
                key={staff.id}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-sm font-medium text-foreground">
                      {staff.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{staff.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {staff.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {staff.role === Role.SYSTEM_ADMIN
                      ? "System Admin"
                      : "Admin"}
                  </span>
                  {canDeleteAdmin && staff.role !== Role.OWNER && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setSelectedStaff(staff);
                        // Check if admin is trying to delete themselves
                        if (currentUser && staff.id === currentUser.id) {
                          setSelfDeleteDialogOpen(true);
                        } else {
                          setDeleteDialogOpen(true);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      <Dialog open={addModalOpen} onOpenChange={closeAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Admin</DialogTitle>
          </DialogHeader>

          {!generatedPassword ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter name"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@facetrack.com"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={closeAddModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="gradient"
                  onClick={handleAddStaff}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Admin"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                <p className="text-sm text-success font-medium mb-2">
                  Admin account created!
                </p>
                <p className="text-sm text-muted-foreground">
                  Share this temporary password. They must change it on login.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <div className="flex gap-2">
                  <Input
                    value={generatedPassword}
                    readOnly
                    className="font-mono"
                  />
                  <Button variant="outline" size="icon" onClick={copyPassword}>
                    {copied ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="gradient" onClick={closeAddModal}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Admin?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {selectedStaff?.name} from the
              system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStaff}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Self Delete Warning Dialog */}
      <AlertDialog
        open={selfDeleteDialogOpen}
        onOpenChange={setSelfDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Delete Your Own Account?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block font-medium text-foreground">
                Warning: This action cannot be undone!
              </span>
              <span className="block">
                You are about to delete your own admin account. This will:
              </span>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Permanently remove all your admin data</li>
                <li>Revoke all your permissions and privileges</li>
                <li>Log you out of the system immediately</li>
              </ul>
              <span className="block mt-3 text-destructive font-medium">
                Are you absolutely sure you want to proceed?
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Keep My Account</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSelfDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Delete My Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminManagement;
