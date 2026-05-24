import type { Quest } from "./types";
import { loadLocalQuests } from "./storage";
import { getActiveQuestPool, type QuestPool } from "./quest-pools";

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
 * Resolves the active quest pool: tries the pool's privateUrl first
 * (deployed override, gitignored), falls back to its canonical url
 * (committed sample), falls back to []. localStorage additions from
 * the admin panel are merged on top regardless of pool — they're a
 * dev convenience, not part of any pool's identity.
 *
 * Pool selection is read from the `?quests=<id>` URL param at module
 * load (see quest-pools.ts).
 */
export async function loadQuestPool(pool: QuestPool = getActiveQuestPool()): Promise<Quest[]> {
  const privateContent = pool.privateUrl
    ? await fetchJson<Quest[]>(pool.privateUrl)
    : null;
  const sample = privateContent ?? (await fetchJson<Quest[]>(pool.url)) ?? [];
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
