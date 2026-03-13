import type { Metadata } from "next";

interface SEOProps {
    title?: string;
    description?: string;
    canonical?: string;
    ogImage?: string;
    noIndex?: boolean;
}

export function constructMetadata({
    title = "WorkBridge - AI-Powered Talent Discovery & Recruitment",
    description = "WorkBridge connects elite organizations with verified, high-performance professionals through objective AI matching.",
    canonical = "/",
    ogImage = "/og-image.png",
    noIndex = false,
}: SEOProps = {}): Metadata {
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
                    url: ogImage,
                },
            ],
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [ogImage],
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
