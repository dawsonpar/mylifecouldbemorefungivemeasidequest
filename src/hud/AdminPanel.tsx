import { useState } from "react";
import { useAppStore } from "../state/store";
import {
  clearLocalQuests,
  clearRejected,
  loadLocalQuests,
  saveLocalQuests,
} from "../lib/storage";
import type { Quest } from "../lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AdminPanel({ open, onClose }: Props) {
  const pool = useAppStore((s) => s.pool);
  const addLocalQuest = useAppStore((s) => s.addLocalQuest);
  const forceNextQuest = useAppStore((s) => s.forceNextQuest);
  const forcedNextQuestId = useAppStore((s) => s.forcedNextQuestId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");

  if (!open) return null;

  const handleAdd = () => {
    const trimmed = title.trim();
    if (!trimmed || !description.trim()) return;
    const id =
      trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) +
      "-" +
      Math.random().toString(36).slice(2, 6);
    const quest: Quest = {
      id,
      title: trimmed,
      description: description.trim(),
      ...(requirements.trim() ? { requirements: requirements.trim() } : {}),
    };
    const next = [...loadLocalQuests(), quest];
    saveLocalQuests(next);
    addLocalQuest(quest);
    setTitle("");
    setDescription("");
    setRequirements("");
  };

  const handleExport = () => {
    const local = loadLocalQuests();
    const blob = new Blob([JSON.stringify(local, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-quests.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLocal = () => {
    if (!confirm("Clear all locally-added quests? This cannot be undone.")) return;
    clearLocalQuests();
    location.reload();
  };

  const handleResetSession = () => {
    if (!confirm("Reset the session? Rejected quests will be eligible again.")) return;
    clearRejected();
    location.reload();
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative max-h-[85vh] w-[640px] max-w-[92vw] overflow-y-auto rounded-lg border border-white/10 bg-[#0e0e0e] p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
              admin
            </div>
            <h2 className="mt-1 font-serif text-xl text-neutral-100">manage quests</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white/10 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-neutral-300 hover:bg-white/10"
          >
            close
          </button>
        </div>

        <Section label="add quest">
          <input
            type="text"
            placeholder="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border border-white/10 bg-black/50 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-white/30"
          />
          <textarea
            placeholder="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded border border-white/10 bg-black/50 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-white/30"
          />
          <textarea
            placeholder="requirements (optional)"
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            rows={2}
            className="mt-2 w-full rounded border border-white/10 bg-black/50 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-white/30"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!title.trim() || !description.trim()}
            className="mt-3 rounded bg-white px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-black disabled:cursor-not-allowed disabled:opacity-30"
          >
            add to pool
          </button>
        </Section>

        <Section label="force next quest">
          <p className="mb-2 text-[11px] text-neutral-500">
            override which quest fires on the next select. clears after firing.
          </p>
          <select
            value={forcedNextQuestId ?? ""}
            onChange={(e) => forceNextQuest(e.target.value || null)}
            className="w-full rounded border border-white/10 bg-black/50 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-white/30"
          >
            <option value="">(random)</option>
            {pool.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title}
              </option>
            ))}
          </select>
        </Section>

        <Section label="utilities">
          <div className="flex flex-wrap gap-2">
            <UtilityButton onClick={handleExport}>export local quests</UtilityButton>
            <UtilityButton onClick={handleClearLocal} danger>
              clear local quests
            </UtilityButton>
            <UtilityButton onClick={handleResetSession}>reset session</UtilityButton>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 border-t border-white/5 pt-4 first:border-0 first:pt-0">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
        {label}
      </div>
      {children}
    </div>
  );
}

function UtilityButton({
  onClick,
  danger,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded border px-3 py-2 font-mono text-[11px] uppercase tracking-widest transition",
        danger
          ? "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
          : "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
