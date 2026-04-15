import { Briefcase, Users, Bell, Shield } from "lucide-react";

const features = [
    {
        title: "Smart Job Board",
        description: "Discover curated opportunities matched to your skill set — no noise, just real jobs.",
        icon: Briefcase,
    },
    {
        title: "Direct Applications",
        description: "Apply in one click. Employers see your full profile and respond faster.",
        icon: Users,
    },
    {
        title: "Real-time Alerts",
        description: "Get SMS and email notifications the moment a matching role is posted.",
        icon: Bell,
    },
    {
        title: "Verified Employers",
        description: "Every company listing is reviewed by our team before candidates see it.",
        icon: Shield,
    },
];

export default function Features() {
    return (
        <div id="features" className="py-24 bg-base-200">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold mb-4 uppercase text-blue-600">Features</h2>
                    <h3 className="text-4xl font-extrabold">Everything you need to hire — or be hired</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((f, i) => {
                        const Icon = f.icon;
                        return (
                            <div key={i} className="card bg-base-100 shadow-sm border border-base-300 hover:border-blue-600 transition-colors">
                                <div className="card-body">
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 text-blue-600">
                                        <Icon size={24} />
                                    </div>
                                    <h4 className="text-xl font-bold">{f.title}</h4>
                                    <p className="opacity-70 text-sm">{f.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
