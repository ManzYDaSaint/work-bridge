"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function SeekerPaymentToast() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const payment = searchParams.get("payment");
        if (payment === "badge_success") toast.success("Aganyu Badge Activated");
        else if (payment === "plus_success") toast.success("Aganyu Plus Activated");
        else if (payment === "success") toast.success("Payment successful");
    }, [searchParams]);

    return null;
}
