/**
 * Utility to format and validate Malawian phone numbers.
 * Converts local inputs (e.g. "0993533315", "888123456", "265993533315")
 * into standard E.164 format: "+265993533315".
 */
export function formatMalawiPhone(input: string): { formatted: string; isValid: boolean; error?: string } {
    if (!input || !input.trim()) {
        return { formatted: "", isValid: false, error: "Phone number is required." };
    }

    // Clean all non-digit characters except leading plus
    let cleaned = input.trim().replace(/[^\d+]/g, "");

    if (cleaned.startsWith("+")) {
        cleaned = cleaned.substring(1);
    }

    // Handle local numbers starting with 0 (e.g., 099..., 088..., 098...)
    if (cleaned.startsWith("0") && cleaned.length === 10) {
        cleaned = "265" + cleaned.substring(1);
    }

    // Handle 9-digit local numbers starting with 9 or 8 (e.g., 993533315)
    if ((cleaned.startsWith("9") || cleaned.startsWith("8")) && cleaned.length === 9) {
        cleaned = "265" + cleaned;
    }

    // Standard Malawi mobile numbers are 12 digits including country code 265 (265 + 9 digits)
    const isValid = /^265[89]\d{8}$/.test(cleaned);

    return {
        formatted: `+${cleaned}`,
        isValid,
        error: isValid ? undefined : "Please enter a valid Malawian phone number (e.g. +265 99 353 3315 or 0993533315)"
    };
}
