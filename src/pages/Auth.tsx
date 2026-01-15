import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Fingerprint, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { StudentForm } from '@/components/auth/StudentForm';
import { StaffForm } from '@/components/auth/StaffForm';
import { KioskScanner } from '@/components/ui/kiosk-scanner';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'login' | 'role-selection' | 'student-registration' | 'staff-registration'>('login');
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      toast({
        title: 'Welcome back!',
        description: 'You have been logged in successfully.',
      });
      navigate('/dashboard', { replace: true });
    } else {
      toast({
        title: 'Login failed',
        description: result.error || 'Invalid credentials',
        variant: 'destructive',
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 animate-fade-in">
        <div className="w-full max-w-[400px] space-y-8">
          {view === 'login' ? (
            <>
              {/* Login Header */}
              <div className="text-center space-y-2">
                <div className="flex justify-center mb-6">
                  <img src="/comasIcon.png" alt="FaceTrack" className="w-16 h-16 object-contain" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">FaceTrack</h1>
                <p className="text-muted-foreground">Sign into your account</p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-medium">Email</Label>
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
                  <Label htmlFor="password" className="text-base font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
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
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <a href="#" className="text-sm text-primary hover:underline font-medium">
                      Forgot password?
                    </a>
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
                    'Sign In'
                  )}
                </Button>

                <div className="text-center text-sm text-muted-foreground pt-2">
                  Don't have an account?{' '}
                  <button 
                    type="button" 
                    onClick={() => setView('role-selection')}
                    className="text-primary hover:underline font-semibold"
                  >
                    Create account
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Role Selection View (Shared for selection and student/staff registration) */
            <div className="space-y-8 animate-fade-in">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Choose your role</h1>
                <p className="text-muted-foreground">Select how you want to join FaceTrack</p>
              </div>

              <div className="space-y-4">
                <Button
                  variant={view === 'student-registration' ? 'default' : 'outline'}
                  className={`w-full h-20 text-lg font-semibold border-2 rounded-2xl flex items-center justify-between px-6 transition-all duration-300 ${
                    view === 'student-registration' 
                      ? 'border-primary bg-primary text-primary-foreground' 
                      : 'hover:border-primary hover:bg-primary/5'
                  }`}
                  onClick={() => setView('student-registration')}
                  disabled={view === 'staff-registration'}
                >
                  <span className={view === 'staff-registration' ? 'opacity-50' : ''}>Student</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                     view === 'student-registration' ? 'bg-white/20 text-white' : view === 'staff-registration' ? 'opacity-50' : 'bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground'
                  }`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-graduation-cap"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                  </div>
                </Button>

                <Button
                   variant={view === 'staff-registration' ? 'default' : 'outline'}
                   className={`w-full h-20 text-lg font-semibold border-2 rounded-2xl flex items-center justify-between px-6 transition-all duration-300 ${
                    view === 'staff-registration' 
                      ? 'border-primary bg-primary text-primary-foreground' 
                      : 'hover:border-primary hover:bg-primary/5'
                   }`}
                   onClick={() => setView('staff-registration')}
                   disabled={view === 'student-registration'}
                >
                  <span className={view === 'student-registration' ? 'opacity-50' : ''}>Lecturer / Staff</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      view === 'staff-registration' ? 'bg-white/20 text-white' : view === 'student-registration' ? 'opacity-50' : 'bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground'
                  }`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-briefcase"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>
                  </div>
                </Button>
              </div>

              <div className="pt-4">
                <Button
                  variant="ghost" 
                  onClick={() => setView('login')}
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  Back to login
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="hidden lg:flex w-1/2 p-4 bg-background items-center justify-center">
        <div className={`w-full h-full rounded-[2rem] relative overflow-hidden shadow-2xl transition-all duration-500 ${view === 'login' ? 'bg-muted/30' : 'bg-slate-950'}`}>
          {view === 'login' ? (
            /* Login Visual */
            <>
              <img 
                src="/loginImage.jpg" 
                alt="Login Visual" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20" />
            </>
          ) : view === 'student-registration' ? (
             /* Student Registration Form */
             <div className="bg-background w-full h-full p-8 flex flex-col relative z-20">
               <StudentForm />
             </div>
          ) : view === 'staff-registration' ? (
              /* Staff Registration Form */
              <div className="bg-background w-full h-full p-8 flex flex-col relative z-20">
                <StaffForm />
              </div>
          ) : (
            /* Default Kiosk Visual for Role Selection */
            <div className="w-full h-full flex items-center justify-center">
                 <KioskScanner isScanning={true} status="scanning" className="p-0">
                    <div className="flex flex-col items-center justify-center text-center p-6">
                        <div className="w-24 h-24 mb-6 rounded-3xl bg-primary/20 flex items-center justify-center backdrop-blur-md border border-primary/30 shadow-glow">
                           <img src="/comasIcon.png" alt="FaceTrack" className="w-14 h-14 object-contain contrast-125" />
                        </div>
                        <h1 className="text-5xl font-bold tracking-tight text-white drop-shadow-lg">FaceTrack</h1>
                        <p className="text-base text-slate-300 mt-3 font-medium tracking-wide">Identity Verification System</p>
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

