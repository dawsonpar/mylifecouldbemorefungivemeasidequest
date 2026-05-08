import { useAppStore } from "../state/store";

export function AcceptOverlay() {
  const phase = useAppStore((s) => s.phase);
  const message = useAppStore((s) => s.acceptanceMessage);

  if (phase !== "accept" || !message) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-32">
      <div className="rounded-full bg-[#22c55e] px-6 py-3 font-mono text-sm uppercase tracking-[0.25em] text-black shadow-[0_0_60px_rgba(34,197,94,0.5)] animate-[acceptPop_0.5s_ease-out]">
        {message}
      </div>
    </div>
  );
}
