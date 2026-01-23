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
import {
  useAuth,
  addAdminStaffUser,
  deleteAdminStaffUser,
  getAllUsers,
  User,
  createPermissionRequest,
  getMyPermissionRequests,
  PermissionRequest,
} from "@/contexts/AuthContext";
import { AdminPrivilegesModal } from "@/components/admin/AdminPrivilegesModal";

const AdminManagement = () => {
  const { user: currentUser, logout } = useAuth();
  const [staffList, setStaffList] = useState<User[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selfDeleteDialogOpen, setSelfDeleteDialogOpen] = useState(false);
  const [privilegesModalOpen, setPrivilegesModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffId, setNewStaffId] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [myRequests, setMyRequests] = useState<PermissionRequest[]>([]);
  const { toast } = useToast();

  const isSuperAdmin = currentUser?.role === "super_admin";
  const isAdmin = currentUser?.role === "admin";
  const canAddAdmin =
    isSuperAdmin || (isAdmin && currentUser?.privileges?.canAddAdmin);
  const canDeleteAdmin =
    isSuperAdmin || (isAdmin && currentUser?.privileges?.canDeleteAdmin);

  // Check if admin has pending requests
  const hasPendingAddRequest = myRequests.some(
    (r) => r.permissionType === "canAddAdmin" && r.status === "pending",
  );
  const hasPendingDeleteRequest = myRequests.some(
    (r) => r.permissionType === "canDeleteAdmin" && r.status === "pending",
  );

  useEffect(() => {
    loadStaff();
    if (currentUser) {
      setMyRequests(getMyPermissionRequests(currentUser.id));
    }
  }, [currentUser]);

  const loadStaff = () => {
    // Filter showing only Admins
    const allUsers = getAllUsers();
    setStaffList(allUsers.filter((u) => u.role === "admin"));
  };

  const generateTempPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleAddStaff = () => {
    if (!newStaffName.trim() || !newStaffEmail.trim() || !newStaffId.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const tempPassword = generateTempPassword();
    const result = addAdminStaffUser(
      newStaffId,
      newStaffEmail,
      newStaffName,
      tempPassword,
    );

    if (result.success) {
      setGeneratedPassword(tempPassword);
      loadStaff();
      toast({
        title: "Admin Created",
        description: "Share the temporary password with the new admin",
      });
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleDeleteStaff = () => {
    if (selectedStaff) {
      const success = deleteAdminStaffUser(selectedStaff.id);
      if (success) {
        loadStaff();
        toast({
          title: "Admin removed",
          description: `${selectedStaff.name} has been removed`,
        });
      }
    }
    setDeleteDialogOpen(false);
    setSelectedStaff(null);
  };

  const handleSelfDelete = () => {
    if (selectedStaff && currentUser && selectedStaff.id === currentUser.id) {
      const success = deleteAdminStaffUser(selectedStaff.id);
      if (success) {
        toast({
          title: "Account Deleted",
          description: "Your admin account has been removed. Logging out...",
        });
        // Small delay to show the toast before logout
        setTimeout(() => {
          logout();
        }, 1000);
      }
    }
    setSelfDeleteDialogOpen(false);
    setSelectedStaff(null);
  };

  const handleRequestPermission = (
    permissionType: "canAddAdmin" | "canDeleteAdmin",
  ) => {
    if (!currentUser) return;

    const result = createPermissionRequest(currentUser, permissionType);

    if (result.success) {
      setMyRequests(getMyPermissionRequests(currentUser.id));
      toast({
        title: "Request Sent",
        description: `Your request for ${permissionType === "canAddAdmin" ? "Add Admin" : "Delete Admin"} permission has been sent to the Super Admin.`,
      });
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
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
    setNewStaffId("");
    setGeneratedPassword("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between">
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

      {/* Request Permission Section for Admins without privileges */}
      {isAdmin && !isSuperAdmin && (!canAddAdmin || !canDeleteAdmin) && (
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">
            Request Permissions
          </h3>
          <div className="flex flex-wrap gap-3">
            {!canAddAdmin && (
              <Button
                variant="outline"
                size="sm"
                disabled={hasPendingAddRequest}
                onClick={() => handleRequestPermission("canAddAdmin")}
              >
                <Send className="w-4 h-4 mr-2" />
                {hasPendingAddRequest
                  ? "Add Admin Request Pending"
                  : "Request Add Admin Permission"}
              </Button>
            )}
            {!canDeleteAdmin && (
              <Button
                variant="outline"
                size="sm"
                disabled={hasPendingDeleteRequest}
                onClick={() => handleRequestPermission("canDeleteAdmin")}
              >
                <Send className="w-4 h-4 mr-2" />
                {hasPendingDeleteRequest
                  ? "Delete Admin Request Pending"
                  : "Request Delete Admin Permission"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Staff List */}
      <div className="bg-card rounded-xl border border-border">
        {staffList.length === 0 ? (
          <div className="p-12 text-center">
            <UserCog className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No admins found
            </h3>
            <p className="text-muted-foreground mb-4">
              Add admin members to help manage the system
            </p>
            {canAddAdmin && (
              <Button variant="outline" onClick={() => setAddModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Admin
              </Button>
            )}
          </div>
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
                  {staff.mustChangePassword && (
                    <span className="text-xs bg-warning/10 text-warning px-2 py-1 rounded-full">
                      New
                    </span>
                  )}
                  {staff.privileges?.canAddAdmin && (
                    <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full">
                      +Admin
                    </span>
                  )}
                  {staff.privileges?.canDeleteAdmin && (
                    <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full">
                      -Admin
                    </span>
                  )}
                  {isSuperAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-primary hover:text-primary hover:bg-primary/10"
                      title="Privileges"
                      onClick={() => {
                        setSelectedStaff(staff);
                        setPrivilegesModalOpen(true);
                      }}
                    >
                      <Shield className="w-4 h-4" />
                    </Button>
                  )}
                  {canDeleteAdmin && (
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
                <Label htmlFor="staffId">Staff ID</Label>
                <Input
                  id="staffId"
                  placeholder="e.g., ADM001"
                  value={newStaffId}
                  onChange={(e) => setNewStaffId(e.target.value)}
                />
              </div>
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
              <DialogFooter>
                <Button variant="outline" onClick={closeAddModal}>
                  Cancel
                </Button>
                <Button variant="gradient" onClick={handleAddStaff}>
                  Create Admin
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
      <AlertDialog open={selfDeleteDialogOpen} onOpenChange={setSelfDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete Your Own Account?</AlertDialogTitle>
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

      {/* Admin Privileges Modal */}
      <AdminPrivilegesModal
        open={privilegesModalOpen}
        onOpenChange={setPrivilegesModalOpen}
        admin={selectedStaff}
        onSave={loadStaff}
      />
    </div>
  );
};

export default AdminManagement;
