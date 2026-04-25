"use client";

import { useState, KeyboardEvent } from "react";
import { apiFetch, apiFetchJson } from "@/lib/api";
import {
    Loader2,
    X,
    Plus,
    ChevronRight,
    ChevronLeft,
    Check,
    Briefcase,
    MapPin,
    User,
    Sparkles,
    Settings2,
    GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type MeData = {
    role: "JOB_SEEKER" | "EMPLOYER" | "ADMIN";
    onboardingComplete?: boolean;
    jobSeeker?: {
        full_name?: string;
        location?: string;
        bio?: string;
        qualification?: string;
        skills?: string[];
        seniorityLevel?: string;
        employmentType?: string;
        salaryExpectation?: number;
        experience?: Experience[];
        education?: Education[];
        searchIntent?: string;
        profileVisibility?: string;
    };
    employer?: {
        companyName?: string;
        industry?: string;
        location?: string;
    };
};

type Experience = {
    role: string;
    company: string;
    startDate: string; // ISO or YYYY-MM-DD
    endDate?: string;   // ISO or YYYY-MM-DD
    current: boolean;
    description: string;
};

type Education = {
    certificate: string;
    institution: string;
    startDate: string; // ISO or YYYY-MM-DD
    endDate?: string;   // ISO or YYYY-MM-DD
    current: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SENIORITY_LEVELS = [
    { value: "Intern", label: "Intern" },
    { value: "Junior", label: "Junior" },
    { value: "Mid-Level", label: "Mid-Level" },
    { value: "Senior", label: "Senior" },
    { value: "Lead", label: "Lead" },
    { value: "Executive", label: "Executive" },
];

const EMPLOYMENT_TYPES = [
    { value: "Full-time", label: "Full-time" },
    { value: "Part-time", label: "Part-time" },
    { value: "Contract", label: "Contract" },
    { value: "Freelance", label: "Freelance" },
];

const QUALIFICATIONS = [
    "High School",
    "Diploma",
    "Bachelor's Degree",
    "Master's Degree",
    "PhD / Doctorate",
    "Professional Certification",
    "Other",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => String(CURRENT_YEAR - i));

const STEPS = [
    { id: 1, label: "Basic Info", icon: User, required: true },
    { id: 2, label: "Education", icon: GraduationCap, required: false },
    { id: 3, label: "Skills", icon: Sparkles, required: true },
    { id: 4, label: "Experience", icon: Briefcase, required: false },
    { id: 5, label: "Preferences", icon: Settings2, required: false },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
    return (
        <div className="mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    const isCompleted = current > step.id;
                    const isCurrent = current === step.id;
                    return (
                        <div key={step.id} className="flex flex-1 items-center">
                            <div className="flex flex-col items-center gap-1.5">
                                <div
                                    className={cn(
                                        "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300",
                                        isCompleted
                                            ? "border-slate-900 bg-slate-900 dark:border-slate-100 dark:bg-slate-100"
                                            : isCurrent
                                                ? "border-slate-900 bg-white dark:border-slate-100 dark:bg-slate-950"
                                                : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                                    )}
                                >
                                    {isCompleted ? (
                                        <Check
                                            size={15}
                                            className="text-white dark:text-slate-900"
                                            strokeWidth={2.5}
                                        />
                                    ) : (
                                        <Icon
                                            size={15}
                                            className={cn(
                                                isCurrent
                                                    ? "text-slate-900 dark:text-slate-100"
                                                    : "text-slate-400 dark:text-slate-500"
                                            )}
                                        />
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        "text-[10px] sm:text-xs font-medium leading-none hidden sm:block",
                                        isCurrent
                                            ? "text-slate-900 dark:text-slate-100"
                                            : "text-slate-400 dark:text-slate-500"
                                    )}
                                >
                                    {step.label}
                                </span>
                            </div>
                            {idx < STEPS.length - 1 && (
                                <div
                                    className={cn(
                                        "mx-2 mt-[-14px] h-0.5 flex-1 transition-all duration-500",
                                        current > step.id
                                            ? "bg-slate-900 dark:bg-slate-100"
                                            : "bg-slate-200 dark:bg-slate-700"
                                    )}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function SkillTagInput({
    skills,
    onChange,
}: {
    skills: string[];
    onChange: (s: string[]) => void;
}) {
    const [input, setInput] = useState("");

    const addSkill = () => {
        const val = input.trim();
        if (val && !skills.includes(val)) {
            onChange([...skills, val]);
        }
        setInput("");
    };

    const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addSkill();
        }
        if (e.key === "Backspace" && !input && skills.length > 0) {
            onChange(skills.slice(0, -1));
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                {skills.map((s) => (
                    <span
                        key={s}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                        {s}
                        <button
                            type="button"
                            onClick={() => onChange(skills.filter((x) => x !== s))}
                            className="ml-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100"
                        >
                            <X size={11} />
                        </button>
                    </span>
                ))}
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    onBlur={addSkill}
                    placeholder={skills.length === 0 ? "Type a skill and press Enter…" : "Add more…"}
                    className="min-w-[120px] flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                />
            </div>
            <p className="text-xs text-slate-400">Press Enter or comma to add each skill</p>
        </div>
    );
}

function ToggleChip({
    label,
    selected,
    onClick,
}: {
    label: string;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "rounded-xl border px-3.5 py-2 text-xs font-medium transition",
                selected
                    ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500"
            )}
        >
            {label}
        </button>
    );
}

function EducationEntry({
    edu,
    onChange,
    onRemove,
}: {
    edu: Education;
    onChange: (e: Education) => void;
    onRemove: () => void;
}) {
    const inputCls =
        "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
    const selectCls =
        "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

    const startYear = edu.startDate ? edu.startDate.split("-")[0] : "";
    const endYear = edu.endDate ? edu.endDate.split("-")[0] : "";

    return (
        <div className="relative rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <button
                type="button"
                onClick={onRemove}
                className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
                <X size={14} />
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Certificate</label>
                    <input
                        value={edu.certificate}
                        onChange={(e) => onChange({ ...edu, certificate: e.target.value })}
                        placeholder="e.g. Degree"
                        className={inputCls}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Institution</label>
                    <input
                        value={edu.institution}
                        onChange={(e) => onChange({ ...edu, institution: e.target.value })}
                        placeholder="e.g. University of Malawi (UNIMA)"
                        className={inputCls}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Start Year</label>
                    <select
                        value={startYear}
                        onChange={(e) => onChange({ ...edu, startDate: `${e.target.value}-01-01` })}
                        className={selectCls}
                    >
                        <option value="">Select year</option>
                        {YEARS.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">End Year</label>
                    <select
                        value={edu.current ? "Present" : endYear}
                        onChange={(e) => {
                            if (e.target.value === "Present") {
                                onChange({ ...edu, current: true, endDate: undefined });
                            } else {
                                onChange({ ...edu, current: false, endDate: `${e.target.value}-01-01` });
                            }
                        }}
                        className={selectCls}
                    >
                        <option value="">Select year</option>
                        <option value="Present">Present</option>
                        {YEARS.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}

function ExperienceEntry({
    exp,
    onChange,
    onRemove,
}: {
    exp: Experience;
    onChange: (e: Experience) => void;
    onRemove: () => void;
}) {
    const inputCls =
        "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
    const selectCls =
        "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

    const startYear = exp.startDate ? exp.startDate.split("-")[0] : "";
    const endYear = exp.endDate ? exp.endDate.split("-")[0] : "";

    return (
        <div className="relative rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <button
                type="button"
                onClick={onRemove}
                className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
                <X size={14} />
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Job Title</label>
                    <input
                        value={exp.role}
                        onChange={(e) => onChange({ ...exp, role: e.target.value })}
                        placeholder="e.g. Software Engineer"
                        className={inputCls}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Company</label>
                    <input
                        value={exp.company}
                        onChange={(e) => onChange({ ...exp, company: e.target.value })}
                        placeholder="e.g. Acme Corp"
                        className={inputCls}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Start Year</label>
                    <select
                        value={startYear}
                        onChange={(e) => onChange({ ...exp, startDate: `${e.target.value}-01-01` })}
                        className={selectCls}
                    >
                        <option value="">Select year</option>
                        {YEARS.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">End Year</label>
                    <select
                        value={exp.current ? "Present" : endYear}
                        onChange={(e) => {
                            if (e.target.value === "Present") {
                                onChange({ ...exp, current: true, endDate: undefined });
                            } else {
                                onChange({ ...exp, current: false, endDate: `${e.target.value}-01-01` });
                            }
                        }}
                        className={selectCls}
                    >
                        <option value="">Select year</option>
                        <option value="Present">Present</option>
                        {YEARS.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function Step1({
    full_name,
    location,
    bio,
    qualification,
    setFullName,
    setLocation,
    setBio,
    setQualification,
}: {
    full_name: string;
    location: string;
    bio: string;
    qualification: string;
    setFullName: (v: string) => void;
    setLocation: (v: string) => void;
    setBio: (v: string) => void;
    setQualification: (v: string) => void;
}) {
    const inputCls =
        "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Tell us about yourself</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    This helps employers find and evaluate you.
                </p>
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Full Name *</label>
                <input
                    value={full_name}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className={inputCls}
                />
            </div>
            <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <MapPin size={12} />
                    Location *
                </label>
                <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Lilongwe, Malawi"
                    required
                    className={inputCls}
                />
            </div>
            <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <GraduationCap size={12} />
                    Highest Qualification *
                </label>
                <select
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    required
                    className={inputCls}
                >
                    <option value="">Select qualification</option>
                    {QUALIFICATIONS.map((q) => (
                        <option key={q} value={q}>{q}</option>
                    ))}
                </select>
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Professional Bio *
                </label>
                <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="A brief summary of your background, what you do, and what you're looking for…"
                    rows={4}
                    required
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <p className="text-right text-xs text-slate-400">{bio.length} / 500</p>
            </div>
        </div>
    );
}

function Step2({
    education,
    setEducation,
}: {
    education: Education[];
    setEducation: (v: Education[]) => void;
}) {
    const addEntry = () => {
        setEducation([
            ...education,
            { certificate: "", institution: "", startDate: "", endDate: undefined, current: false },
        ]);
    };

    const updateEntry = (idx: number, updated: Education) => {
        const copy = [...education];
        copy[idx] = updated;
        setEducation(copy);
    };

    const removeEntry = (idx: number) => {
        setEducation(education.filter((_, i) => i !== idx));
    };

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Education</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Add your most recent education. You can add more later in your profile.
                </p>
            </div>
            {education.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400 dark:border-slate-700">
                    No education added yet. Click below to add your first role.
                </div>
            )}
            {education.map((edu, idx) => (
                <EducationEntry
                    key={idx}
                    edu={edu}
                    onChange={(updated) => updateEntry(idx, updated)}
                    onRemove={() => removeEntry(idx)}
                />
            ))}
            <button
                type="button"
                onClick={addEntry}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100"
            >
                <Plus size={15} />
                Add Education
            </button>
        </div>
    );
}

function Step3({
    skills,
    seniorityLevel,
    employmentType,
    setSkills,
    setSeniorityLevel,
    setEmploymentType,
}: {
    skills: string[];
    seniorityLevel: string;
    employmentType: string;
    setSkills: (v: string[]) => void;
    setSeniorityLevel: (v: string) => void;
    setEmploymentType: (v: string) => void;
}) {
    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Skills & Level</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Used for AI matching with the right jobs.
                </p>
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Your Skills *</label>
                <SkillTagInput skills={skills} onChange={setSkills} />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Seniority Level *</label>
                <div className="flex flex-wrap gap-2">
                    {SENIORITY_LEVELS.map(({ value, label }) => (
                        <ToggleChip
                            key={value}
                            label={label}
                            selected={seniorityLevel === value}
                            onClick={() => setSeniorityLevel(value)}
                        />
                    ))}
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Employment Type *</label>
                <div className="flex flex-wrap gap-2">
                    {EMPLOYMENT_TYPES.map(({ value, label }) => (
                        <ToggleChip
                            key={value}
                            label={label}
                            selected={employmentType === value}
                            onClick={() => setEmploymentType(value)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function Step4({
    experience,
    setExperience,
}: {
    experience: Experience[];
    setExperience: (v: Experience[]) => void;
}) {
    const addEntry = () => {
        setExperience([
            ...experience,
            { role: "", company: "", startDate: "", endDate: undefined, current: false, description: "" },
        ]);
    };

    const updateEntry = (idx: number, updated: Experience) => {
        const copy = [...experience];
        copy[idx] = updated;
        setExperience(copy);
    };

    const removeEntry = (idx: number) => {
        setExperience(experience.filter((_, i) => i !== idx));
    };

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Work Experience</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Add your most recent roles. You can add more later in your profile.
                </p>
            </div>
            {experience.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400 dark:border-slate-700">
                    No experience added yet. Click below to add your first role.
                </div>
            )}
            {experience.map((exp, idx) => (
                <ExperienceEntry
                    key={idx}
                    exp={exp}
                    onChange={(updated) => updateEntry(idx, updated)}
                    onRemove={() => removeEntry(idx)}
                />
            ))}
            <button
                type="button"
                onClick={addEntry}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100"
            >
                <Plus size={15} />
                Add Role
            </button>
        </div>
    );
}

function Step5({
    salaryExpectation,
    searchIntent,
    profileVisibility,
    setSalaryExpectation,
    setSearchIntent,
    setProfileVisibility,
}: {
    salaryExpectation: string;
    searchIntent: string;
    profileVisibility: string;
    setSalaryExpectation: (v: string) => void;
    setSearchIntent: (v: string) => void;
    setProfileVisibility: (v: string) => void;
}) {
    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Job Preferences</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    We'll use these to surface the most relevant opportunities.
                </p>
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Expected Salary (MWK / Month)
                </label>
                <input
                    type="number"
                    min={0}
                    value={salaryExpectation}
                    onChange={(e) => setSalaryExpectation(e.target.value)}
                    placeholder="e.g. 150,000"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
            </div>
            
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    What are you looking for right now?
                </label>
                <select
                    value={searchIntent}
                    onChange={(e) => setSearchIntent(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                    <option value="ACTIVELY_LOOKING">Actively looking for jobs</option>
                    <option value="OPEN_TO_OFFERS">Open to offers</option>
                    <option value="SEEKING_INTERNSHIP">Seeking an internship or attachment</option>
                    <option value="NOT_LOOKING">Not looking</option>
                </select>
            </div>
            
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Profile Visibility
                </label>
                <select
                    value={profileVisibility}
                    onChange={(e) => setProfileVisibility(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                    <option value="PUBLIC">Public (Employers can see your full profile)</option>
                    <option value="ANONYMOUS">Anonymous (Employers see your skills/experience but not your name)</option>
                    <option value="HIDDEN">Hidden (You will not appear in the discover pool)</option>
                </select>
            </div>
        </div>
    );
}



// ─── Main Component ───────────────────────────────────────────────────────────

export function JobSeekerOnboarding({ me }: { me: NonNullable<MeData> }) {
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);

    // Step 1
    const [full_name, setFullName] = useState(me.jobSeeker?.full_name || "");
    const [location, setLocation] = useState(me.jobSeeker?.location || "");
    const [bio, setBio] = useState(me.jobSeeker?.bio || "");
    const [qualification, setQualification] = useState(me.jobSeeker?.qualification || "");

    // Step 2
    const [education, setEducation] = useState<Education[]>(
        (me.jobSeeker?.education || []) as Education[]
    );

    // Step 3
    const [skills, setSkills] = useState<string[]>(me.jobSeeker?.skills || []);
    const [seniorityLevel, setSeniorityLevel] = useState(me.jobSeeker?.seniorityLevel || "");
    const [employmentType, setEmploymentType] = useState(me.jobSeeker?.employmentType || "");

    // Step 4
    const [experience, setExperience] = useState<Experience[]>(
        (me.jobSeeker?.experience || []) as Experience[]
    );
    // Step 5
    const [salaryExpectation, setSalaryExpectation] = useState(
        me.jobSeeker?.salaryExpectation ? String(me.jobSeeker.salaryExpectation) : ""
    );
    const [searchIntent, setSearchIntent] = useState(me.jobSeeker?.searchIntent || "ACTIVELY_LOOKING");
    const [profileVisibility, setProfileVisibility] = useState(me.jobSeeker?.profileVisibility || "PUBLIC");

    const saveCurrentStep = async (skipSave = false): Promise<boolean> => {
        if (skipSave) return true;
        try {
            await apiFetchJson("/api/profile", {
                method: "PUT",
                body: JSON.stringify({
                    full_name,
                    location,
                    bio,
                    qualification,
                    skills,
                    seniorityLevel: seniorityLevel || undefined,
                    employmentType: employmentType || undefined,
                    salaryExpectation: salaryExpectation ? parseInt(salaryExpectation) : undefined,
                    experience,
                    education,
                }),
            });
            return true;
        } catch (err: any) {
            toast.error(err.message || "Failed to save. Please try again.");
            return false;
        }
    };

    const handleNext = async (skip = false) => {
        // Validate required steps
        if (!skip) {
            if (step === 1) {
                if (!full_name.trim()) return toast.error("Please enter your full name.");
                if (!location.trim()) return toast.error("Please enter your location.");
                if (!qualification) return toast.error("Please select your highest qualification.");
                if (!bio.trim()) return toast.error("Please add a professional bio.");
            }
            if (step === 2) {
                if (education.length === 0) return toast.error("Please add at least one education.");
            }
            if (step === 3) {
                if (skills.length === 0) return toast.error("Please add at least one skill.");
                if (!seniorityLevel) return toast.error("Please select your seniority level.");
                if (!employmentType) return toast.error("Please select an employment type.");
            }
        }

        setSaving(true);
        const shouldSave = !skip; // only save if not skipping
        const ok = await saveCurrentStep(!shouldSave);
        setSaving(false);

        if (!ok) return;

        if (step < 5) {
            setStep(step + 1);
        } else {
            // Final step – always save required fields, then complete
            setSaving(true);
            try {
                if (!skip) {
                    await apiFetchJson("/api/profile", {
                        method: "PUT",
                        body: JSON.stringify({
                            full_name,
                            location,
                            bio,
                            qualification,
                            skills,
                            seniorityLevel: seniorityLevel || undefined,
                            employmentType: employmentType || undefined,
                            salaryExpectation: salaryExpectation ? parseInt(salaryExpectation) : undefined,
                            experience,
                            education,
                            searchIntent,
                            profileVisibility,
                        }),
                    });
                }
                await apiFetchJson("/api/onboarding/complete", { method: "POST" });
                await apiFetch("/api/metrics/track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ eventName: "onboarding_completed", stage: "onboarding", role: "JOB_SEEKER" }),
                }).catch(() => { });
                toast.success("Onboarding complete! Welcome aboard 🎉");
                window.location.assign("/dashboard");
            } catch (err: any) {
                toast.error(err.message || "Could not complete onboarding.");
            } finally {
                setSaving(false);
            }
        }
    };

    const isOptionalStep = step === 4 || step === 5;

    return (
        <div className="mx-auto max-w-xl px-4 py-10">
            <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-8">
                <StepIndicator current={step} />

                {step === 1 && (
                    <Step1
                        full_name={full_name}
                        location={location}
                        bio={bio}
                        qualification={qualification}
                        setFullName={setFullName}
                        setLocation={setLocation}
                        setBio={setBio}
                        setQualification={setQualification}
                    />
                )}
                {step === 2 && (
                    <Step2
                        education={education}
                        setEducation={setEducation}
                    />
                )}
                {step === 3 && (
                    <Step3
                        skills={skills}
                        seniorityLevel={seniorityLevel}
                        employmentType={employmentType}
                        setSkills={setSkills}
                        setSeniorityLevel={setSeniorityLevel}
                        setEmploymentType={setEmploymentType}
                    />
                )}
                {step === 4 && (
                    <Step4
                        experience={experience}
                        setExperience={setExperience}

                    />
                )}
                {step === 5 && (
                    <Step5
                        salaryExpectation={salaryExpectation}
                        searchIntent={searchIntent}
                        profileVisibility={profileVisibility}
                        setSalaryExpectation={setSalaryExpectation}
                        setSearchIntent={setSearchIntent}
                        setProfileVisibility={setProfileVisibility}
                    />
                )}

                <div className="mt-8 flex items-center justify-between gap-3">
                    {step > 1 ? (
                        <button
                            type="button"
                            onClick={() => setStep(step - 1)}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            <ChevronLeft size={16} />
                            Back
                        </button>
                    ) : (
                        <div />
                    )}

                    <div className="flex items-center gap-2">
                        {isOptionalStep && (
                            <button
                                type="button"
                                onClick={() => handleNext(true)}
                                disabled={saving}
                                className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:text-slate-700 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-200"
                            >
                                Skip
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => handleNext(false)}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                        >
                            {saving ? (
                                <Loader2 size={15} className="animate-spin" />
                            ) : step === 5 ? (
                                <>
                                    <Check size={15} />
                                    Finish
                                </>
                            ) : (
                                <>
                                    Continue
                                    <ChevronRight size={15} />
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {isOptionalStep && (
                    <p className="mt-4 text-center text-xs text-slate-400">
                        This step is optional — you can complete it later in your profile settings.
                    </p>
                )}
            </div>
        </div>
    );
}

export function EmployerOnboarding({ me }: { me: NonNullable<MeData> }) {
    const [saving, setSaving] = useState(false);
    const [companyName, setCompanyName] = useState(me.employer?.companyName || "");
    const [industry, setIndustry] = useState(me.employer?.industry || "");
    const [companyLocation, setCompanyLocation] = useState(me.employer?.location || "");

    const inputCls =
        "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await apiFetchJson("/api/employer/profile", {
                method: "PUT",
                body: JSON.stringify({ companyName, industry, location: companyLocation }),
            });
            await apiFetchJson("/api/onboarding/complete", { method: "POST" });
            await apiFetch("/api/metrics/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ eventName: "onboarding_completed", stage: "onboarding", role: "EMPLOYER" }),
            }).catch(() => { });
            toast.success("Onboarding complete");
            window.location.assign("/dashboard");
        } catch (err: any) {
            toast.error(err.message || "Could not complete onboarding.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-xl px-4 py-10">
            <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Set up your company</h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    This helps us personalise your employer dashboard.
                </p>
                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Company name</label>
                        <input
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            required
                            className={inputCls}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Industry</label>
                        <input
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                            required
                            className={inputCls}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Location</label>
                        <input
                            value={companyLocation}
                            onChange={(e) => setCompanyLocation(e.target.value)}
                            required
                            className={inputCls}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
                    >
                        {saving ? <Loader2 size={15} className="animate-spin" /> : "Continue to dashboard"}
                    </button>
                </form>
            </div>
        </div>
    );
}

