import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance Planner — A little clarity",
  applicationName: "Finance Planner",
  description: "Track accounts and everyday transactions in separate personal and shared workspaces. Whole-rupiah IDR, one month at a time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
