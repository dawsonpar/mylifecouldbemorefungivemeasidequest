import { useEffect } from "react";
import { useAppStore } from "../state/store";
import {
  SASHIKO_PATTERN_ORDER,
  type SashikoPattern,
} from "../scene/sashiko-patterns";

const KICK_AV = 4.0;

/**
 * Returns the next pattern in the cycle: null -> asanoha -> shippo
 * -> jujizashi -> yabane -> null. null means "release the override
 * and fall back to the quest's own pattern field".
 */
function nextPatternInCycle(
  current: SashikoPattern | null,
): SashikoPattern | null {
  if (current === null) return SASHIKO_PATTERN_ORDER[0];
  const idx = SASHIKO_PATTERN_ORDER.indexOf(current);
  if (idx < 0 || idx === SASHIKO_PATTERN_ORDER.length - 1) return null;
  return SASHIKO_PATTERN_ORDER[idx + 1];
}

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

      // Cmd+Shift+P (or Ctrl+Shift+P) cycles the sashiko pattern
      // override. Dev-only so the rotated bundle in production omits
      // the override entirely and no override indicator ever ships.
      if (
        import.meta.env.DEV &&
        e.shiftKey &&
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "p"
      ) {
        const next = nextPatternInCycle(s.devPatternOverride);
        s.setDevPatternOverride(next);
        console.info(
          `[dev] sashiko pattern override -> ${next ?? "(quest default)"}`,
        );
        e.preventDefault();
        return;
      }

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
