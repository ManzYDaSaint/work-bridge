"use client";

import { toast } from "sonner";
import { useState } from "react";

export default function CheckoutButton({ priceId }: { priceId: string }) {
    const [isLoading, setIsLoading] = useState(false);

    async function handleCheckout() {
        setIsLoading(true);
        try {
            const response = await fetch("/api/checkout", {
                method: "POST",
                body: JSON.stringify({ priceId }),
            });

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error("Could not initialize payment. Check console.");
                console.error(data);
            }
        } catch (err) {
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <button
            onClick={handleCheckout}
            disabled={isLoading}
            className={`btn btn-primary w-full ${isLoading ? 'loading' : ''}`}
        >
            {isLoading ? "Processing..." : "Subscribe Now"}
        </button>
    );
}
