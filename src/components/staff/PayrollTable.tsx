import { Calendar, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Session {
  id: string;
  staffId: string;
  staffName: string;
  department: string;
  courseId: string;
  courseName: string;
  date: string;
  clockIn: string;
  clockOut: string;
  hoursWorked: number;
  hourlyRate: number;
  earnings: number;
  paymentStatus: "pending" | "paid";
}

interface PayrollTableProps {
  sessions: Session[];
  selectedStaff: string;
  expandedStaff: Set<string>;
  onToggleExpansion: (staffId: string) => void;
  onPayStaff: (sessionId: string) => void;
  onSelectStaff: (staffId: string) => void;
  groupedSessions?: { [key: string]: Session[] };
}

export const PayrollTable = ({
  sessions,
  selectedStaff,
  expandedStaff,
  onToggleExpansion,
  onPayStaff,
  onSelectStaff,
  groupedSessions,
}: PayrollTableProps) => {
  if (selectedStaff !== "all") {
    return (
      <IndividualSessionsTable sessions={sessions} onPayStaff={onPayStaff} />
    );
  }

  return (
    <StaffListTable
      groupedSessions={groupedSessions || {}}
      expandedStaff={expandedStaff}
      onToggleExpansion={onToggleExpansion}
      onPayStaff={onPayStaff}
      onSelectStaff={onSelectStaff}
    />
  );
};

const IndividualSessionsTable = ({
  sessions,
  onPayStaff,
}: {
  sessions: Session[];
  onPayStaff: (id: string) => void;
}) => (
  <table className="w-full">
    <thead className="bg-muted/50">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Date
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Module
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Hours Worked
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Total Earnings
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Status
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Actions
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-border">
      {sessions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            onPayStaff={onPayStaff}
          />
        ))}
    </tbody>
  </table>
);

const StaffListTable = ({
  groupedSessions,
  expandedStaff,
  onToggleExpansion,
  onPayStaff,
  onSelectStaff,
}: {
  groupedSessions: { [key: string]: Session[] };
  expandedStaff: Set<string>;
  onToggleExpansion: (id: string) => void;
  onPayStaff: (id: string) => void;
  onSelectStaff: (id: string) => void;
}) => (
  <table className="w-full">
    <thead className="bg-muted/50">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[250px]">
          Staff Member
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[180px]">
          Modules
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[100px]">
          Hours Worked
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
          Total Earnings
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[100px]">
          Status
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[100px]">
          Actions
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-border">
      {Object.entries(groupedSessions).length > 0 ? (
        Object.entries(groupedSessions).map(
          ([staffId, staffSessions]: [string, Session[]]) => (
            <StaffRowWithExpansion
              key={staffId}
              staffId={staffId}
              staffSessions={staffSessions}
              isExpanded={expandedStaff.has(staffId)}
              onToggleExpansion={onToggleExpansion}
              onPayStaff={onPayStaff}
              onSelectStaff={onSelectStaff}
            />
          ),
        )
      ) : (
        <tr>
          <td
            colSpan={6}
            className="px-6 py-8 text-center text-muted-foreground"
          >
            No staff data available
          </td>
        </tr>
      )}
    </tbody>
  </table>
);

const SessionRow = ({
  session,
  onPayStaff,
}: {
  session: Session;
  onPayStaff: (id: string) => void;
}) => (
  <tr className="hover:bg-muted/30 transition-colors">
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="flex items-center gap-3">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <div className="text-sm text-foreground">
          {new Date(session.date).toLocaleDateString()}
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      <span className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
        {session.courseName}
      </span>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="flex items-center gap-2 text-sm text-foreground">
        <Clock className="w-4 h-4 text-muted-foreground" />
        {session.hoursWorked}h
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="text-sm font-semibold text-emerald-600">
        ₵{session.earnings.toFixed(2)}
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      {session.paymentStatus === "pending" ? (
        <span className="px-3 py-1 bg-amber-500/10 text-amber-600 text-xs rounded-full font-medium">
          Pending
        </span>
      ) : (
        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-xs rounded-full font-medium">
          Paid
        </span>
      )}
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      {session.paymentStatus === "pending" ? (
        <Button
          size="sm"
          variant="default"
          className="bg-cyan-500 hover:bg-cyan-600"
          onClick={() => onPayStaff(session.id)}
        >
          Pay Staff
        </Button>
      ) : (
        <Button size="sm" variant="outline">
          View Details
        </Button>
      )}
    </td>
  </tr>
);

const StaffRowWithExpansion = ({
  staffId,
  staffSessions,
  isExpanded,
  onToggleExpansion,
  onPayStaff,
  onSelectStaff,
}: {
  staffId: string;
  staffSessions: Session[];
  isExpanded: boolean;
  onToggleExpansion: (id: string) => void;
  onPayStaff: (id: string) => void;
  onSelectStaff: (id: string) => void;
}) => {
  const staff = staffSessions[0];
  const totalHours = staffSessions.reduce(
    (sum: number, s: Session) => sum + s.hoursWorked,
    0,
  );
  const totalEarnings = staffSessions.reduce(
    (sum: number, s: Session) => sum + s.earnings,
    0,
  );
  const hasPending = staffSessions.some(
    (s: Session) => s.paymentStatus === "pending",
  );
  const uniqueCourses = [
    ...new Set(staffSessions.map((s: Session) => s.courseName)),
  ];

  return (
    <>
      <tr className="hover:bg-muted/30 transition-colors">
        <td className="px-6 py-4 min-w-[250px]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onToggleExpansion(staffId)}
              className="p-1 hover:bg-muted rounded transition-colors flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-cyan-500">
                {staff.staffName.charAt(0)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-foreground truncate">
                {staff.staffName}
              </div>
              <div className="text-sm text-muted-foreground truncate">
                {staff.staffName.toLowerCase().replace(" ", "")}@trace.com
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 min-w-[180px]">
          <div className="flex flex-wrap gap-2">
            {uniqueCourses.slice(0, 2).map((course, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium whitespace-nowrap"
              >
                {course}
              </span>
            ))}
            {uniqueCourses.length > 2 && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                +{uniqueCourses.length - 2} more
              </span>
            )}
          </div>
        </td>
        <td className="px-6 py-4 min-w-[100px]">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            {totalHours.toFixed(1)}h
          </div>
        </td>
        <td className="px-6 py-4 min-w-[120px]">
          <div className="text-sm font-semibold text-emerald-600">
            ₵{totalEarnings.toFixed(2)}
          </div>
        </td>
        <td className="px-6 py-4 min-w-[100px]">
          {hasPending ? (
            <span className="px-3 py-1 bg-amber-500/10 text-amber-600 text-xs rounded-full font-medium inline-block">
              Pending
            </span>
          ) : (
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-xs rounded-full font-medium inline-block">
              No Earnings
            </span>
          )}
        </td>
        <td className="px-6 py-4 min-w-[100px]">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSelectStaff(staffId)}
          >
            View Details
          </Button>
        </td>
      </tr>
      {isExpanded &&
        staffSessions
          .sort(
            (a: Session, b: Session) =>
              new Date(b.date).getTime() - new Date(a.date).getTime(),
          )
          .map((session: Session) => (
            <tr key={session.id} className="bg-muted/20">
              <td className="px-6 py-3 pl-20">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {new Date(session.date).toLocaleDateString()}
                </div>
              </td>
              <td className="px-6 py-3">
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                  {session.courseName}
                </span>
              </td>
              <td className="px-6 py-3">
                <div className="flex items-center gap-1 text-sm text-foreground">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  {session.hoursWorked}h
                </div>
              </td>
              <td className="px-6 py-3">
                <div className="text-sm font-medium text-emerald-600">
                  ₵{session.earnings.toFixed(2)}
                </div>
              </td>
              <td className="px-6 py-3">
                {session.paymentStatus === "pending" ? (
                  <span className="px-2 py-1 bg-amber-500/10 text-amber-600 text-xs rounded-full">
                    Pending
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 text-xs rounded-full">
                    Paid
                  </span>
                )}
              </td>
              <td className="px-6 py-3">
                {session.paymentStatus === "pending" ? (
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-cyan-500 hover:bg-cyan-600 h-8 text-xs"
                    onClick={() => onPayStaff(session.id)}
                  >
                    Pay Staff
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Paid</span>
                )}
              </td>
            </tr>
          ))}
    </>
  );
};
