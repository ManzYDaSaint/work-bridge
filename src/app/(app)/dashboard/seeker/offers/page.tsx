import { Zap, MapPin, Clock, DollarSign } from "lucide-react";
import { PageHeader, EmptyState, Badge } from "@/components/dashboard/ui";

// Mock Offer Card — replace with real data fetch when API is ready
function OfferCard({ title, company, location, salary, type, isNew }: {
    title: string; company: string; location: string;
    salary: string; type: string; isNew?: boolean;
}) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-blue-200 transition-all group">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-black text-sm flex items-center justify-center flex-shrink-0">
                        {company[0]}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{title}</h3>
                        <p className="text-xs text-slate-400">{company}</p>
                    </div>
                </div>
                {isNew && <Badge label="New" variant="blue" />}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1"><MapPin size={12} />{location}</span>
                <span className="flex items-center gap-1"><DollarSign size={12} />{salary}</span>
                <span className="flex items-center gap-1"><Clock size={12} />{type}</span>
            </div>
            <div className="flex gap-2 mt-4">
                <button className="flex-1 h-8 border border-slate-300 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors">
                    Save
                </button>
                <button className="flex-1 h-8 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20">
                    Apply Now
                </button>
            </div>
        </div>
    );
}

export default function JobOffersPage() {
    // Will be replaced with real API call
    const offers: any[] = [];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Job Offers"
                subtitle="Personalised job matches based on your profile"
            />

            {offers.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200">
                    <EmptyState
                        icon={Zap}
                        title="No Job Offers Yet"
                        description="Complete your profile and upload your resume to start receiving personalised job matches."
                        action={{ label: "Complete Profile", href: "/dashboard/seeker/profile" }}
                        iconColor="text-orange-500"
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {offers.map((o, i) => <OfferCard key={i} {...o} />)}
                </div>
            )}
        </div>
    );
}
