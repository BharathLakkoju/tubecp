import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-container motion-fade-up flex min-h-[60dvh] flex-col justify-center">
      <p className="mb-2.5 font-mono text-[42px] leading-none font-semibold tracking-[-0.84px] text-text">
        <span className="text-accent">[</span>
        404
        <span className="text-accent">]</span>
      </p>
      <p className="mb-6 font-mono text-sm text-text-muted">Page not found.</p>
      <Link href="/" className="btn-primary w-fit">
        go home →
      </Link>
    </div>
  );
}
