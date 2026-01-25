import { Trophy, Clock, Medal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

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
      return (
        <span className="h-5 w-5 flex items-center justify-center text-xs font-semibold text-muted-foreground">
          {index + 1}
        </span>
      );
  }
};

const getRankBadge = (index: number) => {
  switch (index) {
    case 0:
      return (
        <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
          🥇 1st
        </Badge>
      );
    case 1:
      return (
        <Badge className="bg-gray-400/20 text-gray-400 border-gray-400/30">
          🥈 2nd
        </Badge>
      );
    case 2:
      return (
        <Badge className="bg-amber-600/20 text-amber-600 border-amber-600/30">
          🥉 3rd
        </Badge>
      );
    default:
      return null;
  }
};

export const EarlyArrivalsCard = ({ arrivals }: EarlyArrivalsCardProps) => {
  const sortedArrivals = [...arrivals].sort(
    (a, b) => b.minutesEarly - a.minutesEarly,
  );

  return (
    <div className="bg-card rounded-lg sm:rounded-xl border border-border p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            Early Arrivals Rewards
          </h2>
        </div>
        <Badge variant="outline" className="text-[10px] sm:text-xs">
          Today
        </Badge>
      </div>

      <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
        Recognizing punctual members who arrived early
      </p>

      <div className="space-y-2 sm:space-y-3 max-h-[250px] sm:max-h-[320px] overflow-y-auto scrollbar-hide">
        {sortedArrivals.length === 0 ? (
          <p className="text-xs sm:text-sm text-muted-foreground text-center py-3 sm:py-4">
            No early arrivals recorded yet today
          </p>
        ) : (
          sortedArrivals.map((arrival, index) => (
            <div
              key={arrival.id}
              className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-colors ${
                index < 3
                  ? "bg-gradient-to-r from-primary/5 to-transparent border border-primary/10"
                  : "bg-muted/30 hover:bg-muted/50"
              }`}
            >
              <div className="flex-shrink-0 w-5 sm:w-6 flex justify-center">
                {getRankIcon(index)}
              </div>

              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-primary/20">
                <AvatarImage src={arrival.photoUrl} alt={arrival.memberName} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm">
                  {arrival.memberName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                    {arrival.memberName}
                  </p>
                  <span className="hidden sm:inline">
                    {getRankBadge(index)}
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  {arrival.department}
                </p>
              </div>

              <div className="flex-shrink-0 text-right">
                <div className="flex items-center gap-0.5 sm:gap-1 text-success">
                  <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  <span className="text-xs sm:text-sm font-semibold">
                    +{arrival.minutesEarly}min
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {format(arrival.checkInTime, "h:mm a")}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
