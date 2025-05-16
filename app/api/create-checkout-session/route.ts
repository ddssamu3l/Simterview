// app/api/create-checkout-session.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
});


//sim coin elite: prod_SJkaG3X80Thz0U
//sim coin pro: prod_SJkZSgqJQ7ttyV
//sim coin starter: prod_SJkWmvkB9es9RJ

export async function POST(req: Request) {
    try {
      const { priceId } = await req.json();
  
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancelled`,
      });
  
      return new Response(JSON.stringify({ url: session.url }), { status: 200 });
    } catch (err: any) {
      console.error("Stripe error:", err);
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }