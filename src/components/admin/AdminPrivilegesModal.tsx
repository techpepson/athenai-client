import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { User } from "@/contexts/AuthContext";

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
}: AdminPrivilegesModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Admin Privileges
          </DialogTitle>
          <DialogDescription>
            Manage privileges for {admin?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">{admin?.name}</p>
            <p className="text-xs text-muted-foreground">{admin?.email}</p>
          </div>

          <p className="text-sm text-muted-foreground text-center py-4">
            Admin privilege management is handled at the system level. Contact
            the system administrator to modify privileges.
          </p>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
