import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ScanFace,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import * as faceapi from "face-api.js";
import { KioskScanner } from "@/components/ui/kiosk-scanner";

interface FacialRegistrationProps {
  onCapture: (imageData: string | null) => void;
  className?: string;
}

export const FacialRegistration = ({
  onCapture,
  className,
}: FacialRegistrationProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState(false);

  // Load models on mount
  useEffect(() => {
    const loadModels = async () => {
      setIsModelLoading(true);
      try {
        const MODEL_URL = "/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        console.log("Face API models loaded");
      } catch (err) {
        console.error("Error loading face-api models:", err);
        setDetectionError(
          "Failed to load face detection models. Please refresh.",
        );
      } finally {
        setIsModelLoading(false);
      }
    };
    loadModels();
  }, []);

  const startCamera = async () => {
    setCameraPermissionError(false);
    setDetectionError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 960 }, // 4:3 Aspect Ratio for Kiosk look
        },
      });
      setStream(mediaStream);
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraPermissionError(true);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
    setFaceDetected(false);
  };

  // Attach stream to video element when it becomes available
  useEffect(() => {
    if (isCameraOpen && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraOpen, stream]);

  // Face Detection Loop
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const startDetection = async () => {
      if (
        !isCameraOpen ||
        !videoRef.current ||
        !canvasRef.current ||
        isModelLoading
      )
        return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Wait for video to be ready
      if (video.readyState !== 4) return;

      const displaySize = {
        width: video.videoWidth,
        height: video.videoHeight,
      };
      faceapi.matchDimensions(canvas, displaySize);

      intervalId = setInterval(async () => {
        if (video.paused || video.ended) return;

        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        const resizedDetections = faceapi.resizeResults(
          detections,
          displaySize,
        );

        // Clear canvas
        const context = canvas.getContext("2d");
        if (context) {
          context.clearRect(0, 0, canvas.width, canvas.height);

          // Draw detections (optional, maybe distracting for kiosk mode?)
          // Keep it minimal: scanning box is enough
          // faceapi.draw.drawDetections(canvas, resizedDetections);
        }

        if (detections.length > 0) {
          setFaceDetected(true);
        } else {
          setFaceDetected(false);
        }
      }, 200); // Check every 200ms
    };

    if (isCameraOpen) {
      const timer = setTimeout(startDetection, 1000);
      return () => {
        clearTimeout(timer);
        clearInterval(intervalId);
      };
    }
  }, [isCameraOpen, isModelLoading]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setCapturedImage(dataUrl);
        onCapture(dataUrl);

        // Stop camera directly to avoid stale closure on stopCamera function
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
          setStream(null);
        }
        setIsCameraOpen(false);
        setFaceDetected(false);
      }
    }
  }, [onCapture, stream]);

  const retakePhoto = () => {
    setCapturedImage(null);
    onCapture(null);
    startCamera();
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className={`space-y-4 ${className}`}>
      <KioskScanner
        className="aspect-[4/3] p-0"
        isScanning={isCameraOpen && !faceDetected}
        status={
          isCameraOpen && faceDetected
            ? "success"
            : isCameraOpen
              ? "scanning"
              : capturedImage
                ? "success"
                : "idle"
        }
        statusMessage={
          isCameraOpen && faceDetected
            ? "Face Detected"
            : isCameraOpen
              ? "Searching for face..."
              : capturedImage
                ? "Identity Verified"
                : undefined
        }
        showScannerOverlay={isCameraOpen}
      >
        {/* Loading Models State */}
        {isModelLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20 backdrop-blur-sm">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">
                Initializing Face Detection...
              </p>
            </div>
          </div>
        )}

        {/* Permission Error State */}
        {cameraPermissionError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-20 p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mb-3" />
            <p className="text-lg font-semibold text-destructive mb-2">
              Camera Access Denied
            </p>
            <p className="text-muted-foreground mb-6 max-w-xs">
              We need camera access to verify your identity. Please verify your
              browser settings.
            </p>
            <Button variant="outline" onClick={startCamera}>
              Try Again
            </Button>
          </div>
        )}

        {/* General Error State */}
        {detectionError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-20 p-4 text-center">
            <AlertCircle className="w-10 h-10 text-destructive mb-2" />
            <p className="text-sm font-medium text-destructive">
              {detectionError}
            </p>
          </div>
        )}

        {/* Captured Image View */}
        {!isCameraOpen && capturedImage ? (
          <div className="relative w-full h-full animate-in fade-in zoom-in-95 duration-300">
            <img
              src={capturedImage}
              alt="Captured Face"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center backdrop-blur-[2px]">
              <div className="bg-background/95 backdrop-blur-xl text-foreground px-6 py-4 rounded-2xl shadow-2xl flex flex-col items-center gap-2 border border-success/30 animate-in slide-in-from-bottom-5">
                <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mb-1">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <span className="font-bold text-lg">Identity Verified</span>
                <p className="text-xs text-muted-foreground">
                  Photo captured successfully
                </p>
              </div>
            </div>
          </div>
        ) : /* Camera View */
        isCameraOpen ? (
          <div className="relative w-full h-full bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />

            {/* Face Detection Overlay Canvas (Invisible logic layer) */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full scale-x-[-1] pointer-events-none opacity-50"
            />
          </div>
        ) : (
          /* Initial State (Kiosk Style) */
          <div className="text-center p-4 sm:p-8 transition-colors w-full h-full flex flex-col items-center justify-center bg-white min-h-[280px]">
            <div className="mb-4 sm:mb-6">
              <ScanFace className="w-12 h-12 sm:w-16 sm:h-16 text-primary" />
            </div>
            <h3 className="font-bold text-xl sm:text-2xl mb-2 text-foreground">
              Facial Verification
            </h3>
            <p className="text-muted-foreground max-w-xs mx-auto mb-4 sm:mb-8 text-sm sm:text-base">
              Please position your face within the frame to verify your
              identity.
            </p>
            <Button
              onClick={startCamera}
              size="lg"
              className="rounded-full px-6 sm:px-8 h-10 sm:h-12 shadow-lg text-base sm:text-lg"
            >
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Start Camera
            </Button>
          </div>
        )}
      </KioskScanner>

      {/* Controls */}
      <div className="flex justify-end gap-3 actions-area">
        {isCameraOpen && (
          <>
            <Button
              variant="secondary"
              onClick={stopCamera}
              className="rounded-xl h-12 px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={capturePhoto}
              disabled={!faceDetected}
              className={cn(
                "rounded-xl h-12 px-8 font-semibold shadow-lg transition-all",
                faceDetected ? "bg-primary hover:bg-primary/90" : "opacity-80",
              )}
              size="lg"
            >
              {faceDetected ? "Capture Photo" : "Waiting for face..."}
            </Button>
          </>
        )}

        {!isCameraOpen && capturedImage && (
          <Button
            variant="outline"
            onClick={retakePhoto}
            className="w-full h-12 rounded-xl border-2 text-base font-medium hover:bg-muted"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retake Photo
          </Button>
        )}
      </div>
    </div>
  );
};
