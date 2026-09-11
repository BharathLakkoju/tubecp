import { createDbPool } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

export type DbUser = {
  id: number;
  name: string | null;
  email: string | null;
  password: string | null;
  image: string | null;
};

type UserRow = {
  id: number;
  name: string | null;
  email: string | null;
  password: string | null;
  image: string | null;
};

function rowToUser(row: UserRow): DbUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    image: row.image,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const pool = createDbPool();
  const result = await pool.query<UserRow>(
    `SELECT id, name, email, password, image FROM users WHERE email = $1`,
    [normalizeEmail(email)]
  );
  return result.rows[0] ? rowToUser(result.rows[0]) : null;
}

export async function verifyUserPassword(
  email: string,
  password: string
): Promise<DbUser | null> {
  const user = await getUserByEmail(email);
  if (!user?.password) return null;
  const valid = await verifyPassword(password, user.password);
  return valid ? user : null;
}

export async function createUserWithPassword(
  name: string,
  email: string,
  plainPassword: string
): Promise<DbUser> {
  const pool = createDbPool();
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await hashPassword(plainPassword);

  const result = await pool.query<UserRow>(
    `INSERT INTO users (name, email, password, "emailVerified")
     VALUES ($1, $2, $3, NOW())
     RETURNING id, name, email, password, image`,
    [name.trim(), normalizedEmail, passwordHash]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to create user");
  }
  return rowToUser(row);
}
