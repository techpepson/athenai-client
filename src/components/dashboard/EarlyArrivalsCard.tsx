import { Trophy, Clock, Medal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export interface EarlyArrival {
  id: string;
  memberId: string;
  memberName: string;
  photoUrl?: string;
  department: string;
  checkInTime: Date;
  scheduledTime: Date;
  minutesEarly: number;
}

interface EarlyArrivalsCardProps {
  arrivals: EarlyArrival[];
}

const getRankIcon = (index: number) => {
  switch (index) {
    case 0:
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 1:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 2:
      return <Medal className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="h-5 w-5 flex items-center justify-center text-xs font-semibold text-muted-foreground">{index + 1}</span>;
  }
};

const getRankBadge = (index: number) => {
  switch (index) {
    case 0:
      return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">🥇 1st</Badge>;
    case 1:
      return <Badge className="bg-gray-400/20 text-gray-400 border-gray-400/30">🥈 2nd</Badge>;
    case 2:
      return <Badge className="bg-amber-600/20 text-amber-600 border-amber-600/30">🥉 3rd</Badge>;
    default:
      return null;
  }
};

export const EarlyArrivalsCard = ({ arrivals }: EarlyArrivalsCardProps) => {
  const sortedArrivals = [...arrivals].sort((a, b) => b.minutesEarly - a.minutesEarly);

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-semibold text-foreground">Early Arrivals Rewards</h2>
        </div>
        <Badge variant="outline" className="text-xs">Today</Badge>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Recognizing punctual members who arrived early
      </p>

      <div className="space-y-3 max-h-[320px] overflow-y-auto scrollbar-hide">
        {sortedArrivals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No early arrivals recorded yet today
          </p>
        ) : (
          sortedArrivals.map((arrival, index) => (
            <div
              key={arrival.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                index < 3 
                  ? 'bg-gradient-to-r from-primary/5 to-transparent border border-primary/10' 
                  : 'bg-muted/30 hover:bg-muted/50'
              }`}
            >
              <div className="flex-shrink-0 w-6 flex justify-center">
                {getRankIcon(index)}
              </div>
              
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={arrival.photoUrl} alt={arrival.memberName} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {arrival.memberName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {arrival.memberName}
                  </p>
                  {getRankBadge(index)}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {arrival.department}
                </p>
              </div>
              
              <div className="flex-shrink-0 text-right">
                <div className="flex items-center gap-1 text-success">
                  <Clock className="h-3 w-3" />
                  <span className="text-sm font-semibold">+{arrival.minutesEarly}min</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(arrival.checkInTime, 'h:mm a')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
