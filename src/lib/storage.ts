import type { AcceptedQuest, Quest, RejectedQuest } from "./types";

const KEYS = {
  accepted: "sq.acceptedQuests",
  rejected: "sq.rejectedQuests",
  localQuests: "sq.localQuests",
} as const;

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadAccepted(): AcceptedQuest[] {
  return readJson<AcceptedQuest[]>(KEYS.accepted, []);
}

export function saveAccepted(list: AcceptedQuest[]): void {
  writeJson(KEYS.accepted, list);
}

export function loadRejected(): RejectedQuest[] {
  return readJson<RejectedQuest[]>(KEYS.rejected, []);
}

export function saveRejected(list: RejectedQuest[]): void {
  writeJson(KEYS.rejected, list);
}

export function loadLocalQuests(): Quest[] {
  return readJson<Quest[]>(KEYS.localQuests, []);
}

export function saveLocalQuests(list: Quest[]): void {
  writeJson(KEYS.localQuests, list);
}

export function clearLocalQuests(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KEYS.localQuests);
}

export function clearRejected(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KEYS.rejected);
}
