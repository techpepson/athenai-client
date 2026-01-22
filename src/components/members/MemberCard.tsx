import { Member } from "@/types/attendance";
import { cn } from "@/lib/utils";
import { Mail, Phone, MoreVertical, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MemberCardProps {
  member: Member;
  onEdit?: (member: Member) => void;
  onDelete?: (member: Member) => void;
  onViewAttendance?: (member: Member) => void;
}

export const MemberCard = ({
  member,
  onEdit,
  onDelete,
  onViewAttendance,
}: MemberCardProps) => {
  const roleColors = {
    student: "bg-primary/20 text-primary",
    staff: "bg-success/20 text-success",
    admin: "bg-warning/20 text-warning",
    course_rep: "bg-primary/20 text-primary border-primary/40",
    lecturer: "bg-success/20 text-success",
  };

  return (
    <div className="p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-all duration-200 group animate-fade-in">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative">
          {member.photoUrl ? (
            <img
              src={member.photoUrl}
              alt={member.name}
              className="w-14 h-14 rounded-xl object-cover border-2 border-border group-hover:border-primary/50 transition-colors"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">
                {member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </span>
            </div>
          )}
          {member.role === "student" && member.status === "active" && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-card" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground truncate">
              {member.name}
            </h3>
            {member.isMinor && (
              <span title="Minor - Parent contact required">
                <Shield className="w-4 h-4 text-warning flex-shrink-0" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                "px-2 py-0.5 text-xs font-medium rounded-full",
                roleColors[member.role],
              )}
            >
              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
            </span>
            <span className="text-xs text-muted-foreground">
              {member.department}
            </span>
          </div>
          {member.studentId && (
            <p className="text-xs text-muted-foreground mt-1">
              ID: {member.studentId}
            </p>
          )}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(member)}>
              Edit Member
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewAttendance?.(member)}>
              View Attendance
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete?.(member)}
            >
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Contact Info */}
      <div className="mt-4 pt-4 border-t border-border space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="w-4 h-4" />
          <span className="truncate">{member.email}</span>
        </div>
        {member.parentContact && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span className="truncate">{member.parentContact.phone}</span>
            <span className="text-xs">(Guardian)</span>
          </div>
        )}
      </div>
    </div>
  );
};
