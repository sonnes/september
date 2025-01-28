import { drizzle } from "drizzle-orm/bun-sqlite";

export const db = drizzle("file:./september.db");
