"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { JobPostingForm } from "@/components/jobs/JobPostingForm";
import { PageHeader } from "@/components/dashboard/ui";
import { JobQuickFormValues, toJobsApiPayload } from "@/lib/validations/job";
import { apiFetchJson } from "@/lib/api";

export default function AdminNewJobClient() {
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    const onSubmit = async (data: JobQuickFormValues) => {
        setSaving(true);
        try {
            const payload = toJobsApiPayload(data);
            await apiFetchJson("/api/admin/jobs", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            toast.success("Sourced job created and assigned to jobs@aganyu.com");
            router.push("/dashboard/admin/jobs");
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || "Failed to create sourced job");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-20 px-1 sm:px-0">
            <PageHeader
                title="Create Sourced Job"
                subtitle="Source a vacancy on behalf of an employer. The job will be linked to an Employer CRM Lead and managed under the operations account (jobs@aganyu.com)."
                action={{ label: "Back to Jobs", href: "/dashboard/admin/jobs", variant: "secondary" }}
            />

            <JobPostingForm
                defaultValues={{
                    postingType: "AGANYU",
                    applicationMethod: "external_url",
                }}
                onSubmit={onSubmit}
                saving={saving}
                submitLabel="Create & Publish Sourced Job"
                companyNamePlaceholder="Hiring company name"
                showSourcingOptions={true}
                onCancel={() => router.back()}
            />
        </div>
    );
}
