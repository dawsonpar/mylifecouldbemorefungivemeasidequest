import type { HandLandmarker } from "@mediapipe/tasks-vision";
import { FilesetResolver, HandLandmarker as HL } from "@mediapipe/tasks-vision";
import type { HandsFrame } from "./landmarks";

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";

export type HandTracker = {
  start(video: HTMLVideoElement, onFrame: (frame: HandsFrame) => void): void;
  stop(): void;
};

/**
 * Initializes a MediaPipe HandLandmarker. The model and WASM bytes
 * are fetched from a CDN on first load. The README documents this
 * (model is fetched once, then cached).
 */
export async function createHandTracker(): Promise<HandTracker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
  const landmarker: HandLandmarker = await HL.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: "GPU",
    },
    numHands: 2,
    runningMode: "VIDEO",
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  let raf = 0;
  let lastVideoTime = -1;

  return {
    start(video, onFrame) {
      const tick = () => {
        raf = requestAnimationFrame(tick);
        if (video.readyState < 2) return;
        if (video.currentTime === lastVideoTime) return;
        lastVideoTime = video.currentTime;

        const ts = performance.now();
        const result = landmarker.detectForVideo(video, ts);
        const hands = (result.landmarks ?? []).map((points, i) => ({
          handedness: result.handedness?.[i]?.[0]?.categoryName ?? "Unknown",
          points: points.map((p) => ({ x: p.x, y: p.y, z: p.z })),
        }));
        onFrame({ hands, timestamp: ts });
      };
      tick();
    },
    stop() {
      cancelAnimationFrame(raf);
      landmarker.close();
    },
  };
}
