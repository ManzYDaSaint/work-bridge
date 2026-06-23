import type { Metadata } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

import { Toaster } from "sonner";
import PWARegister from "@/components/pwa/PWARegister";
import InstallAppPrompt from "@/components/pwa/InstallAppPrompt";
import FeedbackButton from "@/components/ui/FeedbackButton";
import { AuthProvider } from "@/context/AuthContext";
import { getSiteUrlObject } from "@/lib/site-url";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

function getPlausibleDomain() {
  const configuredDomain =
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ||
    process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_URL;

  if (!configuredDomain) return null;

  try {
    const parsed = configuredDomain.includes("://")
      ? new URL(configuredDomain)
      : new URL(`https://${configuredDomain}`);

    if (parsed.hostname === "localhost") return null;

    return parsed.hostname;
  } catch {
    return configuredDomain.replace(/^https?:\/\//, "").split("/")[0] || null;
  }
}

const plausibleDomain = getPlausibleDomain();

export const metadata: Metadata = {
  metadataBase: getSiteUrlObject(),
  applicationName: "Aganyu",
  title: {
    default: "Aganyu | Malawi's modern job board",
    template: "%s | Aganyu",
  },
  description: "A modern Malawian job board for remote, hybrid, and on-site roles across tech, operations, design, sales, and more.",
  keywords: ["Job Search", "Recruitment", "Malawi Jobs", "Remote Jobs", "Hybrid Jobs", "On-site Jobs", "Hiring", "Careers"],
  authors: [{ name: "Aganyu Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Aganyu | Malawi's modern job board",
    description: "Browse remote, hybrid, and on-site roles across Malawi and beyond.",
    siteName: "Aganyu",
    images: [{
      url: "/og-image.png",
      width: 1200,
      height: 630,
      alt: "Aganyu - Malawi's modern job board",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aganyu | Malawi's modern job board",
    description: "Browse remote, hybrid, and on-site roles across Malawi and beyond.",
    images: ["/og-image.png"],
    creator: "@aganyu",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logo-black.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/logo-black.svg"],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Aganyu",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#16324f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jakarta.variable}>
      <head>
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        {plausibleDomain && (
          <Script
            id="plausible-analytics"
            src="https://plausible.io/js/script.js"
            strategy="beforeInteractive"
            data-domain={plausibleDomain}
          />
        )}
      </head>
      <body className={`${jakarta.className} antialiased min-h-screen flex flex-col`}>
        <Toaster position="top-right" richColors />
        <PWARegister />
        <InstallAppPrompt />
        <AuthProvider>
          <main className="flex-grow">{children}</main>
        </AuthProvider>
        <FeedbackButton />
      </body>
    </html>
  );
}

