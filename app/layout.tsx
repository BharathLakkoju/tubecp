import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/components/AuthShell";
import { isE2eAuthBypass } from "@/lib/e2e";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "YouTube Research Agent",
  description: "Turn YouTube research topics into chattable knowledge bases",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const e2eBypass = isE2eAuthBypass();

  return (
    <AuthProvider e2eBypass={e2eBypass}>
      <html lang="en">
        <body
          className={`${dmSans.variable} ${jetbrainsMono.variable}`}
          data-e2e-bypass={e2eBypass ? "true" : undefined}
        >
          {children}
        </body>
      </html>
    </AuthProvider>
  );
}
