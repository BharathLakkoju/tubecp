import { headers } from "next/headers";
import { auth } from "@/auth";
import { isE2eAuthBypass } from "@/lib/e2e";

export class AdminAccessError extends Error {
  code = "ADMIN_REQUIRED";

  constructor(message = "Admin access required") {
    super(message);
    this.name = "AdminAccessError";
  }
}

function configuredAdminIds(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

export function isAdminUserId(userId: string): boolean {
  const admins = configuredAdminIds();
  if (admins.size === 0) return false;
  return admins.has(userId);
}

export async function requireAdminUserId(): Promise<string> {
  if (isE2eAuthBypass()) {
    const h = await headers();
    const testUser = h.get("x-e2e-user-id");
    if (testUser && isAdminUserId(testUser)) {
      return testUser;
    }
    throw new AdminAccessError();
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !isAdminUserId(userId)) {
    throw new AdminAccessError();
  }

  return userId;
}
