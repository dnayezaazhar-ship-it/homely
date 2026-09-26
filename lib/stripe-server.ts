import Stripe from "stripe";

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is missing. Add it to .env.local for the Next.js server, for example: STRIPE_SECRET_KEY=sk_test_... (placeholder only).");
  }

  // Keep every Stripe request behind one client instance. The SDK selects the
  // current API version automatically, so application code does not pin it.
  return new Stripe(secretKey);
}

export function getAppUrl(request: Request) {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin).replace(/\/$/, "");
}

export function stripeErrorMessage(error: unknown) {
  if (error instanceof Stripe.errors.StripeError) {
    return [error.type, error.code, error.message, error.requestId].filter(Boolean).join(": ");
  }
  return error instanceof Error ? error.message : "Unknown Stripe error";
}

export function logStripeError(label: string, error: unknown, context: Record<string, unknown> = {}) {
  console.error(label, {
    ...context,
    details: stripeErrorMessage(error),
    hasSecretKey: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    keyMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test_or_unknown",
  });
}

export function applicationFeeAmount(unitAmount: number) {
  const percent = Number(process.env.STRIPE_APPLICATION_FEE_PERCENT ?? "10");
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new Error("STRIPE_APPLICATION_FEE_PERCENT must be a number from 0 to 100 (default: 10).");
  }
  return Math.floor(unitAmount * percent / 100);
}