import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Sora, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["400", "500", "600", "700", "800"],
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
});
const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "AarogyaCare AI — Multi-Agent Prescription & Medical Guidance Assistant",
  description:
    "An intelligent multi-agent healthcare platform that deciphers doctor prescriptions, checks drug safety, generates daily schedules, and translates complex medical advice into clear, plain English.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${sora.variable} ${inter.variable} ${plex.variable} bg-ink text-fg font-[family-name:var(--font-body)] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
