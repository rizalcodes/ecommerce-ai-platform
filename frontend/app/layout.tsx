import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import { AssistantWidget } from "@/app/components/chatbot/assistant-widget";
import "./globals.css";

/*
  Typography — Design.md Section 3.
  Body is Inter (locked). Heading is Satoshi (locked), but Satoshi ships via
  Fontshare rather than Google Fonts, so Plus Jakarta Sans stands in until the
  final font files land. Only this loader changes when Satoshi is dropped in;
  every component reads --font-heading.
*/
const headingFace = Plus_Jakarta_Sans({
  variable: "--font-heading-face",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const bodyFace = Inter({
  variable: "--font-body-face",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Commerce Platform",
  description:
    "A commerce platform with an AI product assistant and per-role business dashboards.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${headingFace.variable} ${bodyFace.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        {/* Mounted once in the root layout (Architecture.md Section 2) so it
            persists across every route instead of remounting per page. */}
        <AssistantWidget />
      </body>
    </html>
  );
}
