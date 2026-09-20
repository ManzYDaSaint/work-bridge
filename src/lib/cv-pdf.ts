export interface ExportCVData {
    full_name: string;
    phone?: string;
    location?: string;
    bio?: string;
    qualification?: string;
    skills?: string[];
    experience?: Array<{ title?: string; role?: string; company?: string; duration?: string; startDate?: string; endDate?: string; description?: string }>;
    education?: Array<{ certificate?: string; degree?: string; qualification?: string; institution?: string; year?: string; startDate?: string; endDate?: string }>;
    certificates?: Array<{ title: string; issuer?: string | null; issue_date?: string | null }>;
    hasBadge?: boolean;
}

export function generateCVHTML(data: ExportCVData): string {
    const skillsList = Array.isArray(data.skills) ? data.skills : [];
    const expList = Array.isArray(data.experience) ? data.experience : [];
    const eduList = Array.isArray(data.education) ? data.education : [];
    const certList = Array.isArray(data.certificates) ? data.certificates : [];

    const primaryEdu = eduList.length > 0 ? eduList[0] : null;
    const specificCert = (primaryEdu?.certificate || primaryEdu?.degree || primaryEdu?.qualification || "").trim();
    const displayHeaderQual = specificCert || data.qualification;

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>${data.full_name || "Professional"} - Curriculum Vitae</title>
        <style>
            @page { size: A4; margin: 18mm 20mm; }
            body {
                font-family: Arial, Helvetica, sans-serif;
                color: #111827;
                line-height: 1.6;
                margin: 0;
                padding: 0;
                background: #ffffff;
                font-size: 11pt;
            }
            .cv-title {
                text-align: center;
                font-size: 16pt;
                font-weight: bold;
                text-decoration: underline;
                margin-bottom: 20px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .header-block {
                margin-bottom: 20px;
            }
            .name {
                font-size: 14pt;
                font-weight: bold;
                margin-bottom: 4px;
            }
            .contact-line {
                font-size: 10.5pt;
                color: #374151;
                margin-bottom: 2px;
            }
            .badge-banner {
                margin-top: 8px;
                display: inline-block;
                background: #f59e0b;
                color: #0f172a;
                font-size: 9pt;
                font-weight: bold;
                padding: 3px 10px;
                border-radius: 4px;
                text-transform: uppercase;
            }
            .section {
                margin-top: 22px;
                margin-bottom: 12px;
            }
            .section-title {
                font-size: 11pt;
                font-weight: bold;
                text-transform: uppercase;
                text-decoration: underline;
                margin-bottom: 10px;
                color: #000000;
            }
            .details-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 10px;
            }
            .details-table td {
                padding: 3px 0;
                vertical-align: top;
                font-size: 10.5pt;
            }
            .details-table td.label {
                width: 140px;
                font-weight: bold;
            }
            .details-table td.colon {
                width: 15px;
                font-weight: bold;
            }
            .profile-text {
                font-size: 10.5pt;
                text-align: justify;
                color: #1f2937;
            }
            .edu-item, .exp-item {
                margin-bottom: 14px;
            }
            .item-num {
                font-weight: bold;
                margin-bottom: 4px;
            }
            .duties-title {
                font-weight: bold;
                font-size: 10pt;
                text-transform: uppercase;
                margin-top: 6px;
                margin-bottom: 4px;
                text-decoration: underline;
            }
            .bullet-list {
                margin: 4px 0 10px 18px;
                padding: 0;
                list-style-type: square;
            }
            .bullet-list li {
                margin-bottom: 3px;
                font-size: 10pt;
            }
            .skills-list {
                margin: 4px 0 10px 18px;
                padding: 0;
                list-style-type: square;
            }
            .skills-list li {
                margin-bottom: 4px;
                font-size: 10.5pt;
            }
            .footer {
                margin-top: 35px;
                border-top: 1px solid #d1d5db;
                padding-top: 8px;
                font-size: 8.5pt;
                color: #6b7280;
                display: flex;
                justify-content: space-between;
            }
        </style>
    </head>
    <body>
        <div class="cv-title">CURRICULUM VITAE</div>

        <div class="header-block">
            <div class="name">${data.full_name || "Job Seeker"}</div>
            ${data.location ? `<div class="contact-line">${data.location}</div>` : ""}
            ${data.phone ? `<div class="contact-line"><strong>Cell:</strong> ${data.phone}</div>` : ""}
            ${displayHeaderQual ? `<div class="contact-line"><strong>Qualification:</strong> ${displayHeaderQual}</div>` : ""}
            ${data.hasBadge ? '<div class="badge-banner">✔ Aganyu Verified Candidate</div>' : ""}
        </div>

        ${(data.location || displayHeaderQual) ? `
        <div class="section">
            <div class="section-title">PERSONAL DETAILS:</div>
            <table class="details-table">
                ${data.location ? `<tr><td class="label">Location / Address</td><td class="colon">:</td><td>${data.location}</td></tr>` : ""}
                ${displayHeaderQual ? `<tr><td class="label">Highest Qualification</td><td class="colon">:</td><td>${displayHeaderQual}</td></tr>` : ""}
                <tr><td class="label">Status</td><td class="colon">:</td><td>Verified Candidate</td></tr>
            </table>
        </div>
        ` : ""}

        ${data.bio ? `
        <div class="section">
            <div class="section-title">PERSONAL PROFILE:</div>
            <div class="profile-text">${data.bio}</div>
        </div>
        ` : ""}

        ${eduList.length > 0 ? `
        <div class="section">
            <div class="section-title">ACADEMIC QUALIFICATIONS:</div>
            ${eduList.map((item, idx) => {
                const certName = (item.certificate || item.degree || item.qualification || "Qualification").trim();
                const period = item.year || (item.startDate ? `${item.startDate}${item.endDate ? ` – ${item.endDate}` : " – Present"}` : "");
                const romanNumeral = ["I", "II", "III", "IV", "V", "VI", "VII"][idx] || `${idx + 1}`;
                return `
                <div class="edu-item">
                    <table class="details-table">
                        <tr>
                            <td class="label">${romanNumeral}. Qualification</td>
                            <td class="colon">:</td>
                            <td><strong>${certName}</strong></td>
                        </tr>
                        ${period ? `<tr><td class="label">&nbsp;&nbsp;&nbsp;Year / Period</td><td class="colon">:</td><td>${period}</td></tr>` : ""}
                        ${item.institution ? `<tr><td class="label">&nbsp;&nbsp;&nbsp;Institution</td><td class="colon">:</td><td>${item.institution}</td></tr>` : ""}
                    </table>
                </div>
            `;
            }).join("")}
        </div>
        ` : ""}

        ${expList.length > 0 ? `
        <div class="section">
            <div class="section-title">WORK HISTORY AND EXPERIENCE:</div>
            ${expList.map((item, idx) => {
                const roleName = (item.role || item.title || "Role").trim();
                const period = item.duration || (item.startDate ? `${item.startDate}${item.endDate ? ` – ${item.endDate}` : " – Present"}` : "");
                const letter = String.fromCharCode(65 + idx);
                
                let duties: string[] = [];
                if (item.description) {
                    duties = item.description.split(/\n|•|❖|-/).map(d => d.trim()).filter(Boolean);
                }

                return `
                <div class="exp-item">
                    <table class="details-table">
                        <tr>
                            <td class="label">${letter}. Position</td>
                            <td class="colon">:</td>
                            <td><strong>${roleName}</strong></td>
                        </tr>
                        ${item.company ? `<tr><td class="label">&nbsp;&nbsp;&nbsp;Employer</td><td class="colon">:</td><td>${item.company}</td></tr>` : ""}
                        ${period ? `<tr><td class="label">&nbsp;&nbsp;&nbsp;Period</td><td class="colon">:</td><td>${period}</td></tr>` : ""}
                    </table>
                    ${duties.length > 0 ? `
                        <div class="duties-title">DUTIES AND RESPONSIBILITIES:</div>
                        <ul class="bullet-list">
                            ${duties.map(d => `<li>${d}</li>`).join("")}
                        </ul>
                    ` : ""}
                </div>
            `;
            }).join("")}
        </div>
        ` : ""}

        ${skillsList.length > 0 ? `
        <div class="section">
            <div class="section-title">PERSONAL SKILLS AND QUALITIES:</div>
            <ul class="skills-list">
                ${skillsList.map(s => `<li>${s}</li>`).join("")}
            </ul>
        </div>
        ` : ""}

        ${certList.length > 0 ? `
        <div class="section">
            <div class="section-title">VERIFIED CERTIFICATIONS & CREDENTIALS:</div>
            ${certList.map((c, idx) => `
                <table class="details-table">
                    <tr>
                        <td class="label">${idx + 1}. Certificate</td>
                        <td class="colon">:</td>
                        <td><strong>${c.title}</strong> ${c.issuer ? `(${c.issuer})` : ""}</td>
                    </tr>
                    ${c.issue_date ? `<tr><td class="label">&nbsp;&nbsp;&nbsp;Date Issued</td><td class="colon">:</td><td>${c.issue_date}</td></tr>` : ""}
                </table>
            `).join("")}
        </div>
        ` : ""}

        <div class="footer">
            <span>Aganyu Talent Marketplace • Verified Malawian Candidate Profile</span>
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
