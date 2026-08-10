"use client";

import { useState, useEffect } from "react";
import { JobQuickFormValues, toJobsApiPayload } from "@/lib/validations/job";
import { apiFetchJson } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/ui";
import { useRouter } from "next/navigation";
import { Employer } from "@/types";
import { toast } from "sonner";
import { JobPostingForm } from "@/components/jobs/JobPostingForm";

export default function NewJobPage() {
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<Employer | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const router = useRouter();

    useEffect(() => {
        apiFetchJson<{ employer?: Employer }>("/api/me")
            .then((res) => {
                setProfile(res.employer ?? null);
            })
            .catch(() => setProfile(null))
            .finally(() => setLoadingProfile(false));
    }, []);

    const isApproved = profile?.status === "APPROVED";

    const onSubmit = async (data: JobQuickFormValues) => {
        if (!isApproved) {
            toast.error("Posting unlocks after your company is approved.");
            return;
        }
        setSaving(true);
        try {
            await apiFetchJson("/api/jobs", {
                method: "POST",
                body: JSON.stringify(toJobsApiPayload(data)),
            });
            toast.success("Job posted");
            router.push("/dashboard/employer/jobs");
            router.refresh();
        } catch (e: any) {
            const msg = e.message || "Could not post job";
            if (msg.includes("limit")) {
                toast.error(msg, {
                    action: {
                        label: "Request Access",
                        onClick: async () => {
                            try {
                                await apiFetchJson("/api/early-access", {
                                    method: "POST",
                                    body: JSON.stringify({ featureRequested: "MORE_JOBS" }),
                                });
                                toast.success("You've been added to the early access waitlist!");
                            } catch (err: any) {
                                toast.error(err.message || "Failed to request access");
                            }
                        },
                    },
                });
            } else {
                toast.error(msg);
            }
        } finally {
            setSaving(false);
        }
    };

    if (loadingProfile) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-16 px-1 sm:px-0">
            <PageHeader
                title="Post a job"
                subtitle="Add the basics in a minute — open “More options” for salary and deadline."
                action={{ label: "Back", href: "/dashboard/employer/jobs", variant: "secondary" }}
            />

            <JobPostingForm
                onSubmit={onSubmit}
                saving={saving}
                submitLabel="Publish job"
                companyNamePlaceholder={profile?.companyName || "your name"}
                submitDisabled={!isApproved}
                submitDisabledTitle="Available after company approval"
                showApprovalBanner
                isApproved={isApproved}
                onCancel={() => router.back()}
            />
        </div>
    );
}
