import DomainManagerClient from "./DomainManagerClient";
import QualificationMappingAdminClient from "./QualificationMappingAdminClient";
import QualificationTesterSandbox from "./QualificationTesterSandbox";

export const dynamic = "force-dynamic";

export default function QualificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Admin</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">Qualification Domains</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
          Manage the qualification domains used by matching, test qualification strings, or merge duplicate domains.
        </p>
      </div>
      <QualificationTesterSandbox domains={[]} />
      <DomainManagerClient />
      <QualificationMappingAdminClient />
    </div>
  );
}
