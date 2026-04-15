import MarketingNavbar from "@/components/layout/MarketingNavbar";
import Footer from "@/components/layout/Footer";
import { constructMetadata } from "@/lib/seo";
import { Metadata } from "next";

export const metadata: Metadata = constructMetadata({
    title: "WorkBridge",
    description: "Privacy-first job matching for job seekers and employers.",
    canonical: "/",
});

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <MarketingNavbar />
            {children}
            <Footer />
        </>
    );
}
