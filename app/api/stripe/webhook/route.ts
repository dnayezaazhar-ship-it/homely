import Stripe from "stripe";
import { logStripeError } from "../../../../lib/stripe-server";

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  if (!secretKey || !webhookSecret) {
    console.error("Stripe webhook is not configured", {
      hasSecretKey: Boolean(secretKey),
      hasWebhookSecret: Boolean(webhookSecret),
    });
    return Response.json({ error: "Stripe webhook is not configured." }, { status: 500 });
  }

  if (!signature) return Response.json({ error: "Missing Stripe signature." }, { status: 400 });

  try {
    const stripe = new Stripe(secretKey);
    // V2 webhook destinations should use thin events. Verify the raw request
    // body before trusting the event ID or type from Stripe.
    const event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);

    const eventType = event.type as string;
    const isCheckoutCompleted = eventType === "checkout.session.completed" || eventType === "checkout.session.async_payment_succeeded";
    const isAccountUpdate = eventType === "v2.core.account[requirements].updated" || (eventType.includes("v2.core.account[") && eventType.includes("capability_status_updated"));

    console.info("Stripe webhook received", {
      eventId: event.id,
      eventType: event.type,
      livemode: event.livemode,
      action: isCheckoutCompleted ? "fulfill_order" : isAccountUpdate ? "refresh_account_requirements" : "acknowledge",
    });

    if (isAccountUpdate) {
      // Thin events contain only an ID/type. Fetch the current event so a
      // worker can inspect the updated account requirements and capabilities.
      const fullEvent = await stripe.v2.core.events.retrieve(event.id);
      console.info("Stripe Connect account update retrieved", { eventId: fullEvent.id, eventType: fullEvent.type });
    }

    return Response.json({ received: true });
  } catch (error) {
    logStripeError("Stripe webhook handling failed", error);
    return Response.json({ error: "Invalid Stripe webhook." }, { status: 400 });
  }
}