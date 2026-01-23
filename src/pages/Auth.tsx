import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Fingerprint, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { StudentForm } from "@/components/auth/StudentForm";
import { StaffForm } from "@/components/auth/StaffForm";
import { KioskScanner } from "@/components/ui/kiosk-scanner";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<
    | "login"
    | "role-selection"
    | "student-registration"
    | "staff-registration"
    | "forgot-password"
  >("login");
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
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
      navigate(`/${rolePrefix}/dashboard`, { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      const userRole = result.user?.role || "student";
      const rolePrefix =
        userRole === "super_admin"
          ? "super_admin"
          : userRole === "admin"
            ? "admin"
            : userRole === "lecturer"
              ? "lecturer"
              : userRole === "course_rep"
                ? "course_rep"
                : userRole === "staff"
                  ? "staff"
                  : "student";

      toast({
        title: "Welcome back!",
        description: "You have been logged in successfully.",
      });
      navigate(`/${rolePrefix}/dashboard`, { replace: true });
    } else {
      toast({
        title: "Login failed",
        description: result.error || "Invalid credentials",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 animate-fade-in">
        <div className="w-full max-w-[400px] space-y-8">
          {view === "login" ? (
            <>
              {/* Login Header */}
              <div className="text-center space-y-2">
                <div className="flex justify-center mb-6">
                  <img
                    src="/comasIcon.png"
                    alt="FaceTrack"
                    className="w-16 h-16 object-contain"
                  />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  FaceTrack
                </h1>
                <p className="text-muted-foreground">Sign into your account</p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 rounded-xl border-muted-foreground/20 focus-visible:ring-primary/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-base font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-12 rounded-xl border-muted-foreground/20 focus-visible:ring-primary/30 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setView("forgot-password")}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 rounded-xl text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>

                <div className="text-center text-sm text-muted-foreground pt-2">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setView("student-registration")}
                    className="text-primary hover:underline font-semibold"
                  >
                    Create account
                  </button>
                </div>
              </form>
            </>
          ) : view === "forgot-password" ? (
            /* Forgot Password View */
            <div className="space-y-8 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="flex justify-center mb-6">
                  <img
                    src="/comasIcon.png"
                    alt="FaceTrack"
                    className="w-16 h-16 object-contain"
                  />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Forgot password?
                </h1>
                <p className="text-muted-foreground">
                  No worries, we'll send you reset instructions.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsLoading(true);
                  // Simulate API call
                  setTimeout(() => {
                    setIsLoading(false);
                    toast({
                      title: "Check your email",
                      description:
                        "We've sent a password reset link to your email.",
                    });
                    setView("login");
                  }, 1500);
                }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label
                    htmlFor="reset-email"
                    className="text-base font-medium"
                  >
                    Email
                  </Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email address"
                    required
                    disabled={isLoading}
                    className="h-12 rounded-xl border-muted-foreground/20 focus-visible:ring-primary/30"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 rounded-xl text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setView("login")}
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 mx-auto font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Student Registration - Form on left panel */
            <div className="space-y-6 animate-fade-in">
              {/* Back to login at top */}
              <div>
                <Button
                  variant="ghost"
                  onClick={() => setView("login")}
                  className="text-muted-foreground hover:text-foreground p-0 h-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to login
                </Button>
              </div>

              {/* Student Form */}
              <div className="flex-1">
                <StudentForm onSuccess={() => setView("login")} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="hidden lg:flex w-1/2 p-4 bg-background items-center justify-center">
        <div
          className={`w-full h-full rounded-[2rem] relative overflow-hidden shadow-2xl transition-all duration-500 ${view === "login" || view === "forgot-password" ? "bg-muted/30" : "bg-slate-950"}`}
        >
          {view === "login" || view === "forgot-password" ? (
            /* Login Visual */
            <>
              <img
                src="/loginImage.jpg"
                alt="Login Visual"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20" />
            </>
          ) : (
            /* Kiosk Visual for Registration */
            <div className="w-full h-full flex items-center justify-center">
              <KioskScanner isScanning={true} status="scanning" className="p-0">
                <div className="flex flex-col items-center justify-center text-center p-6">
                  <div className="w-24 h-24 mb-6 rounded-3xl bg-primary/20 flex items-center justify-center backdrop-blur-md border border-primary/30 shadow-glow">
                    <img
                      src="/comasIcon.png"
                      alt="FaceTrack"
                      className="w-14 h-14 object-contain contrast-125"
                    />
                  </div>
                  <h1 className="text-5xl font-bold tracking-tight text-white drop-shadow-lg">
                    FaceTrack
                  </h1>
                  <p className="text-base text-slate-300 mt-3 font-medium tracking-wide">
                    Identity Verification System
                  </p>
                </div>
              </KioskScanner>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
