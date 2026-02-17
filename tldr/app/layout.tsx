import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TLDR",
  description: "Paste an X thread link. Listen like a podcast.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="min-h-screen bg-zinc-950 bg-grid [background-size:24px_24px]">
          <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent" />
          {children}
        </div>
      </body>
    </html>
  );
}
