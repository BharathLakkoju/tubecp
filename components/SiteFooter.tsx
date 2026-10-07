"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Wordmark from "@/components/Wordmark";
import { BRAND_TAGLINE } from "@/lib/brand";
import { PRODUCT_NAME, SUPPORT_EMAIL } from "@/lib/legal";
const PRODUCT_ROUTE_PREFIXES = ["/app", "/account", "/admin"];

const PRODUCT_LINKS = [
  { href: "/app", label: "Research" },
  { href: "/pricing", label: "Pricing" },
  { href: "/sign-in", label: "Sign in" },
  { href: "/sign-up", label: "Get started" },
] as const;

const RESOURCE_LINKS = [
  { href: "/docs/mcp", label: "MCP setup" },
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Plans" },
] as const;

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of service" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/refund", label: "Cancellation policy" },
] as const;

function isProductRoute(pathname: string): boolean {
  return PRODUCT_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xs text-body-sm text-foreground-secondary transition-colors duration-(--duration-fast) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label}
    </Link>
  );
}

function CompactFooter({ year }: { year: number }) {
  return (
    <footer
      id="site-footer"
      className="mt-auto border-t border-border bg-background px-4 py-6 sm:px-6"
    >
      <div className="mx-auto flex max-w-(--content-max) flex-col items-center gap-3">
        <nav
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2"
          aria-label="Footer"
        >
          {LEGAL_LINKS.map((link) => (
            <FooterLink key={link.href} href={link.href} label={link.label} />
          ))}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="rounded-xs text-body-sm text-foreground-secondary transition-colors duration-(--duration-fast) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Support
          </a>
        </nav>
        <p className="font-mono text-caption text-muted-foreground">
          © {year} {PRODUCT_NAME}
        </p>
      </div>
    </footer>
  );
}

function MarketingFooter({ year }: { year: number }) {
  return (
    <footer
      id="site-footer"
      className="mt-auto border-t border-border bg-background px-4 py-14 sm:px-6 sm:py-16"
    >
      <div className="mx-auto flex max-w-(--marketing-max) flex-col gap-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="w-fit rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Wordmark size="sm" />
            </Link>
            <p className="max-w-xs text-body-sm text-foreground-secondary">{BRAND_TAGLINE}</p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-body-sm text-primary hover:text-primary-hover"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-label font-medium text-foreground">Product</p>
            <nav className="flex flex-col gap-2" aria-label="Product">
              {PRODUCT_LINKS.map((link) => (
                <FooterLink key={link.href} href={link.href} label={link.label} />
              ))}
            </nav>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-label font-medium text-foreground">Resources</p>
            <nav className="flex flex-col gap-2" aria-label="Resources">
              {RESOURCE_LINKS.map((link) => (
                <FooterLink key={link.href} href={link.href} label={link.label} />
              ))}
            </nav>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-label font-medium text-foreground">Legal</p>
            <nav className="flex flex-col gap-2" aria-label="Legal">
              {LEGAL_LINKS.map((link) => (
                <FooterLink key={link.href} href={link.href} label={link.label} />
              ))}
            </nav>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-2 border-t pt-6 sm:flex-row">
          <p className="font-mono text-caption text-muted-foreground">
            © {year} {PRODUCT_NAME}. All rights reserved.
          </p>
          <p className="text-caption text-muted-foreground">
            YouTube is a trademark of Google LLC. tubecp is not affiliated with YouTube.
          </p>
        </div>
      </div>
    </footer>
  );
}

/** Site-wide footer: full columns on marketing routes, compact bar in the signed-in app. */
export default function SiteFooter() {
  const pathname = usePathname();
  const year = new Date().getFullYear();
  const compact = isProductRoute(pathname);

  return compact ? <CompactFooter year={year} /> : <MarketingFooter year={year} />;
}
