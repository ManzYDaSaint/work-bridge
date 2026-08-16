import { SectionCard } from "../ui";

export function PremiumAnalyticsCard({ stats }: { stats: any }) {
    return (
        <SectionCard title="Premium Overview">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-sm">Active Subs</p>
                    <p className="text-2xl font-bold">{stats.activeCount}</p>
                </div>
                <div>
                    <p className="text-sm">WhatsApp Success</p>
                    <p className="text-2xl font-bold">{stats.deliveryRate}%</p>
                </div>
            </div>
        </SectionCard>
    );
}
