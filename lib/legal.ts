import { BRAND_NAME } from "@/lib/brand";

export const PRODUCT_NAME = BRAND_NAME;

export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@tubecp.com";

export const LEGAL_LAST_UPDATED = "September 9, 2026";

export const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of service" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/refund", label: "Cancellation policy" },
] as const;
