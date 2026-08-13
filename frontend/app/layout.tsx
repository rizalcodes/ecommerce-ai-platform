import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import { AssistantWidget } from "@/app/components/chatbot/assistant-widget";
import "./globals.css";

/*
  Typography — Design.md Section 3, now locked: Plus Jakarta Sans headings over
  an Inter body.

  Satoshi was the first pick. Its Fontshare EULA grants free commercial use but
  clause 02 forbids transmitting the font over the internet for font serving
  without written consent, which is what self-hosting a WOFF2 does; the licensed
  route is a request to Fontshare's CDN on every page load. Plus Jakarta Sans is
  an accepted heading face in the same section, is under the SIL Open Font
  License, and next/font self-hosts it at build time with no third-party request.
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

// The tab should say what the header says. "AI Commerce Platform" was the
// working title and no longer matches the wordmark on the page.
export const metadata: Metadata = {
  title: "PasarKita",
  description:
    "Browse what small Malaysian sellers have in stock and message them directly. "
    + "Ask the product assistant, and it answers only from real listings.",
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
