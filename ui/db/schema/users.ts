import { sqliteTable as table } from "drizzle-orm/sqlite-core";
import * as t from "drizzle-orm/sqlite-core";

export const users = table("users", {
  id: t.text("id").primaryKey(),
  email: t.text("email").notNull().unique(),
  name: t.text("name").notNull(),
  password: t.text("password").notNull(),
  imageUrl: t.text("image_url"),
  createdAt: t.integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type User = typeof users.$inferSelect;
