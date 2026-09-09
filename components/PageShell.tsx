import ThemeSwitcher from "@/components/ThemeSwitcher";
import { cn } from "@/lib/cn";

interface Props {
  children: React.ReactNode;
  className?: string;
  showThemeSwitcher?: boolean;
}

export default function PageShell({
  children,
  className,
  showThemeSwitcher = true,
}: Props) {
  return (
    <div className={cn("relative flex min-h-dvh flex-col bg-bg", className)}>
      {showThemeSwitcher && (
        <div className="fixed top-4 right-6 z-[60] max-sm:top-3 max-sm:right-4">
          <ThemeSwitcher />
        </div>
      )}
      <div className="relative flex flex-1 flex-col overflow-x-hidden">{children}</div>
    </div>
  );
}
