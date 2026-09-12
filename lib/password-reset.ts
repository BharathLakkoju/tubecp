import { randomBytes } from "node:crypto";
import { createDbPool } from "@/lib/db";
import { getAppUrl } from "@/lib/app-url";
import { sendPasswordResetEmail } from "@/lib/email";
import {
  normalizeEmail,
  getUserByEmail,
  updateUserPassword,
  hasPasswordAuth,
} from "@/lib/users";

const RESET_TTL_MS = 60 * 60 * 1000;

function resetIdentifier(email: string): string {
  return `password-reset:${normalizeEmail(email)}`;
}

export async function createPasswordResetToken(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email);
  const user = await getUserByEmail(normalized);
  if (!hasPasswordAuth(user)) return null;

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + RESET_TTL_MS);
  const pool = createDbPool();
  const identifier = resetIdentifier(normalized);

  await pool.query(`DELETE FROM verification_token WHERE identifier = $1`, [identifier]);
  await pool.query(
    `INSERT INTO verification_token (identifier, expires, token) VALUES ($1, $2, $3)`,
    [identifier, expires, token]
  );

  return token;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const token = await createPasswordResetToken(email);
  if (!token) return;

  const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  await sendPasswordResetEmail(normalizeEmail(email), resetUrl);
}

type ResetTokenRow = {
  identifier: string;
  expires: Date;
};

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<boolean> {
  const pool = createDbPool();
  const result = await pool.query<ResetTokenRow>(
    `SELECT identifier, expires FROM verification_token WHERE token = $1`,
    [token]
  );

  const row = result.rows[0];
  if (!row || row.expires.getTime() < Date.now()) {
    return false;
  }

  if (!row.identifier.startsWith("password-reset:")) {
    return false;
  }

  const email = row.identifier.slice("password-reset:".length);
  const user = await getUserByEmail(email);
  if (!user || !hasPasswordAuth(user)) return false;

  await updateUserPassword(String(user.id), newPassword);
  await pool.query(`DELETE FROM verification_token WHERE token = $1`, [token]);
  return true;
}
