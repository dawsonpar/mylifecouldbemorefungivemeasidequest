import type { Quest } from "./types";
import { loadLocalQuests, loadRejected } from "./storage";

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Resolution order: quests.json (private, baked into deployed build) ->
 * quests.example.json (public sample pool) -> []. Local additions from
 * localStorage are merged on top.
 */
export async function loadQuestPool(): Promise<Quest[]> {
  const real = await fetchJson<Quest[]>("/quests.json");
  const sample = real ?? (await fetchJson<Quest[]>("/quests.example.json")) ?? [];
  const local = loadLocalQuests();
  const seen = new Set<string>();
  const merged: Quest[] = [];
  for (const q of [...sample, ...local]) {
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    merged.push(q);
  }
  return merged;
}

export function pickRandom(pool: Quest[], excludeIds: Set<string>): Quest | null {
  const eligible = pool.filter((q) => !excludeIds.has(q.id));
  if (eligible.length === 0) return null;
  const idx = Math.floor(Math.random() * eligible.length);
  return eligible[idx];
}

export function rejectedIdSet(rejected: ReadonlyArray<{ questId: string }>): Set<string> {
  return new Set(rejected.map((r) => r.questId));
}
