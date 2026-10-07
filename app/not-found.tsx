import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export default function NotFound() {
  return (
    <main id="main-content" className="flex min-h-[70dvh] flex-1 items-center justify-center px-4">
      <Empty>
        <EmptyHeader>
          <p
            className="font-mono text-display leading-none font-semibold text-foreground"
          >
            <span className="text-primary">[</span>404<span className="text-primary">]</span>
          </p>
          <EmptyTitle>
            <h1>This page doesn&apos;t exist</h1>
          </EmptyTitle>
          <EmptyDescription>
            The link may be broken, or the page may have moved.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/app" className={buttonVariants()}>
              Go to research
            </Link>
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Go home
            </Link>
          </div>
          <Link href="/app/kb" className={buttonVariants({ variant: "link" })}>
            Your knowledge bases
          </Link>
        </EmptyContent>
      </Empty>
    </main>
  );
}
