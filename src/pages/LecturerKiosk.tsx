import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Camera,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Maximize,
  Volume2,
  Loader2,
  AlertCircle,
  Clock,
  MapPin,
  User,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import * as faceapi from "face-api.js";
import { toast } from "sonner";
import {
  modulesService,
  Module,
  TimetableSlot,
} from "@/services/modules.service";

type ScanState = "idle" | "scanning" | "processing" | "success" | "failed";

// localStorage keys
const LECTURER_ATTENDANCE_KEY = "lecturer_attendance_records";
const ACTIVE_SESSIONS_KEY = "active_lecture_sessions";

// Slot info from timetable
interface SlotInfo {
  id: string;
  moduleCode: string;
  moduleName: string;
  subtopicName: string;
  lecturerName: string;
  venue?: string;
  startTime: string;
  endTime: string;
  day: string;
  week?: number;
}

const LecturerKiosk = () => {
  const { slotId } = useParams<{ slotId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastCaptureTimeRef = useRef<number>(0);
  const processingRef = useRef<boolean>(false);

  // State
  const [slotInfo, setSlotInfo] = useState<SlotInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [verificationMessage, setVerificationMessage] = useState<string>("");

  // Cooldown between captures (in milliseconds)
  const CAPTURE_COOLDOWN = 4000;

  // Load slot info from timetable
  useEffect(() => {
    if (!slotId) {
      setError("No session ID provided");
      setIsLoading(false);
      return;
    }

    // Find the slot in timetables
    const timetables = modulesService.getTimetables();
    const modules = modulesService.getModules();

    let foundSlot: TimetableSlot | null = null;
    let foundModule: Module | null = null;

    for (const timetable of timetables) {
      const slot = timetable.slots.find((s) => s.id === slotId);
      if (slot) {
        foundSlot = slot;
        foundModule = modules.find((m) => m.id === timetable.moduleId) || null;
        break;
      }
    }

    if (!foundSlot || !foundModule) {
      setError("Session not found. Please check the link.");
      setIsLoading(false);
      return;
    }

    // Get subtopic name
    const subtopic = foundModule.subtopics.find(
      (s) => s.id === foundSlot!.subtopicId,
    );

    setSlotInfo({
      id: foundSlot.id,
      moduleCode: foundModule.code,
      moduleName: foundModule.name,
      subtopicName: subtopic?.name || "Lecture",
      lecturerName: "Lecturer",
      venue: foundSlot.venue,
      startTime: foundSlot.startTime,
      endTime: foundSlot.endTime,
      day: foundSlot.day,
      week: foundSlot.week,
    });

    setIsLoading(false);
  }, [slotId]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setIsModelLoading(false);
      } catch (err) {
        console.error("Error loading face-api models:", err);
        setError("Failed to load face detection models");
        setIsModelLoading(false);
      }
    };

    loadModels();
  }, []);

  // Start camera when ready
  useEffect(() => {
    const startCamera = async () => {
      if (!slotInfo || isModelLoading) {
        return;
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
        });
        streamRef.current = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            setIsCameraReady(true);
            setScanState("scanning");
          };
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Camera access denied. Please allow camera permissions.");
      }
    };

    startCamera();

    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [slotInfo, isModelLoading]);

  // Capture frame from video
  const captureFrame = useCallback((): Blob | null => {
    if (!videoRef.current) return null;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");

    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const arr = dataUrl.split(",");
      const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    }
    return null;
  }, []);

  // Process lecturer verification
  const processVerification = useCallback(
    async (faceBlob: Blob) => {
      if (!slotId || !slotInfo || processingRef.current) return;

      processingRef.current = true;
      setScanState("processing");
      setVerificationMessage("Verifying identity...");

      try {
        // Simulate face verification (in production, this would call a backend API)
        // For now, we'll auto-verify after detecting a face
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Success - save lecturer signature
        const today = new Date();
        const lecturerName = slotInfo.lecturerName;

        // Update localStorage with lecturer signature
        const storedRecords = localStorage.getItem(LECTURER_ATTENDANCE_KEY);
        const records = storedRecords ? JSON.parse(storedRecords) : [];

        // Find the record for this slot
        const recordIndex = records.findIndex(
          (r: { slotId: string }) => r.slotId === slotId,
        );

        if (recordIndex >= 0) {
          // Update existing record
          records[recordIndex].lecturerSignature = lecturerName;
          records[recordIndex].lecturerSignedAt = today.toISOString();
        } else {
          // Create new record entry with lecturer signature
          records.push({
            id: `lecturer-sig-${slotId}-${Date.now()}`,
            slotId: slotId,
            lecturerSignature: lecturerName,
            lecturerSignedAt: today.toISOString(),
          });
        }

        localStorage.setItem(LECTURER_ATTENDANCE_KEY, JSON.stringify(records));

        // Dispatch event for LecturerAttendanceTab to pick up
        window.dispatchEvent(
          new CustomEvent("lecturer-signed-in", {
            detail: {
              slotId,
              status: 1, // verified
              topicCode: slotInfo.subtopicName,
              moduleCode: slotInfo.moduleCode,
              moduleName: slotInfo.moduleName,
              lecturerId: slotInfo.id,
              lecturerName: slotInfo.lecturerName,
              week: slotInfo.week,
              date: today.toISOString().split("T")[0],
              signedAt: today,
            },
          }),
        );

        // Also dispatch storage event for cross-tab sync
        window.dispatchEvent(new Event("storage"));

        setScanState("success");
        setVerificationMessage(
          `Verified! Welcome, ${lecturerName}. Your attendance has been recorded.`,
        );

        toast.success("Lecturer attendance verified!", {
          description:
            "Your signature has been recorded on the attendance sheet.",
        });

        // Auto-close after 5 seconds
        setTimeout(() => {
          navigate(-1);
        }, 5000);
      } catch (err) {
        console.error("Error processing verification:", err);
        setScanState("failed");
        setVerificationMessage("Verification failed. Please try again.");

        toast.error("Verification failed");

        // Reset to scanning after 3 seconds
        setTimeout(() => {
          setScanState("scanning");
          setVerificationMessage("");
          processingRef.current = false;
        }, 3000);
      }
    },
    [slotId, slotInfo, navigate],
  );

  // Face detection loop
  useEffect(() => {
    let detectionInterval: NodeJS.Timeout;

    const detectFaces = async () => {
      if (
        !isCameraReady ||
        !videoRef.current ||
        !canvasRef.current ||
        isModelLoading ||
        scanState === "processing" ||
        scanState === "success" ||
        scanState === "failed" ||
        processingRef.current
      ) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState !== 4) return;

      const displaySize = {
        width: video.videoWidth,
        height: video.videoHeight,
      };
      faceapi.matchDimensions(canvas, displaySize);

      try {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        const context = canvas.getContext("2d");
        if (context) {
          context.clearRect(0, 0, canvas.width, canvas.height);
        }

        // Check if face is detected and we're past cooldown
        if (detections.length > 0 && !processingRef.current) {
          const now = Date.now();
          if (now - lastCaptureTimeRef.current >= CAPTURE_COOLDOWN) {
            lastCaptureTimeRef.current = now;

            // Capture and process
            const faceBlob = captureFrame();
            if (faceBlob) {
              processVerification(faceBlob);
            }
          }
        }
      } catch (err) {
        console.error("Face detection error:", err);
      }
    };

    if (isCameraReady && !isModelLoading && scanState === "scanning") {
      // Run detection every 300ms
      detectionInterval = setInterval(detectFaces, 300);
    }

    return () => {
      if (detectionInterval) {
        clearInterval(detectionInterval);
      }
    };
  }, [
    isCameraReady,
    isModelLoading,
    scanState,
    captureFrame,
    processVerification,
  ]);

  // Handle fullscreen toggle
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Format time for display
  const formatTime = (timeStr: string): string => {
    const [h, m] = timeStr.split(":").map(Number);
    const hours = h < 7 ? h + 12 : h;
    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${(m || 0).toString().padStart(2, "0")} ${period}`;
  };

  // Loading state
  if (isLoading || isModelLoading) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">
            {isModelLoading
              ? "Loading face detection models..."
              : "Loading session..."}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Error</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-2 md:p-4 bg-card/50 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-xs md:text-sm"
          >
            <ArrowLeft className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Exit</span>
          </Button>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Lecturer Attendance
            </span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-lg md:text-2xl font-bold text-foreground">
            {currentTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
          <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
            {currentTime.toLocaleDateString([], {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:h-10 md:w-10"
          >
            <Volume2 className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFullscreen}
            className="h-8 w-8 md:h-10 md:w-10"
          >
            <Maximize className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-y-auto">
        <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-12 max-w-6xl w-full">
          {/* Camera View */}
          <div className="flex-1 w-full relative">
            <div
              className={cn(
                "aspect-[4/3] rounded-3xl overflow-hidden border-4 transition-all duration-500 relative",
                scanState === "success" &&
                  "border-success shadow-[0_0_60px_rgba(34,197,94,0.4)]",
                scanState === "failed" &&
                  "border-destructive shadow-[0_0_60px_rgba(239,68,68,0.4)]",
                scanState === "processing" &&
                  "border-warning shadow-[0_0_60px_rgba(234,179,8,0.4)]",
                scanState === "scanning" &&
                  "border-primary/50 animate-pulse-glow",
              )}
            >
              {/* Video Feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Canvas Overlay for face detection visualization */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />

              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={cn(
                    "w-64 h-64 border-2 rounded-2xl transition-all duration-300",
                    scanState === "success" && "border-success scale-110",
                    scanState === "failed" && "border-destructive",
                    scanState === "processing" && "border-warning",
                    scanState === "scanning" && "border-primary/70",
                  )}
                >
                  {/* Corner markers */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg -translate-x-0.5 -translate-y-0.5" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg translate-x-0.5 -translate-y-0.5" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg -translate-x-0.5 translate-y-0.5" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg translate-x-0.5 translate-y-0.5" />
                </div>
              </div>

              {/* Scanning line animation */}
              {scanState === "scanning" && (
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan" />
              )}

              {/* Processing overlay */}
              {scanState === "processing" && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-16 h-16 text-warning animate-spin mx-auto" />
                    <p className="text-white text-lg mt-4">Verifying...</p>
                  </div>
                </div>
              )}

              {/* Success overlay */}
              {scanState === "success" && (
                <div className="absolute inset-0 bg-success/20 flex items-center justify-center">
                  <div className="text-center">
                    <CheckCircle2 className="w-24 h-24 text-success mx-auto" />
                    <p className="text-white text-xl mt-4 font-bold">
                      Verified!
                    </p>
                  </div>
                </div>
              )}

              {/* Failed overlay */}
              {scanState === "failed" && (
                <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center">
                  <div className="text-center">
                    <XCircle className="w-24 h-24 text-destructive mx-auto" />
                    <p className="text-white text-xl mt-4 font-bold">
                      Verification Failed
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Session Info Panel */}
          <div className="w-full lg:w-96 space-y-6">
            {/* Session Details Card */}
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {slotInfo?.moduleName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {slotInfo?.moduleCode}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <BookOpen className="w-5 h-5" />
                  <span>{slotInfo?.subtopicName}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <User className="w-5 h-5" />
                  <span>{slotInfo?.lecturerName}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Clock className="w-5 h-5" />
                  <span>
                    {formatTime(slotInfo?.startTime || "")} -{" "}
                    {formatTime(slotInfo?.endTime || "")}
                  </span>
                </div>
                {slotInfo?.venue && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="w-5 h-5" />
                    <span>{slotInfo.venue}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Instructions / Status Card */}
            <div
              className={cn(
                "rounded-2xl p-6 border transition-all",
                scanState === "success"
                  ? "bg-success/10 border-success"
                  : scanState === "failed"
                    ? "bg-destructive/10 border-destructive"
                    : "bg-card border-border",
              )}
            >
              {scanState === "scanning" && (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <Camera className="w-6 h-6 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">
                      Face Verification
                    </h3>
                  </div>
                  <p className="text-muted-foreground">
                    Position your face within the frame for automatic
                    verification. Your attendance will be recorded once
                    verified.
                  </p>
                </>
              )}

              {scanState === "processing" && (
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-warning animate-spin mx-auto mb-3" />
                  <p className="text-foreground font-medium">
                    {verificationMessage}
                  </p>
                </div>
              )}

              {scanState === "success" && (
                <div className="text-center">
                  <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
                  <p className="text-success font-medium">
                    {verificationMessage}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Redirecting in a few seconds...
                  </p>
                </div>
              )}

              {scanState === "failed" && (
                <div className="text-center">
                  <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
                  <p className="text-destructive font-medium">
                    {verificationMessage}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Retrying automatically...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LecturerKiosk;
