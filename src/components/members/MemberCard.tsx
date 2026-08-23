import { Member } from "@/types/attendance";
import { Role } from "@/enums/enums";
import { cn } from "@/lib/utils";
import { Mail, Phone, MoreVertical, Shield, Download } from "lucide-react";
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
  onDownloadReport?: (member: Member) => void;
}

export const MemberCard = ({
  member,
  onEdit,
  onDelete,
  onViewAttendance,
  onDownloadReport,
}: MemberCardProps) => {
  const roleColors: Record<Role, string> = {
    [Role.STUDENT]: "bg-primary/20 text-primary",
    [Role.STAFF]: "bg-success/20 text-success",
    [Role.ADMIN]: "bg-warning/20 text-warning",
    [Role.REP]: "bg-primary/20 text-primary border-primary/40",
    [Role.LECTURER]: "bg-success/20 text-success",
    [Role.SYSTEM_ADMIN]: "bg-warning/20 text-warning",
    [Role.OWNER]: "bg-warning/20 text-warning",
  };

  const roleLabels: Record<Role, string> = {
    [Role.STUDENT]: "Student",
    [Role.STAFF]: "Staff",
    [Role.ADMIN]: "Admin",
    [Role.REP]: "Level Assistant",
    [Role.LECTURER]: "Lecturer",
    [Role.SYSTEM_ADMIN]: "System Admin",
    [Role.OWNER]: "Owner",
  };

  return (
    <div className="p-3 sm:p-4 bg-card rounded-lg sm:rounded-xl border border-border hover:border-primary/30 transition-all duration-200 group animate-fade-in">
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {member.photoUrl ? (
            <img
              src={member.photoUrl}
              alt={member.name}
              className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl object-cover border-2 border-border group-hover:border-primary/50 transition-colors"
            />
          ) : (
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-primary flex items-center justify-center">
              <span className="text-sm sm:text-lg font-bold text-primary-foreground">
                {member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </span>
            </div>
          )}
          {member.role === Role.STUDENT && member.status === "active" && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-success rounded-full border-2 border-card" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-semibold text-foreground truncate">
              {member.name}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
            <span
              className={cn(
                "px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full",
                roleColors[member.role],
              )}
            >
              {roleLabels[member.role]}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {member.department}
            </span>
          </div>
          {member.studentId && (
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
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
              className="h-7 w-7 sm:h-8 sm:w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(member)}>
                Edit Member
              </DropdownMenuItem>
            )}
            {onViewAttendance && (
              <DropdownMenuItem onClick={() => onViewAttendance(member)}>
                View Attendance
              </DropdownMenuItem>
            )}
            {onDownloadReport && (
              <DropdownMenuItem onClick={() => onDownloadReport(member)}>
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(member)}
              >
                Remove
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Contact Info */}
      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border space-y-1.5 sm:space-y-2">
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
          <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          <span className="truncate">{member.email}</span>
        </div>
        {member.parentContact && (
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
            <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">{member.parentContact.phone}</span>
            <span className="text-[10px] sm:text-xs">(Guardian)</span>
          </div>
        )}
      </div>
    </div>
  );
};
