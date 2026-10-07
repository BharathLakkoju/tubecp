import type { Metadata } from "next";
import { DM_Sans, Work_Sans } from "next/font/google";
import { AuthProvider } from "@/components/AuthShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import LegalFooter from "@/components/LegalFooter";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { isE2eAuthBypass } from "@/lib/e2e";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const workSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
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
    >
      <body className={`${dmSans.variable}`}>
        <ThemeProvider>
          <AuthProvider e2eBypass={e2eBypass}>
            <div className="flex min-h-dvh flex-col overflow-x-hidden">
              <div className="flex flex-1 flex-col overflow-x-hidden">
                {children}
              </div>
              <LegalFooter />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
