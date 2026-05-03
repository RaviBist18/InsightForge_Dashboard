import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "InsightForge Dashboard",
  description: "A high-performance enterprise Business Intelligence dashboard featuring real-time analytics, data visualization, and automated insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="antialiased min-h-screen bg-[#020617] text-white">
        {children}
      </body>
    </html>
  );
}
