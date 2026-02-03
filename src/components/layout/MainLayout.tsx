import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "@/contexts/AuthContext";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";

export const MainLayout = () => {
  const { user } = useAuth();
  const mustChangePassword = user?.mustChangePassword === true;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64 transition-all duration-300">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Force password change for new staff */}
      {mustChangePassword && (
        <ChangePasswordModal
          open={mustChangePassword}
          onOpenChange={() => {}}
          required={mustChangePassword}
        />
      )}
    </div>
  );
};
