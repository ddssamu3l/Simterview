"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [message, setMessage] = useState("Processing your payment...");

  useEffect(() => {
    if (!sessionId) return;

    // Eventually: use sessionId to fetch Stripe details
    console.log("Received session ID:", sessionId);

    // For now: show simple confirmation
    setMessage("✅ Thank you! Your SimCoins will be added shortly.");
  }, [sessionId]);

  return (
    <main className="max-w-xl mx-auto p-6 text-center">
      <h1 className="text-3xl font-bold mb-4">Payment Success</h1>
      <p className="text-lg">{message}</p>
    </main>
  );
}