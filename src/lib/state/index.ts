import { openRaitoDB, type RaitoDB } from "./db";
import { createStateStore, type StateStore } from "./store";

export type { StateStore, StateSummary, StorageInfo, ImportMode } from "./store";
export type {
  AttemptRecord,
  CardType,
  ConversationTurn,
  DailyStats,
  Flag,
  LessonProgress,
  Profile,
  ReviewRecord,
  Settings
} from "./schema";

let storePromise: Promise<StateStore> | null = null;

/**
 * The single entry point for learner state.
 *
 * Components must call this instead of `fetch` or `indexedDB` directly. That is
 * what keeps a future server-backed or synced implementation a contained change
 * (workplan §10.7).
 */
export function getStateStore(): Promise<StateStore> {
  if (!storePromise) {
    storePromise = openRaitoDB().then(createStateStore);
  }
  return storePromise;
}

/** Test and tooling seam: build a store from an already-open database. */
export function stateStoreFrom(db: RaitoDB): StateStore {
  return createStateStore(db);
}

export function resetStateStoreForTests(): void {
  storePromise = null;
}
