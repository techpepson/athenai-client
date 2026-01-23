import { Bell, Search, User, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockAlerts } from '@/data/mockData';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const Header = () => {
  const unreadCount = mockAlerts.filter(a => !a.read).length;
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const formattedRole = user?.role
    ? user.role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'Guest';

  const firstName = user?.name.split(' ')[0] || 'Guest';
  const navigate = useNavigate();

  const handleNotificationClick = () => {
    if (!user?.role) return;
    
    const rolePrefix =
      user.role === "super_admin"
        ? "super_admin"
        : user.role === "admin"
          ? "admin"
          : user.role === "lecturer"
            ? "lecturer"
            : user.role === "course_rep"
              ? "course_rep"
              : user.role === "staff"
                ? "staff"
                : "student";
                
    navigate(`/${rolePrefix}/notifications`);
  };
  const handleProfileClick = () => {
    if (!user?.role) return;
    
    const rolePrefix =
      user.role === "super_admin"
        ? "super_admin"
        : user.role === "admin"
          ? "admin"
          : user.role === "lecturer"
            ? "lecturer"
            : user.role === "course_rep"
              ? "course_rep"
              : user.role === "staff"
                ? "staff"
                : "student";
                
    navigate(`/${rolePrefix}/settings`);
  };

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-40">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Search */}
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search members, sessions, or reports..."
            className="pl-10 bg-secondary/50 border-border/50 focus:bg-secondary"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>

          <Button variant="ghost" size="icon" className="relative" onClick={handleNotificationClick}>
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium">
                {unreadCount}
              </span>
            )}
          </Button>
          
          <div className="w-px h-8 bg-border" />
          
          <Button variant="ghost" className="gap-2" onClick={handleProfileClick}>
            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">{firstName}</p>
              <p className="text-xs text-muted-foreground">{formattedRole}</p>
            </div>
          </Button>
        </div>
      </div>
    </header>
  );
};
