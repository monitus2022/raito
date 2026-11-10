import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  AttemptRecord,
  CardType,
  ConversationTurn,
  DailyStats,
  Flag,
  LessonProgress,
  MetaRecord,
  Profile,
  ReviewRecord,
  Settings
} from "./schema";

export const DB_NAME = "raito";
export const DB_VERSION = 1;
export const SCHEMA_VERSION = 1;

export interface RaitoDBSchema extends DBSchema {
  meta: { key: string; value: MetaRecord };
  profile: { key: string; value: Profile };
  settings: { key: string; value: Settings };
  review: {
    key: [string, CardType];
    value: ReviewRecord;
    indexes: { due_at: string; item_id: string };
  };
  attempts: {
    key: number;
    value: AttemptRecord;
    indexes: { item_id: string; created_at: string; mode: string };
  };
  lessons: {
    key: string;
    value: LessonProgress;
    indexes: { unit_id: string };
  };
  conversations: {
    key: number;
    value: ConversationTurn;
    indexes: { session_id: string };
  };
  daily: { key: string; value: DailyStats };
  flags: { key: number; value: Flag; indexes: { status: string } };
}

export type RaitoDB = IDBPDatabase<RaitoDBSchema>;

function createSchema(db: IDBPDatabase<RaitoDBSchema>) {
  db.createObjectStore("meta", { keyPath: "key" });
  db.createObjectStore("profile", { keyPath: "id" });
  db.createObjectStore("settings", { keyPath: "id" });

  const review = db.createObjectStore("review", {
    keyPath: ["item_id", "card_type"]
  });
  review.createIndex("due_at", "due_at");
  review.createIndex("item_id", "item_id");

  const attempts = db.createObjectStore("attempts", {
    keyPath: "id",
    autoIncrement: true
  });
  attempts.createIndex("item_id", "item_id");
  attempts.createIndex("created_at", "created_at");
  attempts.createIndex("mode", "mode");

  const lessons = db.createObjectStore("lessons", { keyPath: "lesson_id" });
  lessons.createIndex("unit_id", "unit_id");

  const conversations = db.createObjectStore("conversations", {
    keyPath: "id",
    autoIncrement: true
  });
  conversations.createIndex("session_id", "session_id");

  db.createObjectStore("daily", { keyPath: "day" });

  const flags = db.createObjectStore("flags", {
    keyPath: "id",
    autoIncrement: true
  });
  flags.createIndex("status", "status");
}

export async function ensureSeeded(db: RaitoDB): Promise<void> {
  const marker = await db.get("meta", "schemaVersion");
  if (marker) return;

  const now = new Date().toISOString();
  const tx = db.transaction(["meta", "profile", "settings"], "readwrite");

  await tx.objectStore("meta").put({ key: "schemaVersion", value: SCHEMA_VERSION });
  await tx.objectStore("meta").put({ key: "createdAt", value: now });
  await tx.objectStore("profile").put({
    id: "me",
    target_level: "N4",
    target_exam_date: null,
    timezone: "Asia/Hong_Kong",
    created_at: now
  });
  await tx.objectStore("settings").put({
    id: "me",
    furigana: "all",
    accent: "on",
    voice: "female",
    speed: 1,
    updated_at: now
  });

  await tx.done;
}

/**
 * Opens the local database and guarantees a seeded profile and settings.
 *
 * `factory` is injectable so tests can pass `fake-indexeddb` without touching
 * globals.
 */
export async function openRaitoDB(
  factory: IDBFactory | undefined = globalThis.indexedDB,
  name = DB_NAME
): Promise<RaitoDB> {
  if (!factory) {
    throw new Error("IndexedDB is not available in this environment.");
  }

  const db = await openDB<RaitoDBSchema>(name, DB_VERSION, {
    upgrade(upgradeDb, oldVersion) {
      if (oldVersion < 1) createSchema(upgradeDb);
    },
    blocked() {
      console.warn("Raito storage upgrade blocked by another open tab.");
    },
    blocking() {
      console.warn("Closing Raito storage so another tab can upgrade.");
    }
  });

  await ensureSeeded(db);
  return db;
}
