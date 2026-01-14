import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Fingerprint, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 animate-fade-in">
        <div className="w-full max-w-[400px] space-y-8">
          {/* Header & Logo */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-6">
              <img src="/comasIcon.png" alt="FaceTrack" className="w-16 h-16 object-contain" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">FaceTrack</h1>
            <p className="text-muted-foreground">Sign into your account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@facetrack.com"
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
              <a href="#" className="text-primary hover:underline font-semibold">
                Create account
              </a>
            </div>
          </form>
        </div>
      </div>

      {/* Right Panel - Visual Branding */}
      <div className="hidden lg:flex w-1/2 p-4 bg-background items-center justify-center">
        <div className="w-full h-full rounded-[2rem] relative overflow-hidden shadow-2xl">
          <img 
            src="/loginImage.jpg" 
            alt="Login Visual" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20" />
        </div>
      </div>
    </div>
  );
};

export default Auth;
