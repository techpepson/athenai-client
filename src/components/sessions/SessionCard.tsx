import { AttendanceSession } from '@/types/attendance';
import { cn } from '@/lib/utils';
import { Clock, MapPin, Users, Play, Pause, CheckCircle, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface SessionCardProps {
  session: AttendanceSession;
  onStart?: (session: AttendanceSession) => void;
  onEnd?: (session: AttendanceSession) => void;
  onViewReport?: (session: AttendanceSession) => void;
}

export const SessionCard = ({ session, onStart, onEnd, onViewReport }: SessionCardProps) => {
  const progress = (session.presentCount / session.expectedCount) * 100;

  const typeColors = {
    class: 'bg-primary/20 text-primary border-primary/30',
    exam: 'bg-warning/20 text-warning border-warning/30',
    event: 'bg-success/20 text-success border-success/30',
    shift: 'bg-accent/20 text-accent-foreground border-accent/30'
  };

  const statusIcons = {
    scheduled: Clock,
    active: Play,
    completed: CheckCircle
  };

  const StatusIcon = statusIcons[session.status];

  return (
    <div className={cn(
      'p-5 rounded-xl border transition-all duration-200 animate-fade-in',
      session.status === 'active' 
        ? 'bg-card border-primary/50 shadow-glow' 
        : 'bg-card border-border hover:border-primary/30'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('px-3 py-1 text-xs font-medium rounded-full border', typeColors[session.type])}>
            {session.type.charAt(0).toUpperCase() + session.type.slice(1)}
          </span>
          <span className={cn(
            'flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border',
            session.attendanceType === 'checkin' 
              ? 'bg-success/20 text-success border-success/30' 
              : 'bg-warning/20 text-warning border-warning/30'
          )}>
            {session.attendanceType === 'checkin' ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
            {session.attendanceType === 'checkin' ? 'Check-in' : 'Check-out'}
          </span>
          <span className={cn(
            'flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full',
            session.status === 'active' && 'bg-success/20 text-success',
            session.status === 'scheduled' && 'bg-muted text-muted-foreground',
            session.status === 'completed' && 'bg-secondary text-secondary-foreground'
          )}>
            <StatusIcon className="w-3 h-3" />
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-foreground mb-2">{session.name}</h3>
      
      {session.department && (
        <p className="text-sm text-muted-foreground mb-3">{session.department}</p>
      )}

      {/* Details */}
      <div className="space-y-2 text-sm mb-4">
        {session.location && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{session.location}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>
            {session.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
            {session.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{session.presentCount} / {session.expectedCount} attendees</span>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Attendance Progress</span>
          <span className="font-medium text-foreground">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {session.status === 'scheduled' && (
          <Button className="flex-1" variant="gradient" onClick={() => onStart?.(session)}>
            <Play className="w-4 h-4 mr-2" />
            Start Session
          </Button>
        )}
        {session.status === 'active' && (
          <>
            <Button className="flex-1" variant="outline" onClick={() => onEnd?.(session)}>
              <Pause className="w-4 h-4 mr-2" />
              End Session
            </Button>
            <Button variant="glow">
              View Live
            </Button>
          </>
        )}
        {session.status === 'completed' && (
          <Button className="flex-1" variant="outline" onClick={() => onViewReport?.(session)}>
            View Report
          </Button>
        )}
      </div>
    </div>
  );
};
