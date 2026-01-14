import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Camera, CheckCircle2, XCircle, QrCode, ArrowLeft, Maximize, Volume2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

type ScanState = 'scanning' | 'success' | 'failed' | 'idle';

interface KioskSettings {
  adminPhoneNumber: string;
  organizationLogo: string | null;
}

const Kiosk = () => {
  const navigate = useNavigate();
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [lastScanned, setLastScanned] = useState<{ name: string; time: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [kioskSettings, setKioskSettings] = useState<KioskSettings>({
    adminPhoneNumber: '',
    organizationLogo: null
  });

  // Load kiosk settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('kioskSettings');
    if (savedSettings) {
      setKioskSettings(JSON.parse(savedSettings));
    }
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate scanning
  useEffect(() => {
    const simulateScan = () => {
      const names = ['Emma Johnson', 'Marcus Chen', 'Aisha Patel', 'James Rodriguez'];
      const randomName = names[Math.floor(Math.random() * names.length)];
      
      setScanState('success');
      setLastScanned({
        name: randomName,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      
      setTimeout(() => setScanState('scanning'), 3000);
    };

    const interval = setInterval(simulateScan, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleCallAdmin = () => {
    if (kioskSettings.adminPhoneNumber) {
      window.location.href = `tel:${kioskSettings.adminPhoneNumber}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-card/50 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            Exit Kiosk
          </Button>
          {kioskSettings.organizationLogo && (
            <img 
              src={kioskSettings.organizationLogo} 
              alt="Organization Logo" 
              className="h-10 w-auto object-contain"
            />
          )}
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-sm text-muted-foreground">
            {currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Volume2 className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleFullscreen}>
            <Maximize className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex items-center gap-12 max-w-6xl w-full">
          {/* Camera View */}
          <div className="flex-1 relative">
            <div className={cn(
              'aspect-[4/3] rounded-3xl overflow-hidden border-4 transition-all duration-500',
              scanState === 'success' && 'border-success shadow-[0_0_60px_rgba(34,197,94,0.4)]',
              scanState === 'failed' && 'border-destructive shadow-[0_0_60px_rgba(239,68,68,0.4)]',
              scanState === 'scanning' && 'border-primary/50 animate-pulse-glow'
            )}>
              {/* Camera Placeholder */}
              <div className="w-full h-full bg-gradient-to-br from-secondary to-background flex items-center justify-center relative">
                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={cn(
                    'w-64 h-64 border-2 rounded-2xl transition-all duration-300',
                    scanState === 'success' && 'border-success scale-110',
                    scanState === 'failed' && 'border-destructive',
                    scanState === 'scanning' && 'border-primary/70'
                  )}>
                    {/* Corner markers */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg -translate-x-0.5 -translate-y-0.5" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg translate-x-0.5 -translate-y-0.5" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg -translate-x-0.5 translate-y-0.5" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg translate-x-0.5 translate-y-0.5" />
                  </div>
                </div>

                {/* Scanning line */}
                {scanState === 'scanning' && (
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan" />
                )}

                {/* Camera icon */}
                <Camera className="w-20 h-20 text-muted-foreground/30" />
              </div>
            </div>

            {/* Status indicator */}
            <div className={cn(
              'absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full font-medium transition-all duration-300',
              scanState === 'success' && 'bg-success text-success-foreground',
              scanState === 'failed' && 'bg-destructive text-destructive-foreground',
              scanState === 'scanning' && 'bg-primary/20 text-primary border border-primary/50'
            )}>
              {scanState === 'scanning' && 'Scanning...'}
              {scanState === 'success' && 'Verified!'}
              {scanState === 'failed' && 'Not Recognized'}
            </div>
          </div>

          {/* Info Panel */}
          <div className="w-96 space-y-6">
            {/* Status Card */}
            <div className={cn(
              'p-8 rounded-2xl border transition-all duration-500',
              scanState === 'success' && 'bg-success/10 border-success/30',
              scanState === 'failed' && 'bg-destructive/10 border-destructive/30',
              scanState === 'scanning' && 'bg-card border-border'
            )}>
              {scanState === 'success' && lastScanned && (
                <div className="text-center animate-scale-in">
                  <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-foreground mb-2">Welcome!</h2>
                  <p className="text-xl text-success font-semibold">{lastScanned.name}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Checked in at {lastScanned.time}
                  </p>
                </div>
              )}

              {scanState === 'failed' && (
                <div className="text-center animate-scale-in">
                  <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-foreground mb-2">Not Recognized</h2>
                  <p className="text-muted-foreground mb-4">Please try again or use QR code</p>
                  
                  {kioskSettings.adminPhoneNumber && (
                    <Button 
                      variant="outline" 
                      className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                      onClick={handleCallAdmin}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Call Admin for Assistance
                    </Button>
                  )}
                </div>
              )}

              {scanState === 'scanning' && (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Camera className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Ready to Scan</h2>
                  <p className="text-muted-foreground">Look at the camera to check in</p>
                </div>
              )}
            </div>

            {/* QR Alternative */}
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-secondary">
                  <QrCode className="w-6 h-6 text-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Having trouble?</p>
                  <p className="text-sm text-muted-foreground">Scan your QR badge instead</p>
                </div>
              </div>
            </div>

            {/* Session Info */}
            <div className="p-4 rounded-xl bg-card border border-border">
              <p className="text-sm text-muted-foreground mb-1">Current Session</p>
              <p className="font-semibold text-foreground">Introduction to Programming</p>
              <p className="text-sm text-muted-foreground">Room 101 • Dr. Sarah Williams</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="p-4 bg-card/50 backdrop-blur-xl border-t border-border">
        <div className="flex items-center justify-center gap-12">
          <div className="text-center">
            <p className="text-3xl font-bold text-success">38</p>
            <p className="text-sm text-muted-foreground">Present</p>
          </div>
          <div className="w-px h-12 bg-border" />
          <div className="text-center">
            <p className="text-3xl font-bold text-warning">5</p>
            <p className="text-sm text-muted-foreground">Late</p>
          </div>
          <div className="w-px h-12 bg-border" />
          <div className="text-center">
            <p className="text-3xl font-bold text-destructive">2</p>
            <p className="text-sm text-muted-foreground">Absent</p>
          </div>
          <div className="w-px h-12 bg-border" />
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">45</p>
            <p className="text-sm text-muted-foreground">Expected</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Kiosk;
