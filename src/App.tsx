import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { SessionProvider } from "@/contexts/SessionContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import Sessions from "./pages/Sessions";
import Kiosk from "./pages/Kiosk";
import Analytics from "./pages/Analytics";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import StaffManagement from "./pages/StaffManagement";
import AdminManagement from "./pages/AdminManagement";
import CourseRepManagement from "./pages/CourseRepManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <SessionProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Navigate to="/auth" replace />} />
                <Route path="/auth" element={<Auth />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }
                >
                  {/* Dynamic Role-Based Routes */}
                  <Route path="/:role">
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="members" element={<Members />} />
                    <Route path="sessions" element={<Sessions />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="notifications" element={<Notifications />} />
                    <Route path="settings" element={<Settings />} />

                    {/* Admin Specific */}
                    <Route
                      path="admins"
                      element={
                        <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
                          <AdminManagement />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="staff"
                      element={
                        <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
                          <StaffManagement />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="course-reps"
                      element={
                        <ProtectedRoute
                          allowedRoles={[
                            "super_admin",
                            "staff",
                            "admin",
                            "lecturer",
                          ]}
                        >
                          <CourseRepManagement />
                        </ProtectedRoute>
                      }
                    />
                  </Route>
                </Route>
                <Route path="/kiosk" element={<Kiosk />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </SessionProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
