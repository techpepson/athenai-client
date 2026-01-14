import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/contexts/AuthContext';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';

export const MainLayout = () => {
  const { user } = useAuth();
  const mustChangePassword = user?.mustChangePassword === true;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64 transition-all duration-300">
        <Header />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
      
      {/* Force password change for new staff */}
      <ChangePasswordModal 
        open={mustChangePassword} 
        onOpenChange={() => {}} 
        required={mustChangePassword} 
      />
    </div>
  );
};
