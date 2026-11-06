import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Finance Planner — Warm Ledger", description: "A considered personal finance prototype. Explicit sample data only." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
