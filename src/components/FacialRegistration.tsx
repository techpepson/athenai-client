import { useState, useRef, useCallback } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface FacialRegistrationProps {
  onCapture: (imageData: string | null) => void;
  className?: string;
}

export const FacialRegistration = ({ onCapture, className }: FacialRegistrationProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please check permissions.");
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64 data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        onCapture(dataUrl);
        stopCamera();
      }
    }
  }, [onCapture, stream]);

  const retakePhoto = () => {
    setCapturedImage(null);
    onCapture(null);
    startCamera();
  };

  // Clean up on unmount
  useState(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  });

  return (
    <div className={`space-y-4 ${className}`}>
        <div className="relative w-full aspect-video bg-muted rounded-xl overflow-hidden border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center">
          
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-20 p-4 text-center">
              <AlertCircle className="w-10 h-10 text-destructive mb-2" />
              <p className="text-sm font-medium text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={startCamera} className="mt-4">
                Try Again
              </Button>
            </div>
          )}

          {/* Captured Image View */}
          {!isCameraOpen && capturedImage ? (
            <div className="relative w-full h-full">
              <img 
                src={capturedImage} 
                alt="Captured Face" 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                 <div className="bg-background/90 text-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">Face Captured</span>
                 </div>
              </div>
            </div>
          ) : (
            /* Camera View */
            isCameraOpen ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover scale-x-[-1]" // Mirror effect
              />
            ) : (
               /* Initial State */
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-1">Face Registration</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We need to scan your face to verify your identity.
                </p>
                <Button onClick={startCamera}>
                  Start Camera
                </Button>
              </div>
            )
          )}
          
          {/* Hidden Canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="flex justify-end gap-3">
          {isCameraOpen && (
             <>
               <Button variant="outline" onClick={stopCamera}>Cancel</Button>
               <Button onClick={capturePhoto}>Capture Photo</Button>
             </>
          )}
          
          {!isCameraOpen && capturedImage && (
            <Button variant="outline" onClick={retakePhoto} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retake Photo
            </Button>
          )}
        </div>
    </div>
  );
};
