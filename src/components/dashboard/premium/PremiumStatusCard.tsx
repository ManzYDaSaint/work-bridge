import { SectionCard } from "../ui";
export function PremiumStatusCard({ subscription }: { subscription: any }) {
    return (
        <SectionCard title="Aganyu Premium">
            <div className="space-y-4">
                <p>Status: {subscription?.status || "Free"}</p>
                {subscription?.status === "ACTIVE" ? (
                    <p>Expires on: {new Date(subscription.ends_at).toLocaleDateString()}</p>
                ) : (
                    <button className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                        Upgrade to Premium
                    </button>
                )}
            </div>
        </SectionCard>
    );
}
