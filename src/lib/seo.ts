import type { Metadata } from "next";

interface SEOProps {
    title?: string;
    description?: string;
    canonical?: string;
    ogImage?: string;
    noIndex?: boolean;
    jobId?: string;
}

export function constructMetadata({
    title = "WorkBridge - Malawi's modern job board",
    description = "Browse remote, hybrid, and on-site jobs with a calm, fast experience built for Malawi and beyond.",
    canonical = "/",
    ogImage = "/og-image.png",
    noIndex = false,
    jobId,
}: SEOProps = {}): Metadata {
    const finalOgImage = jobId
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/og/job/${jobId}`
        : ogImage;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url: canonical,
            siteName: "WorkBridge",
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
            creator: "Emmanuel Nyangazie",
        },
        alternates: {
            canonical: canonical,
        },
        robots: {
            index: !noIndex,
            follow: !noIndex,
        },
        metadataBase: new URL(process.env.NEXT_PUBLIC_URL || "http://localhost:3000"),
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
    };
}
