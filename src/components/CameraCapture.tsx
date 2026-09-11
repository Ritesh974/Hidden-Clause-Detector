import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, X } from "lucide-react";

/**
 * Live camera capture that works on Mac (Safari/Chrome), iPhone, iPad and Android.
 * Falls back are handled by the caller when getUserMedia is unavailable.
 */
export function CameraCapture({
  onCapture,
  onClose,
}: {
  onCapture: (files: File[]) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [shots, setShots] = useState<{ file: File; url: string }[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute("playsinline", "true");
          await video.play().catch(() => undefined);
        }
        setReady(true);
      } catch {
        setError(
          "I couldn't open your camera. Please allow camera access in your browser settings, or upload a photo instead.",
        );
      }
    }
    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function shoot() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `page-${shots.length + 1}.jpg`, { type: "image/jpeg" });
        setShots((prev) => [...prev, { file, url: URL.createObjectURL(file) }]);
      },
      "image/jpeg",
      0.9,
    );
  }

  function done() {
    onCapture(shots.map((s) => s.file));
    shots.forEach((s) => URL.revokeObjectURL(s.url));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-semibold">Scan your document</span>
        <button type="button" onClick={onClose} aria-label="Close camera" className="p-1">
          <X className="size-5" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {error ? (
          <p className="max-w-sm px-6 text-center text-sm text-white/90">{error}</p>
        ) : (
          <>
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className="max-h-full max-w-full object-contain"
            />
            {!ready && <Loader2 className="absolute size-8 animate-spin text-white" />}
          </>
        )}
      </div>

      {shots.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-2">
          {shots.map((s, i) => (
            <img
              key={s.url}
              src={s.url}
              alt={`Captured page ${i + 1}`}
              className="h-16 w-11 rounded-md border border-white/30 object-cover"
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 px-6 py-5">
        <span className="w-20 text-xs text-white/70">
          {shots.length ? `${shots.length} page${shots.length > 1 ? "s" : ""}` : "No pages yet"}
        </span>
        <button
          type="button"
          onClick={shoot}
          disabled={!ready || !!error}
          aria-label="Take photo of this page"
          className="flex size-16 items-center justify-center rounded-full border-4 border-white bg-white/20 disabled:opacity-40"
        >
          <Camera className="size-6 text-white" />
        </button>
        <button
          type="button"
          onClick={done}
          disabled={!shots.length}
          className="flex w-20 items-center justify-end gap-1 text-sm font-semibold text-white disabled:opacity-40"
        >
          <Check className="size-4" /> Done
        </button>
      </div>
    </div>
  );
}
