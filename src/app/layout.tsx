import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Analytics from "@/components/Analytics";
import { Toaster } from "sonner";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "WorkBridge | AI-Powered Job Marketplace",
    template: "%s | WorkBridge",
  },
  description: "Bridging the gap between world-class talent and elite enterprises using AI-driven verification and semantic matching.",
  keywords: ["Job Search", "Recruitment", "AI Hiring", "Malawi Jobs", "Verified Talent", "Zero-Bias Hiring"],
  authors: [{ name: "WorkBridge" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className={`${jakarta.className} antialiased min-h-screen flex flex-col`}>
        <Toaster position="top-right" richColors />
        <Analytics />
        <main className="flex-grow">{children}</main>
      </body>
    </html>
  );
}

