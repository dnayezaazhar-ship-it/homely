import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

async function getStripeAccountId() {
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  if (token) convex.setAuth(token);
  return await convex.query(api.myFunctions.getStripeAccountId, {});
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "You must be signed in." }, { status: 401 });
    if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: "Stripe is not configured." }, { status: 503 });

    const stripeAccountId = await getStripeAccountId();
    if (!stripeAccountId) {
      return Response.json({ accountCreated: false, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const account = await stripe.v2.core.accounts.retrieve(stripeAccountId, {
      include: ["configuration.merchant", "configuration.recipient", "requirements"],
    });
    const merchant = account.configuration?.merchant;
    const requirements = account.requirements?.entries ?? [];
    return Response.json({
      accountCreated: true,
      detailsSubmitted: Boolean(account.requirements && !requirements.some((entry) => entry.awaiting_action_from === "user")),
      chargesEnabled: merchant?.capabilities?.card_payments?.status === "active",
      payoutsEnabled: merchant?.capabilities?.stripe_balance?.payouts?.status === "active",
    });
  } catch (error) {
    const details = error instanceof Stripe.errors.StripeError
      ? [error.type, error.code, error.message, error.requestId].filter(Boolean).join(": ")
      : error instanceof Error ? error.message : "Unknown Stripe error";
    console.error("Stripe Connect status failed", {
      details,
      hasSecretKey: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
      keyMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test_or_unknown",
    });
    return Response.json({ error: `We could not load your Stripe status: ${details}` }, { status: 502 });
  }
}
