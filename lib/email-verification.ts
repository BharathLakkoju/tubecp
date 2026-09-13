import { randomBytes } from "node:crypto";
import { createDbPool } from "@/lib/db";
import { getAppUrl } from "@/lib/app-url";
import { sendVerificationEmail } from "@/lib/email";
import { getUserByEmail, normalizeEmail } from "@/lib/users";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

function verifyIdentifier(email: string): string {
  return `email-verify:${normalizeEmail(email)}`;
}

export async function createEmailVerificationToken(email: string): Promise<string> {
  const normalized = normalizeEmail(email);
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + VERIFY_TTL_MS);
  const pool = createDbPool();
  const identifier = verifyIdentifier(normalized);

  await pool.query(`DELETE FROM verification_token WHERE identifier = $1`, [identifier]);
  await pool.query(
    `INSERT INTO verification_token (identifier, expires, token) VALUES ($1, $2, $3)`,
    [identifier, expires, token]
  );

  return token;
}

export async function sendEmailVerification(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const user = await getUserByEmail(normalized);
  if (!user?.email) {
    throw new Error("User not found for verification email");
  }

  const token = await createEmailVerificationToken(normalized);
  const verifyUrl = `${getAppUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  await sendVerificationEmail(normalized, verifyUrl);
}

type VerifyTokenRow = {
  identifier: string;
  expires: Date;
};

export async function verifyEmailWithToken(token: string): Promise<boolean> {
  const pool = createDbPool();
  const result = await pool.query<VerifyTokenRow>(
    `SELECT identifier, expires FROM verification_token WHERE token = $1`,
    [token]
  );

  const row = result.rows[0];
  if (!row || row.expires.getTime() < Date.now()) {
    return false;
  }

  if (!row.identifier.startsWith("email-verify:")) {
    return false;
  }

  const email = row.identifier.slice("email-verify:".length);
  const user = await getUserByEmail(email);
  if (!user) return false;

  await pool.query(`UPDATE users SET "emailVerified" = NOW() WHERE id = $1`, [user.id]);
  await pool.query(`DELETE FROM verification_token WHERE token = $1`, [token]);
  return true;
}
