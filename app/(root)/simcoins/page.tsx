"use client";

import { useState } from "react";

// If you're not using a design system like shadcn/ui, this simple button will do:
function Button({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
    >
      {children}
    </button>
  );
}

// Define the available bundles
const bundles = [
  {
    name: "Starter",
    simcoins: 60,
    price: "$5",
    priceId: "price_1RP71RR45bGJSB8tedtkHfcj", // 🔁 Replace with your real Stripe price ID
  },
  {
    name: "Pro",
    simcoins: 150,
    price: "$12",
    priceId: "price_1RP74TR45bGJSB8tVsKVCLmD", // 🔁 Replace with your real Stripe price ID
  },
  {
    name: "Elite",
    simcoins: 400,
    price: "$30",
    priceId: "price_1RP75DR45bGJSB8tngIomfhM", // 🔁 Replace with your real Stripe price ID
  },
];

export default function SimCoinPage() {
  const [loading, setLoading] = useState(false);

  const handleBuy = async (priceId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // redirect to Stripe Checkout
      } else {
        alert("Checkout failed.");
        setLoading(false);
      }
    } catch (err) {
      alert("Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Purchase SimCoins</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {bundles.map((bundle) => (
          <div key={bundle.name} className="border p-4 rounded shadow text-center">
            <h2 className="text-xl font-semibold mb-2">{bundle.name}</h2>
            <p className="text-sm text-gray-500 mb-1">{bundle.simcoins} SimCoins</p>
            <p className="text-2xl font-bold mb-4">{bundle.price}</p>
            <Button onClick={() => handleBuy(bundle.priceId)}>
              {loading ? "Loading..." : "Buy Now"}
            </Button>
          </div>
        ))}
      </div>
    </main>
  );
}