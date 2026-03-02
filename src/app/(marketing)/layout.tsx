import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { constructMetadata } from "@/lib/seo";
import { Metadata } from "next";

export const metadata: Metadata = constructMetadata({
    title: "WorkBridge - AI-Powered Talent Discovery & Recruitment",
    description: "WorkBridge connects elite organizations with verified, high-performance professionals through objective AI and zero-bias matching.",
    canonical: "/"
});

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Navbar />
            {children}
            <Footer />
        </>
    );
}
