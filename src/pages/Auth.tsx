import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Fingerprint,
  Loader2,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, getRolePrefix } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { StudentForm } from "@/components/auth/StudentForm";
import { StaffForm } from "@/components/auth/StaffForm";
import { KioskScanner } from "@/components/ui/kiosk-scanner";
import { authServices } from "@/services/auth.services";

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

  // Forgot password flow state
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(1);
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { user, login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      const rolePrefix = getRolePrefix(user.role);
      navigate(`/${rolePrefix}/dashboard`, { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(email, password);

    console.log("Login result:", result);

    if (result.success && result.user) {
      const rolePrefix = getRolePrefix(result.user.role);

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
                  <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-950 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:scale-105 transition-all duration-300 p-3.5">
                    <img
                      src="/ug_logo.png"
                      alt="EduTrack"
                      className="w-full h-full object-contain rounded-xl filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
                    />
                  </div>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  EduTrack
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
            /* Forgot Password - Multi-step Flow */
            <div className="space-y-8 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-950 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:scale-105 transition-all duration-300 p-3.5">
                    <img
                      src="/ug_logo.png"
                      alt="EduTrack"
                      className="w-full h-full object-contain rounded-xl filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
                    />
                  </div>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {resetStep === 1
                    ? "Forgot password?"
                    : resetStep === 2
                      ? "Enter reset code"
                      : "Set new password"}
                </h1>
                <p className="text-muted-foreground">
                  {resetStep === 1
                    ? "Enter your email to receive a reset code via SMS."
                    : resetStep === 2
                      ? "Enter the 6-digit code sent to your phone."
                      : "Choose a new password for your account."}
                </p>
              </div>

              {/* Step indicators */}
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      step === resetStep
                        ? "w-8 bg-primary"
                        : step < resetStep
                          ? "w-8 bg-primary/50"
                          : "w-8 bg-muted-foreground/20"
                    }`}
                  />
                ))}
              </div>

              {/* Step 1: Enter email */}
              {resetStep === 1 && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setIsLoading(true);
                    const response =
                      await authServices.forgotPassword(resetEmail);
                    setIsLoading(false);

                    if (response.success) {
                      toast({
                        title: "Reset code sent",
                        description:
                          response.data?.message ||
                          "A reset code has been sent to your registered phone number.",
                      });
                      setResetStep(2);
                    } else {
                      toast({
                        title: "Request failed",
                        description:
                          response.error ||
                          "Failed to send reset code. Please try again.",
                        variant: "destructive",
                      });
                    }
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
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
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
                      "Send Reset Code"
                    )}
                  </Button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setView("login");
                        setResetStep(1);
                        setResetEmail("");
                        setResetToken("");
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                      className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 mx-auto font-medium"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to login
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: Enter reset token */}
              {resetStep === 2 && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (resetToken.length !== 6) {
                      toast({
                        title: "Invalid code",
                        description: "Please enter the 6-digit code.",
                        variant: "destructive",
                      });
                      return;
                    }
                    setResetStep(3);
                  }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <Label
                      htmlFor="reset-token"
                      className="text-base font-medium"
                    >
                      Reset Code
                    </Label>
                    <Input
                      id="reset-token"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="Enter 6-digit code"
                      value={resetToken}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (val.length <= 6) setResetToken(val);
                      }}
                      required
                      disabled={isLoading}
                      className="h-12 rounded-xl border-muted-foreground/20 focus-visible:ring-primary/30 text-center text-2xl tracking-[0.5em] font-mono"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Code was sent to your registered phone number
                    </p>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 rounded-xl text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    disabled={resetToken.length !== 6}
                  >
                    Continue
                  </Button>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setResetStep(1);
                        setResetToken("");
                      }}
                      className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 font-medium"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setIsLoading(true);
                        const response =
                          await authServices.forgotPassword(resetEmail);
                        setIsLoading(false);

                        if (response.success) {
                          toast({
                            title: "Code resent",
                            description:
                              "A new reset code has been sent to your phone.",
                          });
                        } else {
                          toast({
                            title: "Resend failed",
                            description:
                              response.error || "Failed to resend code.",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={isLoading}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      {isLoading ? "Resending..." : "Resend code"}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: Set new password */}
              {resetStep === 3 && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();

                    if (newPassword.length < 6) {
                      toast({
                        title: "Password too short",
                        description:
                          "Password must be at least 6 characters long.",
                        variant: "destructive",
                      });
                      return;
                    }

                    if (newPassword !== confirmPassword) {
                      toast({
                        title: "Passwords don't match",
                        description:
                          "Please make sure both passwords are the same.",
                        variant: "destructive",
                      });
                      return;
                    }

                    setIsLoading(true);
                    const response = await authServices.resetPasswordWithToken({
                      email: resetEmail,
                      token: resetToken,
                      newPassword,
                    });
                    setIsLoading(false);

                    if (response.success) {
                      toast({
                        title: "Password reset successful",
                        description:
                          response.data?.message ||
                          "You can now log in with your new password.",
                      });
                      // Reset all forgot-password state and go to login
                      setView("login");
                      setResetStep(1);
                      setResetEmail("");
                      setResetToken("");
                      setNewPassword("");
                      setConfirmPassword("");
                    } else {
                      toast({
                        title: "Reset failed",
                        description:
                          response.error ||
                          "Failed to reset password. The code may be invalid or expired.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <Label
                      htmlFor="new-password"
                      className="text-base font-medium"
                    >
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        className="h-12 rounded-xl border-muted-foreground/20 focus-visible:ring-primary/30 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="confirm-password"
                      className="text-base font-medium"
                    >
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        className="h-12 rounded-xl border-muted-foreground/20 focus-visible:ring-primary/30 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-destructive">
                        Passwords do not match
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 rounded-xl text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    disabled={isLoading || !newPassword || !confirmPassword}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                        Resetting...
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </Button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setResetStep(2);
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                      className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 mx-auto font-medium"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                  </div>
                </form>
              )}
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
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8">
              {/* Decorative background glow circles */}
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
              
              <div className="relative flex flex-col items-center text-center max-w-md space-y-6 z-10">
                {/* Logo Container with gold/blue glow and glassmorphism */}
                <div className="w-48 h-48 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-[0_0_50px_rgba(59,130,246,0.15)] hover:scale-105 transition-transform duration-500 p-6">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center p-5 shadow-inner">
                    <img
                      src="/ug_logo.png"
                      alt="University of Ghana Logo"
                      className="w-full h-full object-contain rounded-full filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
                    University of Ghana
                  </h2>
                  <p className="text-indigo-200/80 text-sm sm:text-base font-medium tracking-wide">
                    Integri Procedamus
                  </p>
                </div>
                
                <div className="w-16 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full opacity-60" />
                
                <p className="text-slate-400 text-xs sm:text-sm font-normal max-w-xs leading-relaxed">
                  Welcome to EduTrack. Access your courses, mark attendance via face check-in, and manage academic activities.
                </p>
              </div>
            </div>
          ) : (
            /* Kiosk Visual for Registration */
            <div className="w-full h-full flex items-center justify-center">
              <KioskScanner isScanning={true} status="scanning" className="p-0">
                <div className="flex flex-col items-center justify-center text-center p-6">
                  <div className="w-24 h-24 mb-6 rounded-3xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 shadow-glow p-3">
                    <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center p-2.5">
                      <img
                        src="/ug_logo.png"
                        alt="EduTrack"
                        className="w-full h-full object-contain rounded-xl"
                      />
                    </div>
                  </div>
                  <h1 className="text-5xl font-bold tracking-tight text-white drop-shadow-lg">
                    EduTrack
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
