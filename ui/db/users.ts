import { db } from "@/db";
import { users } from "@/db/schema/users";
import { type User } from "@/db/schema/users";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";

export type { User };

const SALT_ROUNDS = 10;

export const createUser = async (user: Omit<User, "id" | "createdAt">) => {
  // Hash the password before storing
  const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);

  await db.insert(users).values({
    ...user,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    password: hashedPassword,
  });
};

export const loginUser = async (
  email: string,
  password: string
): Promise<User | undefined> => {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then((rows) => rows[0]);

  if (!user) {
    return undefined;
  }

  // Compare the provided password with the stored hash
  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    return undefined;
  }

  return user;
};
