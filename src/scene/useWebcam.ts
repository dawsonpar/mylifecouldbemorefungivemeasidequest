import { useEffect, useState } from "react";

type WebcamStatus = "idle" | "requesting" | "ready" | "error";

export type WebcamHandle = {
  status: WebcamStatus;
  video: HTMLVideoElement | null;
  error: string | null;
};

/**
 * Acquires the user's webcam stream and returns a hidden <video>
 * element bound to it. The video is mirrored horizontally (the user
 * sees themselves as in a mirror, not as the camera sees them).
 */
export function useWebcam(): WebcamHandle {
  const [status, setStatus] = useState<WebcamStatus>("idle");
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    const el = document.createElement("video");
    el.muted = true;
    el.playsInline = true;
    el.autoplay = true;

    setStatus("requesting");

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      .then(async (s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        el.srcObject = s;
        await el.play().catch(() => undefined);
        setVideo(el);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      });

    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      el.srcObject = null;
    };
  }, []);

  return { status, video, error };
}
