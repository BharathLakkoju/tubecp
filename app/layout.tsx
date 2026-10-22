import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
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

// Evergreen type: IBM Plex Sans for UI, IBM Plex Mono for data (design system §4.1).
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono",
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
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
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
      className={cn(ibmPlexSans.variable, ibmPlexMono.variable)}
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
