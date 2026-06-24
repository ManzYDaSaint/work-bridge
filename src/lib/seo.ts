import type { Metadata } from "next";
import { getSiteUrl, getSiteUrlObject } from "@/lib/site-url";

interface SEOProps {
    title?: string;
    description?: string;
    canonical?: string;
    ogImage?: string;
    noIndex?: boolean;
    jobId?: string;
}

export function constructMetadata({
    title = "Aganyu - Malawi's modern job board",
    description = "Browse remote, hybrid, and on-site jobs with a calm, fast experience built for Malawi and beyond.",
    canonical = "/",
    ogImage = "/og-image.png",
    noIndex = false,
    jobId,
}: SEOProps = {}): Metadata {
    const siteUrl = getSiteUrl("https://aganyu.com");
    const finalOgImage = jobId
        ? `${siteUrl}/api/og/job/${jobId}`
        : ogImage;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url: canonical,
            siteName: "Aganyu",
            images: [
                {
                    url: finalOgImage,
                },
            ],
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [finalOgImage],
            creator: "Emmanuel Nyangazi",
        },
        alternates: {
            canonical: canonical,
        },
        robots: {
            index: !noIndex,
            follow: !noIndex,
        },
        metadataBase: getSiteUrlObject("https://aganyu.com"),
        icons: {
            icon: [
                { url: "/logo.svg", type: "image/svg+xml" },
            ],
            shortcut: ["/logo.svg"],
            apple: [
                { url: "/logo.png", sizes: "180x180", type: "image/png" },
            ],
        },
    };
}
