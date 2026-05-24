/**
 * Registry of quest pools. Each pool is one content set authored for
 * a production cycle (NYC pilot, London series, etc). Pools are
 * decoupled from PackSets — any pool can be paired with any pack set
 * via independent URL params: `?packs=london&quests=london` or
 * `?packs=nyc-pilot&quests=london`, etc.
 *
 * A pool defines TWO URLs:
 *   - `url`:        canonical/public sample, committed to the repo
 *   - `privateUrl`: gitignored private overrides, fetched first and
 *                   replacing `url` when present. Lets the production
 *                   pool ship without the sample copy ever overriding
 *                   it, while keeping the sample available for OSS
 *                   contributors and local dev.
 *
 * Adding a new pool: append an entry below, drop the JSON(s) into
 * `public/` at the matching path, done.
 */
export type QuestPool = {
  id: string;
  label: string;
  /** Canonical (sample) pool URL. Always committed. */
  url: string;
  /** Optional private override URL. Gitignored if present. */
  privateUrl?: string;
};

const PILOT: QuestPool = {
  id: "pilot",
  label: "Pilot (mixed sample)",
  url: "/quests.example.json",
  privateUrl: "/quests.json",
};

const LONDON: QuestPool = {
  id: "london",
  label: "London",
  url: "/quests/london.example.json",
  privateUrl: "/quests/london.json",
};

export const QUEST_POOLS: Record<string, QuestPool> = {
  [PILOT.id]: PILOT,
  [LONDON.id]: LONDON,
};

/**
 * Default pool when no `?quests=<id>` override is supplied. Stays on
 * "pilot" until the London pool JSON is authored.
 */
export const DEFAULT_QUEST_POOL_ID = "pilot";

export function getActiveQuestPoolId(): string {
  if (typeof window === "undefined") return DEFAULT_QUEST_POOL_ID;
  const requested = new URLSearchParams(window.location.search).get("quests");
  if (requested && requested in QUEST_POOLS) {
    return requested;
  }
  return DEFAULT_QUEST_POOL_ID;
}

export function getActiveQuestPool(): QuestPool {
  return QUEST_POOLS[getActiveQuestPoolId()];
}
