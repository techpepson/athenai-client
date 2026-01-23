import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, RefreshCw, X } from "lucide-react";

interface ImageCaptureProps {
  currentImage?: string | null;
  onCapture: (imageData: string | null) => void;
  label?: string;
  description?: string;
  className?: string;
}

export const PhotoCapture = ({
  currentImage,
  onCapture,
  label = "Profile Photo",
  description = "Add a photo",
  className = "",
}: ImageCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(
    currentImage || null,
  );

  useEffect(() => {
    setPreviewImage(currentImage || null);
  }, [currentImage]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      setStream(mediaStream);
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setPreviewImage(dataUrl);
        onCapture(dataUrl);
        
        // Stop stream directly here to ensure it uses the current stream scope if closure is tricky, 
        // or rely on stopCamera if dependencies are fixed.
        // To be safe against stale closures, we'll access the stream reference directly if we used a ref, 
        // but since we use state, we MUST depend on 'stream'.
        if (stream) {
             stream.getTracks().forEach((track) => track.stop());
             setStream(null);
        }
        setIsCameraOpen(false);
      }
    }
  }, [onCapture, stream]); 
  
  // We can keep stopCamera for the Cancel button, but capturePhoto implements its own stop to be safe/explicit within the callback.


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreviewImage(result);
        onCapture(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setPreviewImage(null);
    onCapture(null);
  };

  return (
    <div className={`flex items-center gap-6 ${className}`}>
      <div className="relative">
        {isCameraOpen ? (
          <div className="w-32 h-32 rounded-xl overflow-hidden bg-black relative border-2 border-primary">
            <video
              ref={(ref) => {
                videoRef.current = ref;
                if (ref && stream) ref.srcObject = stream;
              }}
              autoPlay
              playsInline
              className="w-full h-full object-cover scale-x-[-1]"
            />
          </div>
        ) : previewImage ? (
          <div className="relative w-32 h-32">
            <img
              src={previewImage}
              alt="Preview"
              className="w-32 h-32 rounded-xl object-cover border-2 border-border"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={clearImage}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <div className="w-32 h-32 rounded-xl bg-secondary flex items-center justify-center border-2 border-dashed border-border">
            <Camera className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="space-y-2 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        
        <div className="flex flex-wrap gap-2">
            {isCameraOpen ? (
                <>
                    <Button type="button" size="sm" onClick={capturePhoto}>
                        Capture
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={stopCamera}>
                        Cancel
                    </Button>
                </>
            ) : (
                <>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={startCamera}
                    >
                        <Camera className="w-4 h-4 mr-2" />
                        Capture
                    </Button>
                    <div className="relative">
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id={`file-upload-${label}`}
                            onChange={handleFileUpload}
                        />
                        <Button type="button" variant="outline" size="sm" asChild>
                            <label htmlFor={`file-upload-${label}`} className="cursor-pointer">
                                <Upload className="w-4 h-4 mr-2" />
                                Upload
                            </label>
                        </Button>
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  );
};
