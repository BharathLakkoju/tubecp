/** Postgres undefined_table */
export function isMissingRelationError(err: unknown, relation?: string): boolean {
  if (!err || typeof err !== "object" || !("code" in err)) {
    return false;
  }

  if ((err as { code: string }).code !== "42P01") {
    return false;
  }

  if (!relation) {
    return true;
  }

  const message = String((err as { message?: string }).message ?? "");
  return message.includes(relation);
}
