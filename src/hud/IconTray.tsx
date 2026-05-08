import { useEffect, useState } from "react";
import { useAppStore } from "../state/store";

type Props = {
  onOpenAdmin: () => void;
  forceVisible: boolean;
};

const HIDE_AFTER_MS = 3000;

/**
 * Two-icon corner tray: Hall of Frame, Admin / Override. Hides
 * after 3s of mouse inactivity, reappears on any pointer move.
 * `forceVisible` (set when ?admin=1) keeps it visible always.
 */
export function IconTray({ onOpenAdmin, forceVisible }: Props) {
  const toggleCollection = useAppStore((s) => s.toggleCollection);
  const phase = useAppStore((s) => s.phase);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (forceVisible) {
      setVisible(true);
      return;
    }
    let id = 0;
    const reset = () => {
      setVisible(true);
      window.clearTimeout(id);
      id = window.setTimeout(() => setVisible(false), HIDE_AFTER_MS);
    };
    reset();
    window.addEventListener("pointermove", reset);
    window.addEventListener("pointerdown", reset);
    return () => {
      window.removeEventListener("pointermove", reset);
      window.removeEventListener("pointerdown", reset);
      window.clearTimeout(id);
    };
  }, [forceVisible]);

  // Outside 9:16 phone-crop safe area (assumed center band):
  // anchor to bottom-right of the laptop screen.
  return (
    <div
      className={[
        "absolute bottom-5 right-5 flex items-center gap-2 transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      <IconButton
        onClick={toggleCollection}
        label={phase === "collection" ? "back" : "hall of frame"}
        glyph={
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <rect x="4" y="4" width="16" height="16" rx="1" stroke="currentColor" strokeWidth="1.6" />
            <rect x="8" y="8" width="8" height="8" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        }
      />
      <IconButton
        onClick={onOpenAdmin}
        label="admin"
        glyph={
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M12 4v2m0 12v2m8-8h-2M6 12H4m12.95-6.95l-1.41 1.41M7.46 16.54l-1.41 1.41m12.9 0l-1.41-1.41M7.46 7.46L6.05 6.05"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        }
      />
    </div>
  );
}

function IconButton({
  onClick,
  label,
  glyph,
}: {
  onClick: () => void;
  label: string;
  glyph: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-black/40 text-neutral-300 backdrop-blur transition hover:border-white/30 hover:bg-black/60 hover:text-white"
    >
      {glyph}
    </button>
  );
}
