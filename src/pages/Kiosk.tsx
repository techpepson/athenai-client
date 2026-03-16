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
  Phone,
  Loader2,
  AlertCircle,
  Clock,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import * as faceapi from "face-api.js";
import {
  markAttendance,
  MarkAttendanceResponse,
} from "@/services/attendance.services";
import { getSessionById, Session } from "@/services/sessions.service";
import { toast } from "sonner";

type ScanState = "idle" | "scanning" | "processing" | "success" | "failed";

interface KioskSettings {
  adminPhoneNumber: string;
  organizationLogo: string | null;
}

interface AttendanceResult {
  name: string;
  time: string;
  status: string;
  confidence?: number;
}

// Session info from API
interface SessionInfo {
  id: string;
  name: string;
  courseId?: string;
  courseName?: string;
  courseCode?: string;
  lecturerId?: string;
  lecturerName?: string;
  lecturerStaffNo?: string;
  type: string;
  attendanceType: string;
  location?: string;
  startTime: string | Date;
  endTime: string | Date;
  expectedCount: number;
  presentCount: number;
  // Geofencing
  latitude?: number;
  longitude?: number;
  geofenceRadius?: number;
}

const Kiosk = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastCaptureTimeRef = useRef<number>(0);
  const processingRef = useRef<boolean>(false);

  // State
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [lastResult, setLastResult] = useState<AttendanceResult | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    late: 0,
    absent: 0,
    expected: 0,
  });
  const [kioskSettings, setKioskSettings] = useState<KioskSettings>({
    adminPhoneNumber: "",
    organizationLogo: null,
  });

  // Geolocation state
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "acquiring" | "acquired" | "denied" | "unavailable"
  >("idle");

  // Cooldown between captures (in milliseconds)
  const CAPTURE_COOLDOWN = 4000;

  // Load kiosk settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("kioskSettings");
    if (savedSettings) {
      setKioskSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      setIsModelLoading(true);
      try {
        const MODEL_URL = "/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
        console.log("Face detection models loaded successfully");
      } catch (err) {
        console.error("Error loading face-api models:", err);
        setError("Failed to load face detection models. Please refresh.");
      } finally {
        setIsModelLoading(false);
      }
    };
    loadModels();
  }, []);

  // Load session info from API
  useEffect(() => {
    const fetchSessionInfo = async () => {
      if (!sessionId) {
        setError("No session ID provided");
        setIsLoading(false);
        return;
      }

      try {
        const response = await getSessionById(sessionId);

        if (response.success && response.data) {
          const rawSessionData = response.data as unknown;
          const session =
            rawSessionData &&
            typeof rawSessionData === "object" &&
            "data" in rawSessionData
              ? (rawSessionData as { data: Session }).data
              : (rawSessionData as Session);
          const kioskGeofenceRadius =
            session.geofenceRadius == null
              ? 10
              : Math.min(session.geofenceRadius, 10);

          // Map API response to SessionInfo
          const mappedSession: SessionInfo = {
            id: session.id,
            name: session.name,
            courseId: session.courseId || undefined,
            courseName: session.course?.title || undefined,
            courseCode: session.course?.code || undefined,
            lecturerId: session.lecturerId || undefined,
            lecturerName: session.lecturer?.user?.name || undefined,
            lecturerStaffNo: session.lecturer?.staffNo || undefined,
            type: session.type,
            attendanceType:
              session.mode === "CHECK_IN" ? "checkin" : "checkout",
            location: session.location || undefined,
            startTime: session.startTime,
            endTime: session.endTime,
            latitude: session.latitude ?? undefined,
            longitude: session.longitude ?? undefined,
            geofenceRadius: kioskGeofenceRadius,
            expectedCount:
              session.course?._count?.enrollments ||
              session.course?.enrollments?.length ||
              0,
            presentCount:
              session.attendances?.filter(
                (a) => a.status === "PRESENT" || a.status === "LATE",
              ).length || 0,
          };

          setSessionInfo(mappedSession);

          // Set initial attendance stats
          setAttendanceStats({
            present: mappedSession.presentCount || 0,
            late:
              session.attendances?.filter((a) => a.status === "LATE").length ||
              0,
            absent: 0,
            expected: mappedSession.expectedCount || 0,
          });
        } else {
          setError(
            response.error || "Session not found. Please check the QR code.",
          );
        }
      } catch (err) {
        console.error("Error fetching session:", err);
        setError("Failed to load session. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionInfo();
  }, [sessionId]);

  // Acquire geolocation when session has geofencing
  useEffect(() => {
    if (
      !sessionInfo ||
      sessionInfo.latitude == null ||
      sessionInfo.longitude == null
    ) {
      return;
    }

    setLocationStatus("acquiring");

    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLocationStatus("acquired");
      },
      (err) => {
        console.error("Geolocation error:", err);
        setLocationStatus(err.code === 1 ? "denied" : "unavailable");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [sessionInfo]);

  // Start camera when session info is loaded
  useEffect(() => {
    const startCamera = async () => {
      if (!sessionInfo || isModelLoading) {
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
  }, [sessionInfo, isModelLoading]);

  // Convert data URL to Blob
  const dataURLtoBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

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
      return dataURLtoBlob(dataUrl);
    }
    return null;
  }, []);

  // Process attendance marking
  const processAttendance = useCallback(
    async (faceBlob: Blob) => {
      if (!sessionId || processingRef.current) return;

      processingRef.current = true;
      setScanState("processing");

      try {
        const response = await markAttendance(
          sessionId,
          faceBlob,
          "kiosk",
          userLocation?.latitude,
          userLocation?.longitude,
        );

        if (response.success && response.data) {
          const data = response.data as MarkAttendanceResponse;
          setScanState("success");
          setLastResult({
            name: "Attendance Recorded",
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            status: data.attendance.status,
            confidence: data.score,
          });

          // Update stats
          setAttendanceStats((prev) => {
            const newStats = { ...prev };
            // Only PRESENT (checked in + checked out) counts as fully present
            if (data.attendance.status === "PRESENT") {
              newStats.present += 1;
            } else if (data.attendance.status === "CHECKED_IN") {
              // CHECKED_IN is separate - user still needs to checkout
              // Don't increment present count
            } else if (data.attendance.status === "LATE") {
              newStats.late += 1;
            }
            return newStats;
          });

          // Show appropriate message based on status
          let statusMessage = data.attendance.status;
          if (data.attendance.status === "CHECKED_IN") {
            statusMessage = "CHECKED IN - Remember to check out!";
          }

          toast.success(
            `Attendance marked: ${statusMessage}${data.score ? ` (${Math.round(data.score * 100)}% confidence)` : ""}`,
          );

          // Reset to scanning after 3 seconds
          setTimeout(() => {
            setScanState("scanning");
            setLastResult(null);
            processingRef.current = false;
          }, 3000);
        } else {
          setScanState("failed");
          setLastResult({
            name: "Recognition Failed",
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            status: "FAILED",
          });

          toast.error(response.error || "Face not recognized");

          // Reset to scanning after 3 seconds
          setTimeout(() => {
            setScanState("scanning");
            setLastResult(null);
            processingRef.current = false;
          }, 3000);
        }
      } catch (err) {
        console.error("Error processing attendance:", err);
        setScanState("failed");

        setTimeout(() => {
          setScanState("scanning");
          setLastResult(null);
          processingRef.current = false;
        }, 3000);
      }
    },
    [sessionId, userLocation],
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
              processAttendance(faceBlob);
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
    processAttendance,
  ]);

  // Handle fullscreen toggle
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Handle call admin
  const handleCallAdmin = () => {
    if (kioskSettings.adminPhoneNumber) {
      window.location.href = `tel:${kioskSettings.adminPhoneNumber}`;
    }
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
            <span className="hidden md:inline">Exit Kiosk</span>
          </Button>
          {kioskSettings.organizationLogo && (
            <img
              src={kioskSettings.organizationLogo}
              alt="Organization Logo"
              className="h-6 md:h-10 w-auto object-contain"
            />
          )}
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
                    "w-48 h-48 sm:w-64 sm:h-64 border-2 rounded-2xl transition-all duration-300",
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
                    <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-2" />
                    <p className="text-white font-medium">Processing...</p>
                  </div>
                </div>
              )}

              {/* Camera icon placeholder when no video */}
              {!isCameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-secondary">
                  <Camera className="w-20 h-20 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Status indicator */}
            <div
              className={cn(
                "absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full font-medium transition-all duration-300",
                scanState === "success" && "bg-success text-success-foreground",
                scanState === "failed" &&
                  "bg-destructive text-destructive-foreground",
                scanState === "processing" &&
                  "bg-warning text-warning-foreground",
                scanState === "scanning" &&
                  "bg-primary/20 text-primary border border-primary/50",
              )}
            >
              {scanState === "scanning" && "Scanning..."}
              {scanState === "processing" && "Processing..."}
              {scanState === "success" && "Verified!"}
              {scanState === "failed" && "Not Recognized"}
            </div>
          </div>

          {/* Info Panel */}
          <div className="w-full lg:w-96 space-y-4 lg:space-y-6 order-first lg:order-last">
            {/* Status Card */}
            <div
              className={cn(
                "p-4 lg:p-8 rounded-2xl border transition-all duration-500",
                scanState === "success" && "bg-success/10 border-success/30",
                scanState === "failed" &&
                  "bg-destructive/10 border-destructive/30",
                scanState === "processing" && "bg-warning/10 border-warning/30",
                (scanState === "scanning" || scanState === "idle") &&
                  "bg-card border-border",
              )}
            >
              {scanState === "success" && lastResult && (
                <div className="text-center animate-scale-in">
                  <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Welcome!
                  </h2>
                  <p className="text-xl text-success font-semibold">
                    {lastResult.status}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Checked in at {lastResult.time}
                  </p>
                  {lastResult.confidence && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Confidence: {Math.round(lastResult.confidence * 100)}%
                    </p>
                  )}
                </div>
              )}

              {scanState === "failed" && (
                <div className="text-center animate-scale-in">
                  <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Not Recognized
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Please try again or contact admin
                  </p>

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

              {scanState === "processing" && (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-4">
                    <Loader2 className="w-8 h-8 text-warning animate-spin" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Processing
                  </h2>
                  <p className="text-muted-foreground">
                    Verifying your identity...
                  </p>
                </div>
              )}

              {(scanState === "scanning" || scanState === "idle") && (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Camera className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Ready to Scan
                  </h2>
                  <p className="text-muted-foreground">
                    Look at the camera to check in
                  </p>
                </div>
              )}
            </div>

            {/* Session Info */}
            {sessionInfo && (
              <div className="p-4 rounded-xl bg-card border border-border">
                <p className="text-sm text-muted-foreground mb-1">
                  Current Session
                </p>
                <p className="font-semibold text-foreground">
                  {sessionInfo.name}
                </p>
                {(sessionInfo.courseCode || sessionInfo.courseName) && (
                  <p className="text-sm text-muted-foreground">
                    {sessionInfo.courseCode}
                    {sessionInfo.courseCode && sessionInfo.courseName
                      ? " - "
                      : ""}
                    {sessionInfo.courseName}
                  </p>
                )}
                {sessionInfo.lecturerName && (
                  <p className="text-sm text-muted-foreground">
                    Lecturer: {sessionInfo.lecturerName}
                    {sessionInfo.lecturerStaffNo &&
                      ` (${sessionInfo.lecturerStaffNo})`}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                  {sessionInfo.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {sessionInfo.location}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(sessionInfo.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {new Date(sessionInfo.endTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full",
                      sessionInfo.attendanceType === "checkin"
                        ? "bg-primary/20 text-primary"
                        : "bg-warning/20 text-warning",
                    )}
                  >
                    {sessionInfo.attendanceType === "checkin"
                      ? "Check In Mode"
                      : "Check Out Mode"}
                  </span>
                </div>
                {/* Geofencing status */}
                {sessionInfo.latitude != null &&
                  sessionInfo.longitude != null && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs">
                      <MapPin
                        className={cn(
                          "w-3 h-3",
                          locationStatus === "acquired"
                            ? "text-success"
                            : locationStatus === "denied" ||
                                locationStatus === "unavailable"
                              ? "text-destructive"
                              : "text-muted-foreground",
                        )}
                      />
                      <span
                        className={cn(
                          locationStatus === "acquired"
                            ? "text-success"
                            : locationStatus === "denied" ||
                                locationStatus === "unavailable"
                              ? "text-destructive"
                              : "text-muted-foreground",
                        )}
                      >
                        {locationStatus === "acquired"
                          ? "Location verified"
                          : locationStatus === "acquiring"
                            ? "Acquiring location..."
                            : locationStatus === "denied"
                              ? "Location access denied"
                              : locationStatus === "unavailable"
                                ? "Location unavailable"
                                : "Geofencing enabled"}
                      </span>
                      {sessionInfo.geofenceRadius && (
                        <span className="text-muted-foreground">
                          ({sessionInfo.geofenceRadius}m radius)
                        </span>
                      )}
                    </div>
                  )}
              </div>
            )}

            {/* Help Card */}
            {kioskSettings.adminPhoneNumber && (
              <div className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-secondary">
                    <Phone className="w-6 h-6 text-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      Need Assistance?
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Call admin for help
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="p-2 md:p-4 bg-card/50 backdrop-blur-xl border-t border-border">
        <div className="flex items-center justify-center gap-4 md:gap-12">
          <div className="text-center">
            <p className="text-xl md:text-3xl font-bold text-success">
              {attendanceStats.present}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground">Present</p>
          </div>
          <div className="w-px h-8 md:h-12 bg-border" />
          <div className="text-center">
            <p className="text-xl md:text-3xl font-bold text-warning">
              {attendanceStats.late}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground">Late</p>
          </div>
          <div className="w-px h-8 md:h-12 bg-border" />
          <div className="text-center">
            <p className="text-xl md:text-3xl font-bold text-destructive">
              {attendanceStats.absent}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground">Absent</p>
          </div>
          <div className="w-px h-8 md:h-12 bg-border" />
          <div className="text-center">
            <p className="text-xl md:text-3xl font-bold text-foreground">
              {attendanceStats.expected}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground">Expected</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Kiosk;
