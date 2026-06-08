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
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <header className="border-b border-zinc-200 bg-white">
          <nav className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
            <a href="/" className="text-sm font-semibold tracking-tight">
              AI Engineering Lab
            </a>
            <a
              href="/dashboard"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
            >
              Telemetry dashboard
            </a>
          </nav>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
