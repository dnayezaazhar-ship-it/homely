import Stripe from "stripe";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

function appUrl(request: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return configuredUrl || new URL(request.url).origin;
}

function stripeErrorDetails(error: unknown) {
  if (error instanceof Stripe.errors.StripeError) {
    return [error.type, error.code, error.message, error.requestId].filter(Boolean).join(": ");
  }
  return error instanceof Error ? error.message : "Unknown Stripe error";
}

function accountCountry() {
  const country = (process.env.STRIPE_ACCOUNT_COUNTRY ?? "US").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) throw new Error("STRIPE_ACCOUNT_COUNTRY must be a two-letter ISO country code.");
  return country;
}

async function getAuthenticatedConvexClient() {
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  if (token) client.setAuth(token);
  return client;
}

async function createOnboardingLink(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.redirect(new URL(`/sign-in?redirect_url=${encodeURIComponent("/host")}`, request.url));
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    console.error("Stripe Connect onboarding unavailable: STRIPE_SECRET_KEY is missing from the Next.js server environment", { userId });
    return Response.redirect(new URL("/host?stripe=missing_key", request.url));
  }

  const clerkUser = await currentUser();
  const contactEmail = clerkUser?.primaryEmailAddress?.emailAddress ?? clerkUser?.emailAddresses[0]?.emailAddress;
  if (!contactEmail) throw new Error("Your Clerk account must have an email address before Stripe onboarding can start.");

  const convex = await getAuthenticatedConvexClient();
  const existingAccountId = await convex.query(api.myFunctions.getStripeAccountId, {});
  const stripe = new Stripe(secretKey);
  const baseUrl = appUrl(request).replace(/\/$/, "");
  const refreshUrl = `${baseUrl}/api/stripe/connect/onboarding`;
  const returnUrl = `${baseUrl}/host?stripe=complete`;
  let accountId = existingAccountId ?? undefined;
  let account: Stripe.Response<Stripe.V2.Core.Account>;
  if (!accountId) {
    account = await stripe.v2.core.accounts.create({
      display_name: "Homely host",
      contact_email: contactEmail,
      identity: { country: accountCountry() },
      dashboard: "express",
      defaults: {
        responsibilities: {
          fees_collector: "application",
          losses_collector: "application",
        },
      },
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: { requested: true },
            },
          },
        },
      },
    });
    accountId = account.id;
    await convex.mutation(api.myFunctions.saveStripeAccountId, { stripeAccountId: accountId });
  } else {
    account = await stripe.v2.core.accounts.retrieve(accountId, { include: ["configuration.recipient"] });
    if (!account.applied_configurations.includes("recipient")) {
      await stripe.v2.core.accounts.update(accountId, {
        configuration: {
          recipient: {
            applied: true,
            capabilities: {
              stripe_balance: {
                stripe_transfers: { requested: true },
              },
            },
          },
        },
      });
      account = await stripe.v2.core.accounts.retrieve(accountId, { include: ["configuration.recipient"] });
    }
  }

  // Account Links are single-use. Always create a new one, including when Stripe
  // sends the user back here through refresh_url.
  const link = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: account.applied_configurations,
        refresh_url: refreshUrl,
        return_url: returnUrl,
      },
    },
  });
  return Response.redirect(link.url);
}

export async function GET(request: Request) {
  try {
    return await createOnboardingLink(request);
  } catch (error) {
    const details = stripeErrorDetails(error);
    console.error("Stripe Connect onboarding failed", {
      details,
      hasSecretKey: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
      keyMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test_or_unknown",
    });
    return Response.redirect(new URL(`/host?stripe=error&reason=${encodeURIComponent(details)}`, request.url));
  }
}

export async function POST(request: Request) {
  return GET(request);
}