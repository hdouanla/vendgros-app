import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { cn } from "@acme/ui";
import { ThemeProvider, ThemeToggle } from "@acme/ui/theme";
import { Toaster } from "@acme/ui/toast";

import { env } from "~/env";
import { TRPCReactProvider } from "~/trpc/react";
import { Navbar } from "~/components/layout/navbar";
import { FooterWrapper } from "~/components/layout/footer-wrapper";

import "./styles.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    env.VERCEL_ENV === "production"
      ? "https://vendgros.com"
      : "http://localhost:3000",
  ),
  title: "VendGros - Buy and Sell Bulk Items Locally",
  description: "Community marketplace for bulk deals with geospatial search",
  openGraph: {
    title: "VendGros",
    description: "Buy and sell bulk items locally",
    url: "https://vendgros.com",
    siteName: "VendGros",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "bg-background text-foreground min-h-screen font-sans antialiased",
          geistSans.variable,
          geistMono.variable,
        )}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <TRPCReactProvider>
            <Navbar />
            <main>{props.children}</main>
            <FooterWrapper />
          </TRPCReactProvider>
          <div className="absolute right-4 bottom-4">
            <ThemeToggle />
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
