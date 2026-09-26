import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppFrame } from "@/components/layout/app-frame";
import { AppProviders } from "@/components/providers/app-providers";
import { getPublicAppConfig } from "@/lib/config/app";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "OM Logistics · Intelligent Control Tower",
    template: "%s · OM Logistics Control Tower",
  },
  description:
    "Centralized supply chain control tower prototype — live shipment map, predictive ETA, exception management and proactive customer updates (simulated demo data).",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b1018" },
    { media: "(prefers-color-scheme: light)", color: "#f5f7fa" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full">
        <AppProviders config={getPublicAppConfig()}>
          <AppFrame>{children}</AppFrame>
        </AppProviders>
      </body>
    </html>
  );
}
