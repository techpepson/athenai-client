import { useState } from 'react';
import { mockAlerts } from '@/data/mockData';
import { AttendanceAlert } from '@/types/attendance';
import { cn } from '@/lib/utils';
import { Bell, CheckCheck, Trash2, AlertTriangle, Clock, UserX, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Notifications = () => {
  const [alerts, setAlerts] = useState(mockAlerts);
  const [activeTab, setActiveTab] = useState('all');

  const filteredAlerts = alerts.filter(alert => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !alert.read;
    return alert.severity === activeTab;
  });

  const markAllRead = () => {
    setAlerts(alerts.map(a => ({ ...a, read: true })));
  };

  const icons = {
    late: Clock,
    absent: UserX,
    pattern: AlertTriangle,
    checkin: CheckCircle2,
    checkout: Bell
  };

  const severityColors = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-warning/20 text-warning',
    high: 'bg-destructive/20 text-destructive'
  };

  const typeColors = {
    late: 'text-warning bg-warning/10 border-warning/30',
    absent: 'text-destructive bg-destructive/10 border-destructive/30',
    pattern: 'text-warning bg-warning/10 border-warning/30',
    checkin: 'text-success bg-success/10 border-success/30',
    checkout: 'text-primary bg-primary/10 border-primary/30'
  };

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated on attendance alerts and activities
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="all">
            All
            <span className="ml-2 px-2 py-0.5 bg-secondary rounded-full text-xs">
              {alerts.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="high">High Priority</TabsTrigger>
          <TabsTrigger value="medium">Medium</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="space-y-3">
            {filteredAlerts.map(alert => {
              const Icon = icons[alert.type];
              return (
                <div
                  key={alert.id}
                  className={cn(
                    'p-4 rounded-xl border transition-all duration-200',
                    !alert.read ? 'bg-card border-primary/30' : 'bg-card/50 border-border'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn('p-3 rounded-xl border', typeColors[alert.type])}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground">{alert.memberName}</p>
                        <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', severityColors[alert.severity])}>
                          {alert.severity}
                        </span>
                        {!alert.read && (
                          <span className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>
                      <p className="text-muted-foreground">{alert.message}</p>
                      <p className="text-xs text-muted-foreground/60 mt-2">
                        {alert.timestamp.toLocaleString()}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="flex-shrink-0">
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {filteredAlerts.length === 0 && (
              <div className="text-center py-12 bg-card rounded-xl border border-border">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No notifications to show</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Notifications;
