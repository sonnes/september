import { sqliteTable as table } from "drizzle-orm/sqlite-core";
import * as t from "drizzle-orm/sqlite-core";

export const speechFiles = table("speech_files", {
  id: t.text("id").primaryKey(),
  audio: t.blob("audio").notNull().$type<Buffer>(),
});

export type SpeechFile = typeof speechFiles.$inferSelect;
