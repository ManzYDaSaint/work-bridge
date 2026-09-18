export interface ExportCVData {
    full_name: string;
    phone?: string;
    location?: string;
    bio?: string;
    qualification?: string;
    skills?: string[];
    experience?: Array<{ title?: string; company?: string; duration?: string; description?: string }>;
    education?: Array<{ degree?: string; institution?: string; year?: string }>;
    certificates?: Array<{ title: string; issuer?: string | null; issue_date?: string | null }>;
    hasBadge?: boolean;
}

export function generateCVHTML(data: ExportCVData): string {
    const skillsList = Array.isArray(data.skills) ? data.skills : [];
    const expList = Array.isArray(data.experience) ? data.experience : [];
    const eduList = Array.isArray(data.education) ? data.education : [];
    const certList = Array.isArray(data.certificates) ? data.certificates : [];

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>${data.full_name || "Professional"} - Aganyu Verified CV</title>
        <style>
            @page { size: A4; margin: 18mm; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                color: #1e293b;
                line-height: 1.5;
                margin: 0;
                padding: 0;
                background: #ffffff;
            }
            .header {
                border-bottom: 2px solid #0f172a;
                padding-bottom: 12px;
                margin-bottom: 16px;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
            }
            .name {
                font-size: 24px;
                font-weight: 800;
                color: #0f172a;
                margin: 0 0 4px 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .contact {
                font-size: 11px;
                color: #475569;
            }
            .badge {
                background: #f59e0b;
                color: #0f172a;
                font-size: 10px;
                font-weight: 800;
                padding: 3px 8px;
                border-radius: 4px;
                text-transform: uppercase;
                display: inline-block;
            }
            .section {
                margin-bottom: 16px;
            }
            .section-title {
                font-size: 12px;
                font-weight: 800;
                color: #0f172a;
                text-transform: uppercase;
                letter-spacing: 1px;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 4px;
                margin-bottom: 8px;
            }
            .bio {
                font-size: 11px;
                color: #334155;
            }
            .skills-container {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }
            .skill-tag {
                background: #f1f5f9;
                color: #334155;
                font-size: 10px;
                font-weight: 600;
                padding: 4px 8px;
                border-radius: 4px;
                border: 1px solid #cbd5e1;
            }
            .item {
                margin-bottom: 10px;
            }
            .item-header {
                display: flex;
                justify-content: space-between;
                font-size: 11px;
                font-weight: 700;
                color: #0f172a;
            }
            .item-sub {
                font-size: 10.5px;
                color: #64748b;
            }
            .item-desc {
                font-size: 10.5px;
                color: #334155;
                margin-top: 3px;
            }
            .footer {
                margin-top: 24px;
                border-top: 1px solid #e2e8f0;
                padding-top: 8px;
                font-size: 9px;
                color: #94a3b8;
                display: flex;
                justify-content: space-between;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                <h1 class="name">${data.full_name || "Job Seeker"}</h1>
                <div class="contact">
                    ${data.location ? `<span>📍 ${data.location}</span> &nbsp;•&nbsp; ` : ""}
                    ${data.phone ? `<span>📞 ${data.phone}</span> &nbsp;•&nbsp; ` : ""}
                    ${data.qualification ? `<span>🎓 ${data.qualification}</span>` : ""}
                </div>
            </div>
            ${data.hasBadge ? '<div class="badge">✔ Aganyu Verified Candidate</div>' : ""}
        </div>

        ${data.bio ? `
        <div class="section">
            <div class="section-title">Professional Summary</div>
            <div class="bio">${data.bio}</div>
        </div>
        ` : ""}

        ${skillsList.length > 0 ? `
        <div class="section">
            <div class="section-title">Core Competencies & Skills</div>
            <div class="skills-container">
                ${skillsList.map(s => `<span class="skill-tag">${s}</span>`).join("")}
            </div>
        </div>
        ` : ""}

        ${expList.length > 0 ? `
        <div class="section">
            <div class="section-title">Work Experience</div>
            ${expList.map(item => `
                <div class="item">
                    <div class="item-header">
                        <span>${item.title || "Role"}</span>
                        <span>${item.duration || ""}</span>
                    </div>
                    <div class="item-sub">${item.company || ""}</div>
                    ${item.description ? `<div class="item-desc">${item.description}</div>` : ""}
                </div>
            `).join("")}
        </div>
        ` : ""}

        ${eduList.length > 0 ? `
        <div class="section">
            <div class="section-title">Education & Academic Qualifications</div>
            ${eduList.map(item => `
                <div class="item">
                    <div class="item-header">
                        <span>${item.degree || item.institution || "Qualification"}</span>
                        <span>${item.year || ""}</span>
                    </div>
                    <div class="item-sub">${item.institution || ""}</div>
                </div>
            `).join("")}
        </div>
        ` : ""}

        ${certList.length > 0 ? `
        <div class="section">
            <div class="section-title">Verified Certifications</div>
            ${certList.map(c => `
                <div class="item">
                    <div class="item-header">
                        <span>📜 ${c.title}</span>
                        <span>${c.issue_date || ""}</span>
                    </div>
                    ${c.issuer ? `<div class="item-sub">Issued by: ${c.issuer}</div>` : ""}
                </div>
            `).join("")}
        </div>
        ` : ""}

        <div class="footer">
            <span>Aganyu Talent Marketplace • Verified Candidate Profile</span>
            <span>Generated on ${new Date().toLocaleDateString()}</span>
        </div>

        <script>
            window.onload = function() {
                window.print();
            };
        </script>
    </body>
    </html>
    `;
}
