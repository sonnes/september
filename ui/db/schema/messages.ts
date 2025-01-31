import { sqliteTable as table } from "drizzle-orm/sqlite-core";
import * as t from "drizzle-orm/sqlite-core";

export const messages = table("messages", {
  id: t.text("id").primaryKey(),
  text: t.text("text").notNull(),
  type: t.text("type").notNull(),
  createdAt: t.integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type Message = typeof messages.$inferSelect;
