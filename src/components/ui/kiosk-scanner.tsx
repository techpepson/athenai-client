import React from "react";
import { cn } from "@/lib/utils";
import { Loader2, ScanFace } from "lucide-react";

interface KioskScannerProps {
  children?: React.ReactNode;
  isScanning?: boolean;
  status?: "idle" | "scanning" | "success" | "error";
  statusMessage?: string;
  className?: string;
  showScannerOverlay?: boolean;
}

export const KioskScanner = ({
  children,
  isScanning = true,
  status = "idle",
  statusMessage,
  className,
  showScannerOverlay = true,
}: KioskScannerProps) => {
  return (
    <div
      className={cn(
        "w-full relative flex items-center justify-center p-4 lg:p-12",
        className,
      )}
    >
      {/* Background (Dark Mode Kiosk Feel) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-90 rounded-[2rem]" />
      <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay rounded-[2rem]" />

      {/* Main Frame */}
      <div
        className={cn(
          "relative w-full max-w-lg aspect-[3/4] sm:aspect-[3/4] lg:aspect-[4/5] h-auto min-h-[280px] sm:min-h-0 lg:h-[85%] rounded-2xl sm:rounded-3xl overflow-hidden border-2 sm:border-4 transition-all duration-500 shadow-2xl backdrop-blur-sm z-10 flex flex-col",
          status === "success"
            ? "border-success shadow-[0_0_60px_rgba(34,197,94,0.4)]"
            : status === "error"
              ? "border-destructive shadow-[0_0_60px_rgba(239,68,68,0.4)]"
              : "border-primary/50 bg-gradient-to-br from-secondary/10 to-transparent shadow-[0_0_40px_rgba(59,130,246,0.3)]",
        )}
      >
        {/* Content Layer */}
        <div className="relative z-0 w-full h-full flex items-center justify-center overflow-visible">
          {children}
        </div>

        {/* Scanner Overlay Layer (on top of content) */}
        {showScannerOverlay && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
            {/* Central Frame */}
            <div
              className={cn(
                "w-64 h-64 border-2 rounded-2xl relative transition-all duration-300",
                status === "success"
                  ? "border-success scale-105"
                  : status === "error"
                    ? "border-destructive"
                    : "border-primary/70",
              )}
            >
              {/* Corner markers */}
              <div
                className={cn(
                  "absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-lg -translate-x-0.5 -translate-y-0.5 transition-colors",
                  status === "success"
                    ? "border-success"
                    : status === "error"
                      ? "border-destructive"
                      : "border-primary",
                )}
              />
              <div
                className={cn(
                  "absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-lg translate-x-0.5 -translate-y-0.5 transition-colors",
                  status === "success"
                    ? "border-success"
                    : status === "error"
                      ? "border-destructive"
                      : "border-primary",
                )}
              />
              <div
                className={cn(
                  "absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-lg -translate-x-0.5 translate-y-0.5 transition-colors",
                  status === "success"
                    ? "border-success"
                    : status === "error"
                      ? "border-destructive"
                      : "border-primary",
                )}
              />
              <div
                className={cn(
                  "absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-lg translate-x-0.5 translate-y-0.5 transition-colors",
                  status === "success"
                    ? "border-success"
                    : status === "error"
                      ? "border-destructive"
                      : "border-primary",
                )}
              />
            </div>

            {/* Scanning Line Animation */}
            {isScanning && status !== "success" && status !== "error" && (
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-[scan-vertical_4s_ease-in-out_infinite] shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
            )}
          </div>
        )}

        {/* Status Message (Bottom Pill) */}
        {statusMessage && (
          <div className="absolute bottom-8 left-0 right-0 flex justify-center z-30 pointer-events-none">
            <div
              className={cn(
                "px-6 py-2.5 rounded-full backdrop-blur-md border shadow-lg flex items-center gap-2 transition-all duration-300",
                status === "success"
                  ? "bg-success/20 border-success/40 text-success-foreground"
                  : status === "error"
                    ? "bg-destructive/20 border-destructive/40 text-destructive-foreground"
                    : "bg-black/60 border-white/10 text-white",
              )}
            >
              {status === "scanning" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : status === "success" ? (
                <ScanFace className="w-4 h-4" />
              ) : null}
              <span className="font-medium text-sm">{statusMessage}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
