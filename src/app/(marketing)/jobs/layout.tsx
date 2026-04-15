import { constructMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = constructMetadata({
    title: "Jobs",
    description: "Browse open roles on WorkBridge — verified employers, privacy-first applications.",
    canonical: "/jobs",
});

export default function JobsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
