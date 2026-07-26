import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE = "MCP Guardian";
const TAGLINE = "Real-Time Security Firewall for AI Agents";

export const metadata: Metadata = {
  metadataBase: new URL("https://mcpguardian.dev"),
  title: {
    default: `${SITE} - ${TAGLINE}`,
    template: `%s · ${SITE}`,
  },
  description:
    "A bidirectional security firewall that inspects every request and tool response flowing between users, AI agents, and MCP tools. Detects prompt injection, tool poisoning, PII leakage, and more - in real time.",
  keywords: [
    "MCP",
    "AI security",
    "prompt injection",
    "AI firewall",
    "tool poisoning",
    "LLM security",
    "PII detection",
  ],
  authors: [{ name: "MCP Guardian" }],
  openGraph: {
    title: `${SITE} - ${TAGLINE}`,
    description:
      "Real-time bidirectional security firewall for AI agents and MCP tools.",
    type: "website",
    siteName: SITE,
  },
  twitter: { card: "summary_large_image", title: `${SITE} - ${TAGLINE}` },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#0a0c14",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} dark h-full`}
    >
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
