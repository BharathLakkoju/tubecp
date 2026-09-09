import Link from "next/link";
import { PRODUCT_NAME } from "@/lib/legal";

export default function LegalFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border px-6 py-6 max-sm:px-4 max-sm:pb-5">
      <nav className="mb-3 flex flex-wrap justify-center gap-4" aria-label="Legal">
        <Link href="/terms" className="font-mono text-xs text-text-muted no-underline hover:text-accent">
          Terms of Service
        </Link>
        <Link href="/privacy" className="font-mono text-xs text-text-muted no-underline hover:text-accent">
          Privacy Policy
        </Link>
        <Link href="/refund" className="font-mono text-xs text-text-muted no-underline hover:text-accent">
          Cancellation Policy
        </Link>
        <Link href="/app" className="font-mono text-xs text-text-muted no-underline hover:text-accent">
          App
        </Link>
        <Link href="/pricing" className="font-mono text-xs text-text-muted no-underline hover:text-accent">
          Pricing
        </Link>
      </nav>
      <p className="text-center font-mono text-[11px] text-text-muted">
        © {year} {PRODUCT_NAME}
      </p>
    </footer>
  );
}
