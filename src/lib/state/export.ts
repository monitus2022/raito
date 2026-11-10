import { z } from "zod";
import {
  AttemptRecordSchema,
  ConversationTurnSchema,
  DailyStatsSchema,
  FlagSchema,
  LessonProgressSchema,
  ProfileSchema,
  ReviewRecordSchema,
  SettingsSchema
} from "./schema";

export const EXPORT_FORMAT = "raito-state";
export const EXPORT_VERSION = 1;

export const ExportSnapshotSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  schemaVersion: z.number().int().min(1),
  exportedAt: z.string().datetime({ offset: true }),
  stores: z.object({
    profile: z.array(ProfileSchema).length(1),
    settings: z.array(SettingsSchema).length(1),
    review: z.array(ReviewRecordSchema),
    attempts: z.array(AttemptRecordSchema),
    lessons: z.array(LessonProgressSchema),
    conversations: z.array(ConversationTurnSchema),
    daily: z.array(DailyStatsSchema),
    flags: z.array(FlagSchema)
  })
});

export type ExportSnapshot = z.infer<typeof ExportSnapshotSchema>;

export class ExportSchemaError extends Error {
  constructor(
    message: string,
    readonly expected: number,
    readonly actual: unknown
  ) {
    super(message);
    this.name = "ExportSchemaError";
  }
}

export function parseSnapshot(input: unknown): ExportSnapshot {
  const result = ExportSnapshotSchema.safeParse(input);

  if (!result.success) {
    throw new ExportSchemaError(
      `Not a valid Raito export: ${result.error.issues[0]?.message ?? "unknown error"}`,
      EXPORT_VERSION,
      null
    );
  }

  if (result.data.schemaVersion !== EXPORT_VERSION) {
    throw new ExportSchemaError(
      `Export schema version ${String(result.data.schemaVersion)} is not supported; expected ${EXPORT_VERSION}.`,
      EXPORT_VERSION,
      result.data.schemaVersion
    );
  }

  return result.data;
}
