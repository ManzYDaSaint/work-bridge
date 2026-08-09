/**
 * Cleans and formats job descriptions for better readability.
 * Decodes HTML entities and normalizes whitespace.
 */
export function formatDescription(description: string): string {
    if (!description) return "";

    // 1. Decode common HTML entities
    let cleaned = description
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#038;/g, "&")
        .replace(/&#8217;/g, "'")
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/&#8211;/g, "-")
        .replace(/&#8212;/g, "—");

    // 2. Strip HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, "\n");

    // 3. Normalize whitespace: reduce multiple spaces/newlines to single
    cleaned = cleaned
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join("\n\n");

    return cleaned.trim();
}
