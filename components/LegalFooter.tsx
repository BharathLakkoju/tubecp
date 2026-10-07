"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRODUCT_NAME } from "@/lib/legal";

const HIDE_FOOTER_PREFIXES = ["/app", "/account", "/admin"];

const FOOTER_LINKS = [
  { href: "/terms", label: "Terms of service" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/refund", label: "Cancellation policy" },
  { href: "/app", label: "App" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs/mcp", label: "MCP setup" },
] as const;

function isProductRoute(pathname: string): boolean {
  return HIDE_FOOTER_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default function LegalFooter() {
  const pathname = usePathname();
  const year = new Date().getFullYear();

  if (isProductRoute(pathname)) {
    return null;
  }

  return (
    <footer className="mt-auto border-t px-4 py-8 sm:px-6">
      <nav className="mx-auto mb-4 flex max-w-(--marketing-max) flex-wrap justify-center gap-x-5 gap-y-2" aria-label="Footer">
        {FOOTER_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xs text-label text-foreground-secondary transition-colors duration-(--duration-fast) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="text-center font-mono text-caption text-muted-foreground">
        © {year} {PRODUCT_NAME}
      </p>
    </footer>
  );
}
