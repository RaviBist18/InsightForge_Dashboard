import type { Metadata } from "next";
import { Geist } from "next/font/google";
import ConditionalFooter from "@/components/conditional-footer";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "InsightForge Dashboard",
  description:
    "A high-performance enterprise Business Intelligence dashboard featuring real-time analytics, data visualization, and automated insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="antialiased h-dvh overflow-hidden bg-[#020617] text-white flex flex-col">
        <main className="flex-1">{children}</main>
        <ConditionalFooter />
      </body>
    </html>
  );
}
