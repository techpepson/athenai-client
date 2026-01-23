import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Shield, UserPlus, UserMinus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  AdminPrivileges,
  updateAdminPrivileges,
} from "@/contexts/AuthContext";

interface AdminPrivilegesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: User | null;
  onSave?: () => void;
}

export const AdminPrivilegesModal = ({
  open,
  onOpenChange,
  admin,
  onSave,
}: AdminPrivilegesModalProps) => {
  const [privileges, setPrivileges] = useState<AdminPrivileges>({
    canAddAdmin: false,
    canDeleteAdmin: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (admin) {
      setPrivileges({
        canAddAdmin: admin.privileges?.canAddAdmin ?? false,
        canDeleteAdmin: admin.privileges?.canDeleteAdmin ?? false,
      });
    }
  }, [admin]);

  const handleSave = () => {
    if (!admin) return;

    const result = updateAdminPrivileges(admin.id, privileges);

    if (result.success) {
      toast({
        title: "Privileges Updated",
        description: `${admin.name}'s privileges have been updated.`,
      });
      onSave?.();
      onOpenChange(false);
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Admin Privileges
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">{admin?.name}</p>
            <p className="text-xs text-muted-foreground">{admin?.email}</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <UserPlus className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Add Admin</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow this admin to create new admin accounts
                  </p>
                </div>
              </div>
              <Switch
                checked={privileges.canAddAdmin}
                onCheckedChange={(checked) =>
                  setPrivileges((prev) => ({ ...prev, canAddAdmin: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <UserMinus className="w-4 h-4 text-destructive" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Delete Admin</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow this admin to remove other admin accounts
                  </p>
                </div>
              </div>
              <Switch
                checked={privileges.canDeleteAdmin}
                onCheckedChange={(checked) =>
                  setPrivileges((prev) => ({
                    ...prev,
                    canDeleteAdmin: checked,
                  }))
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="gradient" onClick={handleSave}>
            Save Privileges
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
