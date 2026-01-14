import { AttendanceAlert } from '@/types/attendance';
import { cn } from '@/lib/utils';
import { AlertTriangle, Bell, CheckCircle2, Clock, UserX } from 'lucide-react';

interface RecentActivityItemProps {
  alert: AttendanceAlert;
}

export const RecentActivityItem = ({ alert }: RecentActivityItemProps) => {
  const icons = {
    late: Clock,
    absent: UserX,
    pattern: AlertTriangle,
    checkin: CheckCircle2,
    checkout: Bell
  };

  const colors = {
    late: 'text-warning bg-warning/10',
    absent: 'text-destructive bg-destructive/10',
    pattern: 'text-warning bg-warning/10',
    checkin: 'text-success bg-success/10',
    checkout: 'text-primary bg-primary/10'
  };

  const Icon = icons[alert.type];

  const timeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg transition-colors',
      !alert.read && 'bg-card'
    )}>
      <div className={cn('p-2 rounded-lg', colors[alert.type])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{alert.memberName}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo(alert.timestamp)}</p>
      </div>
      {!alert.read && (
        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
      )}
    </div>
  );
};
