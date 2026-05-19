import { create } from "zustand";
import type {
  AcceptedQuest,
  Phase,
  Quest,
  RejectedQuest,
  SpinDirection,
} from "../lib/types";
import type { SashikoPattern } from "../scene/sashiko-patterns";
import {
  loadAccepted,
  loadRejected,
  saveAccepted,
  saveRejected,
} from "../lib/storage";
import { loadQuestPool, pickRandom, rejectedIdSet } from "../lib/quests";
import {
  loadAcceptanceMessages,
  pickAcceptanceMessage,
} from "../lib/messages";
import { canTransition } from "./transitions";

type SpinState = {
  direction: SpinDirection;
  speed: number;
  /** Signed angular velocity from the latest hand observation (rad/sec). */
  handAV: number;
  /** Thumb-index openness 0..1; drives card friction. */
  openness: number;
};

type AppState = {
  phase: Phase;
  pool: Quest[];
  poolLoaded: boolean;
  spin: SpinState;
  currentQuest: Quest | null;
  accepted: AcceptedQuest[];
  rejected: RejectedQuest[];
  acceptanceMessage: string | null;
  throwHit: boolean | null;
  forcedNextQuestId: string | null;
  /**
   * Index into PACK_DESIGNS controlling which pack visual is shown.
   * Advances after each completed pack-open (accept or reject) so
   * consecutive opens cycle through the registered designs in order.
   */
  packIndex: number;
  /**
   * Dev-only sashiko pattern override. When non-null, every quest
   * renders with this pattern regardless of its own `pattern` field.
   * Set via the Cmd+Shift+P keyboard cycle in dev builds; remains
   * null in production.
   */
  devPatternOverride: SashikoPattern | null;
};

type AppActions = {
  init(): Promise<void>;
  wake(): void;
  startSpin(handAV: number, openness: number): void;
  updateSpin(handAV: number, openness: number): void;
  stopAndSelect(): void;
  cut(): void;
  acceptCurrent(): Promise<void>;
  rejectCurrent(): void;
  fireThrow(): void;
  finishReset(): void;
  toggleCollection(): void;
  markCompleted(questId: string, completed: boolean): void;
  forceNextQuest(questId: string | null): void;
  addLocalQuest(quest: Quest): void;
  setDevPatternOverride(pattern: SashikoPattern | null): void;
};

export type AppStore = AppState & AppActions;

const INITIAL_STATE: AppState = {
  phase: "idle",
  pool: [],
  poolLoaded: false,
  spin: { direction: "cw", speed: 0, handAV: 0, openness: 0.5 },
  currentQuest: null,
  accepted: [],
  rejected: [],
  acceptanceMessage: null,
  throwHit: null,
  forcedNextQuestId: null,
  packIndex: 0,
  devPatternOverride: null,
};

export const useAppStore = create<AppStore>((set, get) => {
  /**
   * Wraps a phase change with the transition guard. If illegal, logs and
   * returns false so the caller can decide what to do.
   */
  const setPhase = (next: Phase): boolean => {
    const current = get().phase;
    if (current === next) return true;
    if (!canTransition(current, next)) {
      console.warn(`[state] illegal transition ${current} -> ${next}`);
      return false;
    }
    set({ phase: next });
    return true;
  };

  return {
    ...INITIAL_STATE,

    async init() {
      const [pool, accepted, rejected] = await Promise.all([
        loadQuestPool(),
        Promise.resolve(loadAccepted()),
        Promise.resolve(loadRejected()),
      ]);
      await loadAcceptanceMessages();
      set({ pool, accepted, rejected, poolLoaded: true });
    },

    wake() {
      setPhase("wake");
    },

    startSpin(handAV, openness) {
      if (!setPhase("spin")) return;
      set({
        spin: {
          direction: handAV < 0 ? "ccw" : "cw",
          speed: openness,
          handAV,
          openness,
        },
      });
    },

    updateSpin(handAV, openness) {
      if (get().phase !== "spin" && get().phase !== "wake") return;
      set({
        spin: {
          direction: handAV < 0 ? "ccw" : "cw",
          speed: openness,
          handAV,
          openness,
        },
      });
    },

    stopAndSelect() {
      const state = get();
      // Pool not loaded yet or genuinely empty: don't advance; the
      // user would otherwise land in openPack with no quest to show.
      if (state.pool.length === 0) {
        console.warn("[state] stopAndSelect: pool is empty, ignoring");
        return;
      }
      let chosen: Quest | null = null;
      if (state.forcedNextQuestId) {
        chosen = state.pool.find((q) => q.id === state.forcedNextQuestId) ?? null;
      }
      if (!chosen) {
        chosen = pickRandom(state.pool, rejectedIdSet(state.rejected));
      }
      // Pool exhausted by rejections: auto-clear rejected list so the
      // user can keep playing instead of getting stuck at openPack.
      if (!chosen && state.rejected.length > 0) {
        saveRejected([]);
        set({ rejected: [] });
        chosen = pickRandom(state.pool, new Set());
      }
      if (!chosen) {
        console.warn("[state] stopAndSelect: no eligible quest, ignoring");
        return;
      }
      if (!setPhase("select")) return;
      set({ currentQuest: chosen, forcedNextQuestId: null });
    },

    cut() {
      setPhase("openPack");
    },

    async acceptCurrent() {
      const state = get();
      if (!state.currentQuest) return;
      if (!setPhase("accept")) return;
      const accepted: AcceptedQuest = {
        questId: state.currentQuest.id,
        acceptedAt: new Date().toISOString(),
        completedAt: null,
      };
      const messages = await loadAcceptanceMessages();
      const next = [...state.accepted, accepted];
      set({
        accepted: next,
        acceptanceMessage: pickAcceptanceMessage(messages),
      });
      saveAccepted(next);
    },

    rejectCurrent() {
      const state = get();
      if (!state.currentQuest) return;
      if (!setPhase("reject")) return;
      const rejected: RejectedQuest = {
        questId: state.currentQuest.id,
        rejectedAt: new Date().toISOString(),
      };
      const next = [...state.rejected, rejected];
      set({ rejected: next });
      saveRejected(next);
    },

    fireThrow() {
      if (!setPhase("throw")) return;
      const hit = Math.random() < 0.8;
      set({ throwHit: hit });
    },

    finishReset() {
      setPhase("idle");
      set((state) => ({
        currentQuest: null,
        spin: { direction: "cw", speed: 0, handAV: 0, openness: 0.5 },
        acceptanceMessage: null,
        throwHit: null,
        packIndex: state.packIndex + 1,
      }));
    },

    toggleCollection() {
      const current = get().phase;
      if (current === "collection") {
        setPhase("idle");
      } else if (current === "idle") {
        setPhase("collection");
      }
    },

    markCompleted(questId, completed) {
      const state = get();
      const next = state.accepted.map((a) =>
        a.questId === questId
          ? { ...a, completedAt: completed ? new Date().toISOString() : null }
          : a,
      );
      set({ accepted: next });
      saveAccepted(next);
    },

    forceNextQuest(questId) {
      set({ forcedNextQuestId: questId });
    },

    addLocalQuest(quest) {
      const state = get();
      if (state.pool.find((q) => q.id === quest.id)) return;
      set({ pool: [...state.pool, quest] });
    },

    setDevPatternOverride(pattern) {
      set({ devPatternOverride: pattern });
    },
  };
});
