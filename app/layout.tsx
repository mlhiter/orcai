import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import Link from "next/link";

import { OrcaiLogo } from "@/components/orcai-logo";
import "./globals.css";

const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const titleFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-title",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ORCAI - Structured Tutorial Generator",
  description: "Input a topic and generate reusable structured tutorials.",
  icons: {
    icon: "/orcai-logo.svg",
    shortcut: "/orcai-logo.svg",
    apple: "/orcai-logo.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${bodyFont.variable} ${titleFont.variable}`}>
        <header className="siteHeader">
          <div className="siteHeaderInner">
            <Link className="brandLink" href="/">
              <OrcaiLogo />
              <span className="brandWordmark">ORCAI</span>
            </Link>
            <p className="brandTagline">Topic to Structured Tutorial</p>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
