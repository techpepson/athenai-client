import { Users, CalendarClock, CheckCircle2, AlertTriangle, Clock, UserX } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { ActiveSessionCard } from '@/components/dashboard/ActiveSessionCard';
import { RecentActivityItem } from '@/components/dashboard/RecentActivityItem';
import { AttendanceChart } from '@/components/dashboard/AttendanceChart';
import { EarlyArrivalsCard } from '@/components/dashboard/EarlyArrivalsCard';
import { mockStats, mockSessions, mockAlerts, mockEarlyArrivals } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const activeSessions = mockSessions.filter(s => s.status === 'active' || s.status === 'scheduled');
  const { user } = useAuth();
  
  const firstName = user?.name.split(' ')[0] || 'User';
  const isPersonalView = user?.role === 'student' || user?.role === 'staff';
  
  const welcomeMessage = isPersonalView 
    ? `Welcome back ${firstName}!, here's your attendance overview`
    : `Welcome back ${firstName}, here's the attendance overview`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">{welcomeMessage}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Members"
          value={mockStats.totalMembers.toLocaleString()}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Active Sessions"
          value={mockStats.activeSessions}
          icon={CalendarClock}
          variant="primary"
        />
        <StatCard
          title="Today's Attendance"
          value={mockStats.todayAttendance.toLocaleString()}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Attendance Rate"
          value={`${mockStats.attendanceRate}%`}
          icon={CheckCircle2}
          trend={{ value: 2.4, isPositive: true }}
        />
        <StatCard
          title="Late Arrivals"
          value={mockStats.lateArrivals}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Absentees"
          value={mockStats.absentees}
          icon={UserX}
          variant="destructive"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Weekly Attendance</h2>
              <p className="text-sm text-muted-foreground">Attendance trends for this week</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-muted-foreground">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span className="text-muted-foreground">Late</span>
              </div>
            </div>
          </div>
          <AttendanceChart />
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
            <span className="text-xs text-muted-foreground">Live updates</span>
          </div>
          <div className="space-y-2 max-h-[360px] overflow-y-auto scrollbar-hide">
            {mockAlerts.map(alert => (
              <RecentActivityItem key={alert.id} alert={alert} />
            ))}
          </div>
        </div>
      </div>

      {/* Early Arrivals Rewards Section */}
      <EarlyArrivalsCard arrivals={mockEarlyArrivals} />

      {/* Active Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Active & Upcoming Sessions</h2>
            <p className="text-sm text-muted-foreground">{activeSessions.length} sessions currently running or scheduled</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeSessions.map(session => (
            <ActiveSessionCard key={session.id} session={session} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
