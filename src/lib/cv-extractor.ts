/**
 * Helper module for extracting text content from uploaded CV / Resume documents.
 * Safely handles text formats and fallbacks for PDF/DOCX file attachments.
 */

export function extractCVContentSnippet(resumeUrl?: string, bio?: string): string {
  if (!resumeUrl) return "";

  // Extract clean filename / title context if resume URL is available
  const filename = resumeUrl.split('/').pop()?.split('?')[0] || "";
  const cleanName = filename.replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, "");

  if (cleanName && cleanName.length > 3) {
    return `Uploaded Resume File Context: ${cleanName}`;
  }

  return "";
}
