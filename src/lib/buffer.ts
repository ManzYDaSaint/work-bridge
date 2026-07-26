/**
 * Buffer API client (GraphQL)
 * Endpoint: https://api.buffer.com
 * Auth: Bearer token via BUFFER_API_KEY
 * Docs: https://developers.buffer.com
 */

const BUFFER_API_URL = "https://api.buffer.com";

function getApiKey(): string {
    const key = process.env.BUFFER_API_KEY;
    if (!key) throw new Error("[Buffer] BUFFER_API_KEY is not set.");
    return key;
}

async function bufferQuery<T = any>(
    query: string,
    variables?: Record<string, unknown>
): Promise<T> {
    const res = await fetch(BUFFER_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`[Buffer] HTTP ${res.status}: ${text}`);
    }

    const json = await res.json();

    if (json.errors?.length) {
        throw new Error(`[Buffer] GraphQL error: ${JSON.stringify(json.errors)}`);
    }

    return json.data as T;
}

// ──────────────────────────────────────────────────────────────────────────────
// Queries
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Returns the first organization ID on the account.
 * Buffer Free plan has exactly one organisation.
 */
export async function getBufferOrganizationId(): Promise<string> {
    const data = await bufferQuery<{
        account: { organizations: { id: string; name: string }[] };
    }>(`
        query GetOrganizations {
            account {
                organizations {
                    id
                    name
                }
            }
        }
    `);

    const orgs = data.account?.organizations;
    if (!orgs?.length) throw new Error("[Buffer] No organisations found on this account.");
    return orgs[0].id;
}

/**
 * Returns all connected channels for the given organisation.
 */
export async function getBufferChannels(organizationId: string): Promise<
    { id: string; name: string; service: string }[]
> {
    const data = await bufferQuery<{
        channels: { id: string; name: string; service: string }[];
    }>(
        `
        query GetChannels($orgId: OrganizationId!) {
            channels(input: { organizationId: $orgId }) {
                id
                name
                service
            }
        }
    `,
        { orgId: organizationId }
    );

    return data.channels ?? [];
}

// ──────────────────────────────────────────────────────────────────────────────
// Mutations
// ──────────────────────────────────────────────────────────────────────────────

export interface BufferPostResult {
    success: boolean;
    postId?: string;
    dueAt?: string;
    errorMessage?: string;
}

/**
 * Creates a post on a single Buffer channel and adds it to the queue.
 * @param channelId  Buffer channel ID (LinkedIn page or Facebook page)
 * @param text       Post body text
 */
export async function createBufferPost(
    channelId: string,
    text: string,
    metadata?: Record<string, unknown>
): Promise<BufferPostResult> {
    const data = await bufferQuery<{
        createPost:
            | { post: { id: string; text: string; dueAt: string } }
            | { message: string };
    }>(
        `
        mutation CreateJobPost($channelId: ChannelId!, $text: String!, $metadata: PostInputMetaData) {
            createPost(input: {
                text: $text
                channelId: $channelId
                schedulingType: automatic
                mode: shareNow
                metadata: $metadata
            }) {
                ... on PostActionSuccess {
                    post {
                        id
                        text
                        dueAt
                    }
                }
                ... on MutationError {
                    message
                }
            }
        }
    `,
        { channelId, text, metadata: metadata ?? null }
    );

    const result = data.createPost;

    // PostActionSuccess
    if ("post" in result && result.post) {
        return { success: true, postId: result.post.id, dueAt: result.post.dueAt };
    }

    // MutationError
    const errorMessage = "message" in result ? result.message : "Unknown error";
    return { success: false, errorMessage };
}

/**
 * Posts a job to all configured Buffer channels (LinkedIn + Facebook Pages).
 *
 * Channel IDs are read from env vars:
 *   BUFFER_LINKEDIN_CHANNEL_ID  — your LinkedIn Page channel
 *   BUFFER_FACEBOOK_CHANNEL_ID  — your Facebook Page channel
 *
 * Both are optional; whichever is set will receive the post.
 */
export async function postJobToBuffer(job: {
    title: string;
    companyName?: string | null;
    location?: string | null;
    workMode?: string | null;
    jobType?: string | null;
    salaryRange?: string | null;
    publicSlug?: string | null;
    id: string;
}): Promise<{ linkedin?: BufferPostResult; facebook?: BufferPostResult }> {
    const APP_URL = (
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_URL ||
        "https://aganyu.com"
    ).replace(/\/$/, "");

    const jobPath = job.publicSlug || job.id;
    const jobUrl = `${APP_URL}/jobs/${jobPath}?utm_source=buffer&utm_medium=social&utm_campaign=job_share`;

    const formatMode = (v?: string | null) =>
        v ? v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null;

    const lines = [
        `🚀 New Opportunity: ${job.title}`,
        job.companyName ? `🏢 ${job.companyName}` : null,
        job.location ? `📍 ${job.location}` : null,
        formatMode(job.workMode) ? `🏠 ${formatMode(job.workMode)}` : null,
        formatMode(job.jobType) ? `📋 ${formatMode(job.jobType)}` : null,
        job.salaryRange ? `💰 ${job.salaryRange}` : null,
        ``,
        `Apply now on Aganyu 👇`,
        jobUrl,
        ``,
        `#Jobs #Hiring #Aganyu${job.location ? ` #${job.location.replace(/\s+/g, "")}Jobs` : ""}`,
    ]
        .filter((l) => l !== null)
        .join("\n");

    const results: { linkedin?: BufferPostResult; facebook?: BufferPostResult } = {};

    const linkedInChannelId = process.env.BUFFER_LINKEDIN_CHANNEL_ID;
    const facebookChannelId = process.env.BUFFER_FACEBOOK_CHANNEL_ID;

    if (linkedInChannelId) {
        try {
            results.linkedin = await createBufferPost(linkedInChannelId, lines);
        } catch (err: any) {
            results.linkedin = { success: false, errorMessage: err.message };
        }
    }

    if (facebookChannelId) {
        try {
            results.facebook = await createBufferPost(facebookChannelId, lines, {
                facebook: { type: "post" },
            });
        } catch (err: any) {
            results.facebook = { success: false, errorMessage: err.message };
        }
    }

    return results;
}

/**
 * Posts a FEATURED opportunity to all configured Buffer channels (LinkedIn + Facebook Pages).
 * Uses the same channel env vars as postJobToBuffer — no extra configuration needed.
 */
export async function postOpportunityToBuffer(opportunity: {
    id: string;
    title: string;
    organization_name: string;
    category: string;
    slug: string | null;
    deadline?: string | null;
    funding_amount?: string | null;
    country?: string | null;
}): Promise<{ linkedin?: BufferPostResult; facebook?: BufferPostResult }> {
    const APP_URL = (
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_URL ||
        "https://aganyu.com"
    ).replace(/\/$/, "");

    const opportunityPath = opportunity.slug || opportunity.id;
    const opportunityUrl = `${APP_URL}/opportunities/${opportunityPath}?utm_source=buffer&utm_medium=social&utm_campaign=opportunity_share`;

    const categoryEmoji: Record<string, string> = {
        SCHOLARSHIP: "🎓",
        GRANT: "💰",
        FUNDING: "💸",
        TRAINING: "📚",
        CERTIFICATION: "🏆",
        FELLOWSHIP: "🌍",
        INTERNSHIP: "🏢",
        CAREER_PROGRAM: "🚀",
    };

    const emoji = categoryEmoji[opportunity.category] || "✨";
    const categoryLabel = opportunity.category.replace(/_/g, " ");

    const deadlineText = opportunity.deadline
        ? `\n⏰ Deadline: ${new Date(opportunity.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
        : "";

    const fundingText = opportunity.funding_amount
        ? `\n💰 Funding: ${opportunity.funding_amount}`
        : "";

    const locationText = opportunity.country ? `\n📍 ${opportunity.country}` : "";

    const lines = [
        `${emoji} New ${categoryLabel}: ${opportunity.title}`,
        `🏛 ${opportunity.organization_name}`,
        locationText,
        fundingText,
        deadlineText,
        ``,
        `Discover & apply via Aganyu 👇`,
        opportunityUrl,
        ``,
        `#${categoryLabel.replace(/\s+/g, "")} #CareerGrowth #Aganyu #Opportunities`,
    ]
        .filter((l) => l !== null)
        .join("\n");

    const results: { linkedin?: BufferPostResult; facebook?: BufferPostResult } = {};

    const linkedInChannelId = process.env.BUFFER_LINKEDIN_CHANNEL_ID;
    const facebookChannelId = process.env.BUFFER_FACEBOOK_CHANNEL_ID;

    if (linkedInChannelId) {
        try {
            results.linkedin = await createBufferPost(linkedInChannelId, lines);
        } catch (err: any) {
            results.linkedin = { success: false, errorMessage: err.message };
        }
    }

    if (facebookChannelId) {
        try {
            results.facebook = await createBufferPost(facebookChannelId, lines, {
                facebook: { type: "post" },
            });
        } catch (err: any) {
            results.facebook = { success: false, errorMessage: err.message };
        }
    }

    return results;
}

