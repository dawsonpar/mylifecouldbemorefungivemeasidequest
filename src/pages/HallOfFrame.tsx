import { useMemo } from "react";
import { useAppStore } from "../state/store";
import type { AcceptedQuest, Quest } from "../lib/types";

type FramedItem = {
  accepted: AcceptedQuest;
  quest: Quest | null;
};

export function HallOfFrame() {
  const phase = useAppStore((s) => s.phase);
  const accepted = useAppStore((s) => s.accepted);
  const pool = useAppStore((s) => s.pool);
  const toggleCollection = useAppStore((s) => s.toggleCollection);
  const markCompleted = useAppStore((s) => s.markCompleted);

  const items = useMemo<FramedItem[]>(() => {
    return accepted.map((a) => ({
      accepted: a,
      quest: pool.find((q) => q.id === a.questId) ?? null,
    }));
  }, [accepted, pool]);

  if (phase !== "collection") return null;

  return (
    <div className="absolute inset-0 z-10 overflow-y-auto bg-[#0a0a0a]/95 backdrop-blur-sm">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-[#0a0a0a]/95 px-8 py-5 backdrop-blur">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
            collection
          </div>
          <h1 className="mt-1 font-serif text-2xl tracking-tight text-neutral-100">
            Hall of Frame
          </h1>
        </div>
        <button
          type="button"
          onClick={toggleCollection}
          className="rounded border border-white/10 bg-white/5 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-neutral-300 transition hover:border-white/30 hover:bg-white/10"
        >
          back
        </button>
      </header>

      <main className="px-8 py-12">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(({ accepted, quest }) => (
              <FramedQuest
                key={accepted.questId + accepted.acceptedAt}
                accepted={accepted}
                quest={quest}
                onToggleComplete={() =>
                  markCompleted(accepted.questId, accepted.completedAt === null)
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <div className="mx-auto mb-6 h-32 w-24 rounded-sm border-2 border-dashed border-white/15" />
      <h2 className="font-serif text-xl text-neutral-300">no frames yet</h2>
      <p className="mt-2 font-mono text-xs uppercase tracking-widest text-neutral-500">
        accept a quest to fill the gallery
      </p>
    </div>
  );
}

function FramedQuest({
  accepted,
  quest,
  onToggleComplete,
}: {
  accepted: AcceptedQuest;
  quest: Quest | null;
  onToggleComplete: () => void;
}) {
  const completed = accepted.completedAt !== null;
  const acceptedDate = new Date(accepted.acceptedAt).toLocaleDateString();

  return (
    <button
      type="button"
      onClick={onToggleComplete}
      className="group flex flex-col items-center gap-3 text-left transition"
    >
      <div
        className={[
          "relative flex h-72 w-56 flex-col gap-2 border-[10px] p-5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)] transition",
          completed
            ? "border-[#3a2c12] bg-[#1c1408]"
            : "border-[#1f1f1f] bg-[#141414] group-hover:border-[#2a2a2a]",
        ].join(" ")}
      >
        {completed && (
          <div className="absolute -right-3 -top-3 rotate-12 rounded bg-[#22c55e] px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-black shadow-lg">
            completed
          </div>
        )}
        <div className="font-serif text-base leading-tight text-neutral-100">
          {quest?.title ?? "(quest removed from pool)"}
        </div>
        {quest?.description && (
          <div className="line-clamp-5 text-xs leading-snug text-neutral-400">
            {quest.description}
          </div>
        )}
        <div className="mt-auto font-mono text-[9px] uppercase tracking-[0.25em] text-neutral-600">
          accepted {acceptedDate}
        </div>
      </div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 transition group-hover:text-neutral-300">
        {completed ? "click to unmark" : "click to mark complete"}
      </div>
    </button>
  );
}
