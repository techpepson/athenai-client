import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionCard } from '@/components/sessions/SessionCard';
import { CreateSessionModal } from '@/components/sessions/CreateSessionModal';
import { SessionReportModal } from '@/components/sessions/SessionReportModal';
import { mockSessions } from '@/data/mockData';
import { AttendanceSession } from '@/types/attendance';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const Sessions = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const filteredSessions = mockSessions.filter(session => {
    if (activeTab === 'all') return true;
    return session.status === activeTab;
  });

  const handleStartSession = () => {
    toast.success('Session started! Kiosk mode is now active.');
  };

  const handleEndSession = () => {
    toast.info('Session ended. Report is being generated.');
  };

  const handleViewReport = (session: AttendanceSession) => {
    setSelectedSession(session);
    setReportModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance Sessions</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage attendance tracking sessions
          </p>
        </div>
        <Button variant="gradient" onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Session
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="all">All Sessions</TabsTrigger>
            <TabsTrigger value="active">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                Active
              </span>
            </TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          <div className="text-sm text-muted-foreground">
            {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                onStart={handleStartSession}
                onEnd={handleEndSession}
                onViewReport={handleViewReport}
              />
            ))}
          </div>

          {filteredSessions.length === 0 && (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <p className="text-muted-foreground">No sessions found.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setCreateModalOpen(true)}
              >
                Create your first session
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Session Modal */}
      <CreateSessionModal open={createModalOpen} onOpenChange={setCreateModalOpen} />

      {/* Session Report Modal */}
      <SessionReportModal 
        open={reportModalOpen} 
        onOpenChange={setReportModalOpen} 
        session={selectedSession} 
      />
    </div>
  );
};

export default Sessions;
