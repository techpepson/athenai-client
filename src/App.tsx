import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { SessionProvider } from "@/contexts/SessionContext";
import { AttendanceProvider } from "@/contexts/AttendanceContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { Role } from "@/enums/enums";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import Sessions from "./pages/Sessions";
import Kiosk from "./pages/Kiosk";
import LecturerKiosk from "./pages/LecturerKiosk";
// Analytics page removed — dashboard shows analytics data
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import StaffManagement from "./pages/StaffManagement";
import AdminManagement from "./pages/AdminManagement";
import CourseRepManagement from "./pages/CourseRepManagement";
import Payroll from "./pages/Payroll";
import NotFound from "./pages/NotFound";

// Modules data now comes from backend API — no localStorage seed needed

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <SessionProvider>
          <AttendanceProvider>
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
                      {/* Analytics page removed — dashboard shows analytics data */}
                      <Route path="notifications" element={<Notifications />} />
                      <Route path="settings" element={<Settings />} />

                      {/* Admin Specific */}
                      <Route
                        path="admins"
                        element={
                          <ProtectedRoute
                            allowedRoles={[
                              Role.OWNER,
                              Role.SYSTEM_ADMIN,
                              Role.ADMIN,
                            ]}
                          >
                            <AdminManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="staff"
                        element={
                          <ProtectedRoute
                            allowedRoles={[
                              Role.OWNER,
                              Role.SYSTEM_ADMIN,
                              Role.ADMIN,
                            ]}
                          >
                            <StaffManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="course-reps"
                        element={
                          <ProtectedRoute
                            allowedRoles={[
                              Role.OWNER,
                              Role.SYSTEM_ADMIN,
                              Role.ADMIN,
                              Role.LECTURER,
                            ]}
                          >
                            <CourseRepManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="payroll"
                        element={
                          <ProtectedRoute allowedRoles={[Role.LECTURER]}>
                            <Payroll />
                          </ProtectedRoute>
                        }
                      />
                    </Route>
                  </Route>
                  <Route path="/kiosk/:sessionId" element={<Kiosk />} />
                  <Route
                    path="/kiosk/lecturer/:slotId"
                    element={<LecturerKiosk />}
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AttendanceProvider>
        </SessionProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
