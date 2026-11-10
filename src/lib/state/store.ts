import { SCHEMA_VERSION, type RaitoDB } from "./db";
import {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  parseSnapshot,
  type ExportSnapshot
} from "./export";
import type {
  AttemptRecord,
  ConversationTurn,
  LessonProgress,
  Profile,
  ReviewRecord,
  Settings
} from "./schema";

export type StateSummary = {
  review: number;
  attempts: number;
  lessons: number;
};

export type StorageInfo = {
  persisted: boolean;
  usage: number | null;
  quota: number | null;
};

export type ImportMode = "replace" | "merge";

const STORES = [
  "profile",
  "settings",
  "review",
  "attempts",
  "lessons",
  "conversations",
  "daily",
  "flags"
] as const;

export interface StateStore {
  getProfile(): Promise<Profile>;
  getSettings(): Promise<Settings>;
  putSettings(next: Settings): Promise<void>;

  dueCards(now: string, limit: number): Promise<ReviewRecord[]>;
  countDue(now: string): Promise<number>;
  putReview(record: ReviewRecord): Promise<void>;

  appendAttempt(attempt: AttemptRecord): Promise<number>;
  attemptsFor(itemId: string): Promise<AttemptRecord[]>;

  putLesson(record: LessonProgress): Promise<void>;
  appendTurn(turn: ConversationTurn): Promise<number>;

  summary(): Promise<StateSummary>;
  exportSnapshot(): Promise<ExportSnapshot>;
  importSnapshot(input: unknown, mode?: ImportMode): Promise<void>;

  storageInfo(): Promise<StorageInfo>;
  requestPersistence(): Promise<boolean>;
}

function upperBound(now: string): IDBKeyRange {
  const keyRange = globalThis.IDBKeyRange;
  if (!keyRange) {
    throw new Error("IDBKeyRange is not available in this environment.");
  }
  return keyRange.upperBound(now);
}

/** Dedupe key for merge imports, where local autoincrement ids mean nothing. */
function attemptIdentity(attempt: AttemptRecord): string {
  return [
    attempt.item_id ?? "",
    attempt.card_type ?? "",
    attempt.mode,
    attempt.created_at
  ].join("|");
}

function newestFirst<T extends { updated_at?: string }>(a: T, b: T): T {
  return (a.updated_at ?? "") >= (b.updated_at ?? "") ? a : b;
}

export function createStateStore(db: RaitoDB): StateStore {
  return {
    async getProfile() {
      const profile = await db.get("profile", "me");
      if (!profile) throw new Error("Profile is missing from local storage.");
      return profile;
    },

    async getSettings() {
      const settings = await db.get("settings", "me");
      if (!settings) throw new Error("Settings are missing from local storage.");
      return settings;
    },

    async putSettings(next) {
      await db.put("settings", next);
    },

    async dueCards(now, limit) {
      const rows = await db.getAllFromIndex("review", "due_at", upperBound(now));
      return rows.slice(0, Math.max(0, limit));
    },

    async countDue(now) {
      return db.countFromIndex("review", "due_at", upperBound(now));
    },

    async putReview(record) {
      await db.put("review", record);
    },

    async appendAttempt(attempt) {
      return db.add("attempts", attempt);
    },

    async attemptsFor(itemId) {
      return db.getAllFromIndex("attempts", "item_id", itemId);
    },

    async putLesson(record) {
      await db.put("lessons", record);
    },

    async appendTurn(turn) {
      return db.add("conversations", turn);
    },

    async summary() {
      const [review, attempts, lessons] = await Promise.all([
        db.count("review"),
        db.count("attempts"),
        db.count("lessons")
      ]);
      return { review, attempts, lessons };
    },

    async exportSnapshot() {
      const tx = db.transaction(STORES, "readonly");
      const [profile, settings, review, attempts, lessons, conversations, daily, flags] =
        await Promise.all([
          tx.objectStore("profile").getAll(),
          tx.objectStore("settings").getAll(),
          tx.objectStore("review").getAll(),
          tx.objectStore("attempts").getAll(),
          tx.objectStore("lessons").getAll(),
          tx.objectStore("conversations").getAll(),
          tx.objectStore("daily").getAll(),
          tx.objectStore("flags").getAll()
        ]);
      await tx.done;

      const snapshot: ExportSnapshot = {
        format: EXPORT_FORMAT,
        schemaVersion: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        stores: { profile, settings, review, attempts, lessons, conversations, daily, flags }
      };

      // Round-trip through the schema so an export is never written broken.
      return parseSnapshot(snapshot);
    },

    async importSnapshot(input, mode = "replace") {
      const snapshot = parseSnapshot(input);
      const tx = db.transaction([...STORES, "meta"], "readwrite");

      if (mode === "replace") {
        await Promise.all(STORES.map((name) => tx.objectStore(name).clear()));

        for (const record of snapshot.stores.profile) await tx.objectStore("profile").put(record);
        for (const record of snapshot.stores.settings) await tx.objectStore("settings").put(record);
        for (const record of snapshot.stores.review) await tx.objectStore("review").put(record);
        for (const record of snapshot.stores.attempts) {
          const { id: _id, ...rest } = record as AttemptRecord & { id?: number };
          await tx.objectStore("attempts").add(rest);
        }
        for (const record of snapshot.stores.lessons) await tx.objectStore("lessons").put(record);
        for (const record of snapshot.stores.conversations) {
          const { id: _id, ...rest } = record as ConversationTurn & { id?: number };
          await tx.objectStore("conversations").add(rest);
        }
        for (const record of snapshot.stores.daily) await tx.objectStore("daily").put(record);
        for (const record of snapshot.stores.flags) {
          const { id: _id, ...rest } = record as { id?: number };
          await tx.objectStore("flags").add(rest as never);
        }

        await tx.objectStore("meta").put({
          key: "schemaVersion",
          value: SCHEMA_VERSION
        });
        await tx.objectStore("meta").put({
          key: "lastExportAt",
          value: snapshot.exportedAt
        });
        await tx.done;
        return;
      }

      // Merge: newest wins for scheduling state, lessons, and daily history.
      // Attempts are deduped on their natural identity. Conversations and flags
      // are replace-only, because they have no stable identity across devices.
      for (const incoming of snapshot.stores.review) {
        const current = await tx.objectStore("review").get([
          incoming.item_id,
          incoming.card_type
        ]);
        await tx
          .objectStore("review")
          .put(current ? newestFirst(current, incoming) : incoming);
      }

      for (const incoming of snapshot.stores.lessons) {
        const current = await tx.objectStore("lessons").get(incoming.lesson_id);
        if (!current) {
          await tx.objectStore("lessons").put(incoming);
          continue;
        }
        const currentAt = current.completed_at ?? current.started_at ?? "";
        const incomingAt = incoming.completed_at ?? incoming.started_at ?? "";
        await tx
          .objectStore("lessons")
          .put(incomingAt >= currentAt ? incoming : current);
      }

      for (const incoming of snapshot.stores.daily) {
        const current = await tx.objectStore("daily").get(incoming.day);
        if (current) {
          await tx.objectStore("daily").put({
            ...incoming,
            reviewed_count: current.reviewed_count + incoming.reviewed_count
          });
        } else {
          await tx.objectStore("daily").put(incoming);
        }
      }

      const existingAttempts = await tx.objectStore("attempts").getAll();
      const seen = new Set(existingAttempts.map(attemptIdentity));
      for (const incoming of snapshot.stores.attempts) {
        if (seen.has(attemptIdentity(incoming))) continue;
        seen.add(attemptIdentity(incoming));
        const { id: _id, ...rest } = incoming as AttemptRecord & { id?: number };
        await tx.objectStore("attempts").add(rest);
      }

      await tx.objectStore("meta").put({
        key: "lastExportAt",
        value: snapshot.exportedAt
      });
      await tx.done;
    },

    async storageInfo() {
      const storage = globalThis.navigator?.storage;
      if (!storage) return { persisted: false, usage: null, quota: null };

      const persisted = (await storage.persisted?.()) ?? false;

      if (!storage.estimate) return { persisted, usage: null, quota: null };

      const estimate = await storage.estimate();
      return {
        persisted,
        usage: estimate.usage ?? null,
        quota: estimate.quota ?? null
      };
    },

    async requestPersistence() {
      const storage = globalThis.navigator?.storage;
      if (!storage?.persist) return false;
      return storage.persist();
    }
  };
}
