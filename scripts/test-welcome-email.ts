import { sendWelcomeEmail } from "../src/lib/resend";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function testWelcomeEmail() {
    const email = "manzyn955@gmail.com";
    const name = "Manzy";

    console.log(`Attempting to send welcome email to ${email}...`);

    // Ensure RESEND_API_KEY is present
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_dummy_key") {
        console.error("Error: RESEND_API_KEY is not set correctly in .env.local");
        return;
    }

    const result = await sendWelcomeEmail(email, name);

    if (result.success) {
        console.log("Success! Email sent via Resend.");
        console.log("Response data:", JSON.stringify(result.data, null, 2));
    } else {
        console.error("Failed to send email.");
        console.error("Error details:", result.error);
    }
}

testWelcomeEmail();
