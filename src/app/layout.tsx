import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { JourneyBackground } from "@/components/journey-background";
import "./globals.css";
import { FeedbackWidget } from "@/components/feedback-widget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Frame + Mirror",
  description: "Frame your meetings. Mirror your communication.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} font-sans antialiased flex min-h-screen flex-col`}>
        <TooltipProvider>
          <div className="flex-1 relative">
            <JourneyBackground />
            {children}
            <FeedbackWidget />
          </div>
        </TooltipProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
