import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/AuthShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import SiteFooter from "@/components/SiteFooter";
import MotionProvider from "@/components/motion/MotionProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { isE2eAuthBypass } from "@/lib/e2e";
import { cn } from "@/lib/utils";
import "./globals.css";

// Evergreen type: Geist for UI, Geist Mono for data (design system §4.1).
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: BRAND_NAME,
    template: `%s | ${BRAND_NAME}`,
  },
  description: BRAND_TAGLINE,
  applicationName: BRAND_NAME,
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const e2eBypass = isE2eAuthBypass();

  return (
    <html
      lang="en"
      data-color-scheme="light"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={cn(geistSans.variable, geistMono.variable)}
    >
      <body>
        <ThemeProvider>
          <MotionProvider>
            <TooltipProvider>
              <AuthProvider e2eBypass={e2eBypass}>
                <div className="flex min-h-dvh flex-col overflow-x-clip">
                  <div className="flex min-h-0 flex-1 flex-col overflow-x-clip">{children}</div>
                  <div className="relative z-10 shrink-0">
                    <SiteFooter />
                  </div>
                </div>
              </AuthProvider>
            </TooltipProvider>
            <Toaster />
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
