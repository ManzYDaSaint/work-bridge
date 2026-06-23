export function organizationSchema(siteUrl: string) {
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "Aganyu",
        url: siteUrl,
        logo: `${siteUrl}/logo-black.svg`,
        sameAs: ["https://twitter.com/aganyu_mw"],
    };
}

export function websiteSchema(siteUrl: string) {
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "Aganyu",
        url: siteUrl,
        publisher: { "@id": `${siteUrl}/#organization` },
        potentialAction: {
            "@type": "SearchAction",
            target: `${siteUrl}/jobs?q={search_term_string}`,
            "query-input": "required name=search_term_string",
        },
    };
}
