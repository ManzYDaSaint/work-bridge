export async function verifyTurnstileToken(token: string) {
  if (!token) {
    throw new Error("Turnstile token is missing");
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.error("TURNSTILE_SECRET_KEY is not configured in environment variables");
    throw new Error("Server configuration error");
  }

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      const errorMsg = data["error-codes"]?.join(", ") || "Invalid Turnstile token";
      throw new Error(`Turnstile verification failed: ${errorMsg}`);
    }

    return true;
  } catch (error) {
    console.error("Turnstile verification error:", error);
    throw error;
  }
}
