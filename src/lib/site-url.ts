const DEFAULT_SITE_URL = "https://aganyu.com";

export function getSiteUrl(fallback = DEFAULT_SITE_URL) {
    const configuredUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_URL ||
        fallback;

    const urlWithProtocol = configuredUrl.includes("://")
        ? configuredUrl
        : `https://${configuredUrl}`;

    try {
        return new URL(urlWithProtocol).origin;
    } catch {
        return fallback;
    }
}

export function getSiteUrlObject(fallback = DEFAULT_SITE_URL) {
    return new URL(getSiteUrl(fallback));
}
