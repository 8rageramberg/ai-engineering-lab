import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Engineering Lab",
  description:
    "An AI engineering portfolio that demonstrates clean telemetry and cost-aware AI usage.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-text-primary">
        <header className="border-b border-surface bg-background">
          <nav className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
            <a href="/" className="text-sm font-semibold tracking-tight text-text-primary">
              AI Engineering Lab
            </a>
            <div className="flex items-center gap-6">
              <a
                href="/dashboard"
                className="text-sm font-medium text-text-secondary transition-colors hover:text-accent-primary"
              >
                Telemetry dashboard
              </a>
              <a
                href="/demo-agent"
                className="text-sm font-medium text-text-secondary transition-colors hover:text-accent-primary"
              >
                Demo agent
              </a>
              <a
                href="/telemetry-audit"
                className="text-sm font-medium text-text-secondary transition-colors hover:text-accent-primary"
              >
                Audit log
              </a>
            </div>
          </nav>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
