import { useEffect } from "react";
import { useAppStore } from "../state/store";

const KICK_AV = 4.0;

/**
 * Dev-only phase shortcuts. Fires GestureEvent-equivalent actions
 * via the store so the on-camera loop can be exercised without
 * a hand-tracker. Keys are documented in the README.
 */
export function useKeyboardShortcuts() {
  const store = useAppStore.getState;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const s = store();
      switch (e.key.toLowerCase()) {
        case "w":
          s.wake();
          break;
        case "s":
          // Kick spin clockwise. Successive presses add more impulse.
          s.startSpin(KICK_AV, s.spin.openness || 0.7);
          break;
        case "a":
          s.startSpin(-KICK_AV, s.spin.openness || 0.7);
          break;
        case "+":
        case "=":
          // Open the hand (less friction, longer spin).
          s.updateSpin(s.spin.handAV, Math.min(1, s.spin.openness + 0.15));
          break;
        case "-":
          // Close the hand (more friction, faster decay).
          s.updateSpin(s.spin.handAV, Math.max(0, s.spin.openness - 0.15));
          break;
        case "enter":
          s.stopAndSelect();
          break;
        case "c":
          s.cut();
          break;
        case "y":
          void s.acceptCurrent();
          break;
        case "n":
          s.rejectCurrent();
          break;
        case "t":
          s.fireThrow();
          break;
        case "r":
          s.finishReset();
          break;
        case "h":
          s.toggleCollection();
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [store]);
}
