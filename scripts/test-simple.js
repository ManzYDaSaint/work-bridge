const { Resend } = require("resend");
const path = require("path");
const fs = require("fs");

// Manually load .env.local
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach(line => {
        const [key, value] = line.split("=");
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

async function testEmail() {
    const email = "manzyn@outlook.com";
    console.log(`Sending to ${email}...`);

    try {
        const response = await resend.emails.send({
            from: "WorkBridge <onboarding@resend.dev>",
            to: [email],
            subject: "WorkBridge Welcome Test 🚀",
            html: `<h1>Welcome to WorkBridge</h1><p>This is a manual test email sent to verify the system.</p>`,
        });

        // Log to a file to avoid terminal truncation
        const logData = {
            timestamp: new Date().toISOString(),
            status: response.error ? "Error" : "Success",
            data: response.data,
            error: response.error
        };
        fs.writeFileSync(path.resolve(__dirname, "email-log.json"), JSON.stringify(logData, null, 2));

        console.log("Result saved to scripts/email-log.json");
        console.log("Immediate Response:", JSON.stringify(response, null, 2));
    } catch (error) {
        console.error("Critical Exception:", error);
    }
}

testEmail();
