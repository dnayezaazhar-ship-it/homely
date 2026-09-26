import { getAppUrl, getStripeClient, applicationFeeAmount, logStripeError } from "../../../../lib/stripe-server";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { productId?: unknown };
    const productId = typeof body.productId === "string" ? body.productId : "";
    if (!productId || !/^prod_/.test(productId)) return Response.json({ error: "Choose a valid product." }, { status: 400 });

    const stripe = getStripeClient();
    const product = await stripe.products.retrieve(productId, { expand: ["default_price"] });
    const accountId = product.metadata.stripeAccountId;
    const price = typeof product.default_price === "object" ? product.default_price : null;
    if (!accountId || !price?.id || !price.unit_amount) return Response.json({ error: "This product is missing its connected host or price." }, { status: 400 });

    // Read the connected account directly before charging. This prevents a
    // product from routing money to an account that has lost transfer access.
    const account = await stripe.v2.core.accounts.retrieve(accountId, { include: ["configuration.recipient", "requirements"] });
    const transfersReady = account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === "active";
    if (!transfersReady) return Response.json({ error: "This host is not ready to receive payments yet." }, { status: 409 });

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: price.id, quantity: 1 }],
      payment_intent_data: { application_fee_amount: applicationFeeAmount(price.unit_amount), transfer_data: { destination: accountId } },
      mode: "payment",
      integration_identifier: `homely_store_${Math.random().toString(36).slice(2, 10)}`,
      success_url: `${getAppUrl(request)}/storefront?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getAppUrl(request)}/storefront?purchase=cancelled`,
    });
    return Response.json({ url: session.url });
  } catch (error) {
    logStripeError("Stripe Checkout creation failed", error);
    return Response.json({ error: "We could not start checkout. The host may need to finish Connect onboarding." }, { status: 502 });
  }
}