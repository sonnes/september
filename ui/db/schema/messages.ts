import { sqliteTable as table } from "drizzle-orm/sqlite-core";
import * as t from "drizzle-orm/sqlite-core";

export const messages = table("messages", {
  id: t.text("id").primaryKey(),
  text: t.text("text"),
  type: t.text("type"),
  createdAt: t.integer("created_at", { mode: "timestamp_ms" }),
});

export type Message = typeof messages.$inferSelect;
