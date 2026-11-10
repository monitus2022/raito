import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { openRaitoDB } from "./db";
import { ExportSchemaError } from "./export";
import { stateStoreFrom } from "./index";
import type { ReviewRecord } from "./schema";

let uniqueDb = 0;

async function makeStore() {
  uniqueDb += 1;
  const db = await openRaitoDB(globalThis.indexedDB, `raito-test-${uniqueDb}`);
  return { db, store: stateStoreFrom(db) };
}

const NOW = "2026-11-10T12:00:00.000Z";
const PAST = "2026-11-09T12:00:00.000Z";
const FUTURE = "2026-11-20T12:00:00.000Z";

function review(overrides: Partial<ReviewRecord> = {}): ReviewRecord {
  return {
    item_id: "n5-u01-l01-w01",
    card_type: "reading",
    state: "review",
    stability: 1,
    difficulty: 5,
    elapsed_days: 1,
    scheduled_days: 2,
    learning_steps: 0,
    due_at: PAST,
    reps: 1,
    lapses: 0,
    last_review: PAST,
    updated_at: PAST,
    ...overrides
  };
}

describe("state store", () => {
  it("seeds exactly one profile and one settings record", async () => {
    const { store } = await makeStore();

    const profile = await store.getProfile();
    const settings = await store.getSettings();

    expect(profile.id).toBe("me");
    expect(profile.timezone).toBe("Asia/Hong_Kong");
    expect(settings.speed).toBe(1);
  });

  it("returns only due cards, in due order, honouring the limit", async () => {
    const { store } = await makeStore();

    await store.putReview(review({ item_id: "a", due_at: PAST }));
    await store.putReview(review({ item_id: "b", due_at: FUTURE }));
    await store.putReview(review({ item_id: "c", due_at: PAST }));

    const due = await store.dueCards(NOW, 1);

    expect(due).toHaveLength(1);
    expect(due[0]?.due_at).toBe(PAST);
    expect(await store.countDue(NOW)).toBe(2);
  });

  it("appends attempts and reads them back by item", async () => {
    const { store } = await makeStore();

    const first = await store.appendAttempt({
      item_id: "a",
      card_type: "reading",
      correct: true,
      latency_ms: 900,
      mode: "review",
      lesson_id: null,
      session_id: null,
      created_at: PAST
    });
    await store.appendAttempt({
      item_id: "b",
      card_type: null,
      correct: false,
      latency_ms: null,
      mode: "quiz",
      lesson_id: "n5-u01-l01",
      session_id: null,
      created_at: NOW
    });

    const forA = await store.attemptsFor("a");

    expect(typeof first).toBe("number");
    expect(forA).toHaveLength(1);
    expect(forA[0]?.correct).toBe(true);
    expect(await store.summary()).toMatchObject({ review: 0, attempts: 2 });
  });

  it("round-trips an export through a replace import", async () => {
    const source = (await makeStore()).store;
    await source.putReview(review({ item_id: "keep-me" }));
    await source.appendAttempt({
      item_id: "keep-me",
      card_type: "reading",
      correct: true,
      latency_ms: 500,
      mode: "review",
      lesson_id: null,
      session_id: null,
      created_at: PAST
    });

    const snapshot = await source.exportSnapshot();

    const target = (await makeStore()).store;
    await target.importSnapshot(snapshot, "replace");

    expect(await target.countDue(NOW)).toBe(1);
    expect(await target.summary()).toMatchObject({ review: 1, attempts: 1 });
  });

  it("merge does not duplicate attempts and keeps the newer review", async () => {
    const source = (await makeStore()).store;
    await source.putReview(review({ item_id: "x", updated_at: NOW, due_at: FUTURE }));
    await source.appendAttempt({
      item_id: "x",
      card_type: "reading",
      correct: true,
      latency_ms: 500,
      mode: "review",
      lesson_id: null,
      session_id: null,
      created_at: PAST
    });
    const snapshot = await source.exportSnapshot();

    const target = (await makeStore()).store;
    await target.importSnapshot(snapshot, "merge");
    await target.importSnapshot(snapshot, "merge");

    expect(await target.summary()).toMatchObject({ review: 1, attempts: 1 });
    const due = await target.dueCards(NOW, 10);
    expect(due).toHaveLength(0);
  });

  it("rejects an export from an unknown schema version", async () => {
    const { store } = await makeStore();
    const snapshot = await store.exportSnapshot();

    await expect(
      store.importSnapshot({ ...snapshot, schemaVersion: 99 })
    ).rejects.toBeInstanceOf(ExportSchemaError);
  });

  it("rejects something that is not an export at all", async () => {
    const { store } = await makeStore();
    await expect(store.importSnapshot({ hello: "world" })).rejects.toBeInstanceOf(
      ExportSchemaError
    );
  });
});
