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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://workbridge.co"),
  title: {
    default: "WorkBridge | The AI-Verified Talent Network",
    template: "%s | WorkBridge",
  },
  description: "Bridging the gap between world-class talent and elite enterprises using AI-driven verification, zero-bias matching, and privacy-first hiring.",
  keywords: ["Job Search", "Recruitment", "AI Hiring", "Malawi Jobs", "Verified Talent", "Zero-Bias Hiring", "Tech Jobs", "Remote Work"],
  authors: [{ name: "WorkBridge Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "WorkBridge | The AI-Verified Talent Network",
    description: "Hire with absolute certainty. Anonymous matching, verified credentials, and AI-driven precision.",
    siteName: "WorkBridge",
    images: [{
      url: "/og-image.png",
      width: 1200,
      height: 630,
      alt: "WorkBridge - AI Verified Talent Network",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "WorkBridge | The AI-Verified Talent Network",
    description: "Hire with absolute certainty. Anonymous matching, verified credentials, and AI-driven precision.",
    images: ["/og-image.png"],
    creator: "@workbridge",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/logo.png"],
    apple: [
      { url: "/logo.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WorkBridge",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#2563eb",
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

