import type { ChatMessage } from "@/lib/types";

const WELCOME_PREFIX = "Knowledge base ready!";

/** Auto-generated onboarding bubble when a KB becomes ready — not a model reply. */
export function isKbWelcomeMessage(msg: ChatMessage): boolean {
  if (msg.kind === "welcome") return true;
  return (
    msg.role === "assistant" &&
    !msg.sources?.length &&
    !msg.gaps &&
    msg.content.startsWith(WELCOME_PREFIX)
  );
}

export function isCopyableChatMessage(msg: ChatMessage): boolean {
  if (msg.role === "user") return true;
  if (msg.role === "assistant") return !isKbWelcomeMessage(msg);
  return false;
}
