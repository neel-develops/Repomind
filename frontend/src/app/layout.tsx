import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "RepoMind | GitHub Repository Intelligence Dashboard",
  description: "Transform raw GitHub repository data into actionable metrics, scores, and developer health indicators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* Navigation Header */}
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary transition-all group-hover:bg-primary/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                    <path d="M9 18c-4.51 2-5-2-7-2" />
                  </svg>
                </div>
                <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Repo<span className="text-primary">Mind</span>
                </span>
              </Link>
              
              <nav className="hidden md:flex gap-1">
                <Link
                  href="/"
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/insights"
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
                >
                  Saved Insights
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex h-9 items-center justify-center rounded-lg border border-border bg-slate-800/30 px-4 text-xs font-semibold hover:bg-slate-800/60 hover:text-white transition-colors"
              >
                GitHub REST API v3
              </a>
              <div className="md:hidden flex gap-2">
                <Link
                  href="/"
                  className="p-2 text-slate-400 hover:text-white"
                  title="Dashboard"
                >
                  Dashboard
                </Link>
                <Link
                  href="/insights"
                  className="p-2 text-slate-400 hover:text-white"
                  title="Insights"
                >
                  Saved
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="w-full border-t border-border bg-background py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} RepoMind. Designed for VSQC Internship Evaluation.</p>
            <div className="flex gap-6">
              <span>FastAPI Python Engine</span>
              <span>Next.js Client</span>
              <span>PostgreSQL & Prisma</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
