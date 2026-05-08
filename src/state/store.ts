import { create } from "zustand";
import type {
  AcceptedQuest,
  Phase,
  Quest,
  RejectedQuest,
  SpinDirection,
} from "../lib/types";
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

type SpinState = { direction: SpinDirection; speed: number };

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
};

type AppActions = {
  init(): Promise<void>;
  wake(): void;
  startSpin(direction: SpinDirection, speed: number): void;
  updateSpin(direction: SpinDirection, speed: number): void;
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
};

export type AppStore = AppState & AppActions;

const INITIAL_STATE: AppState = {
  phase: "idle",
  pool: [],
  poolLoaded: false,
  spin: { direction: "cw", speed: 0 },
  currentQuest: null,
  accepted: [],
  rejected: [],
  acceptanceMessage: null,
  throwHit: null,
  forcedNextQuestId: null,
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

    startSpin(direction, speed) {
      if (!setPhase("spin")) return;
      set({ spin: { direction, speed } });
    },

    updateSpin(direction, speed) {
      if (get().phase !== "spin") return;
      set({ spin: { direction, speed } });
    },

    stopAndSelect() {
      if (!setPhase("select")) return;
      const state = get();
      const excluded = rejectedIdSet(state.rejected);
      let chosen: Quest | null = null;
      if (state.forcedNextQuestId) {
        chosen = state.pool.find((q) => q.id === state.forcedNextQuestId) ?? null;
      }
      if (!chosen) {
        chosen = pickRandom(state.pool, excluded);
      }
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
      set({
        currentQuest: null,
        spin: { direction: "cw", speed: 0 },
        acceptanceMessage: null,
        throwHit: null,
      });
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
  };
});
