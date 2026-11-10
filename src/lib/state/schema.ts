import { z } from "zod";

export const CARD_TYPES = [
  "reading",
  "meaning",
  "audio",
  "cloze",
  "production",
  "promotion"
] as const;

export const CardTypeSchema = z.enum(CARD_TYPES);
export type CardType = z.infer<typeof CardTypeSchema>;

export const ReviewStateSchema = z.enum([
  "new",
  "learning",
  "review",
  "relearning"
]);
export type ReviewPhase = z.infer<typeof ReviewStateSchema>;

const isoDate = z.string().datetime({ offset: true });

export const ProfileSchema = z.object({
  id: z.literal("me"),
  target_level: z.enum(["N5", "N4"]).default("N4"),
  target_exam_date: isoDate.nullable().default(null),
  timezone: z.string().default("Asia/Hong_Kong"),
  created_at: isoDate
});
export type Profile = z.infer<typeof ProfileSchema>;

export const SettingsSchema = z.object({
  id: z.literal("me"),
  furigana: z.enum(["all", "kanji", "off"]).default("all"),
  accent: z.enum(["on", "off"]).default("on"),
  voice: z.string().default("female"),
  speed: z.number().min(0.5).max(2).default(1),
  updated_at: isoDate
});
export type Settings = z.infer<typeof SettingsSchema>;

export const ReviewRecordSchema = z.object({
  item_id: z.string().min(1),
  card_type: CardTypeSchema,
  state: ReviewStateSchema.default("new"),
  stability: z.number().min(0).default(0),
  difficulty: z.number().min(0).default(0),
  elapsed_days: z.number().int().min(0).default(0),
  scheduled_days: z.number().int().min(0).default(0),
  learning_steps: z.number().int().min(0).default(0),
  due_at: isoDate,
  reps: z.number().int().min(0).default(0),
  lapses: z.number().int().min(0).default(0),
  last_review: isoDate.nullable().default(null),
  updated_at: isoDate
});
export type ReviewRecord = z.infer<typeof ReviewRecordSchema>;

export const AttemptRecordSchema = z.object({
  item_id: z.string().nullable().default(null),
  card_type: CardTypeSchema.nullable().default(null),
  correct: z.boolean(),
  latency_ms: z.number().int().min(0).nullable().default(null),
  mode: z.enum(["review", "quiz", "conversation"]),
  lesson_id: z.string().nullable().default(null),
  session_id: z.string().nullable().default(null),
  created_at: isoDate
});
export type AttemptRecord = z.infer<typeof AttemptRecordSchema>;

export const LessonProgressSchema = z.object({
  lesson_id: z.string().min(1),
  unit_id: z.string().min(1),
  kind: z.enum(["lesson", "checkpoint"]).default("lesson"),
  status: z.enum(["available", "in_progress", "done"]),
  score: z.number().min(0).max(1).nullable().default(null),
  started_at: isoDate.nullable().default(null),
  completed_at: isoDate.nullable().default(null)
});
export type LessonProgress = z.infer<typeof LessonProgressSchema>;

export const ConversationTurnSchema = z.object({
  session_id: z.string().min(1),
  turn_index: z.number().int().min(0),
  lesson_id: z.string().min(1),
  role: z.enum(["student", "tutor"]),
  content: z.string(),
  model: z.string().nullable().default(null),
  prompt_version: z.string().nullable().default(null),
  created_at: isoDate
});
export type ConversationTurn = z.infer<typeof ConversationTurnSchema>;

export const DailyStatsSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_count: z.number().int().min(0),
  reviewed_count: z.number().int().min(0),
  new_count: z.number().int().min(0),
  backlog: z.number().int().min(0),
  consolidation: z.number().int().min(0).default(0)
});
export type DailyStats = z.infer<typeof DailyStatsSchema>;

export const FlagSchema = z.object({
  kind: z.enum(["audio", "content", "ui"]),
  ref: z.string().min(1),
  note: z.string().nullable().default(null),
  status: z.enum(["open", "resolved", "waived"]).default("open"),
  created_at: isoDate,
  resolved_at: isoDate.nullable().default(null)
});
export type Flag = z.infer<typeof FlagSchema>;

export const MetaRecordSchema = z.object({
  key: z.string().min(1),
  value: z.unknown()
});
export type MetaRecord = z.infer<typeof MetaRecordSchema>;
