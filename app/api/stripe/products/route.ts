import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { getStripeClient, logStripeError } from "../../../../lib/stripe-server";

async function getHostAccountId() {
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  if (token) convex.setAuth(token);
  return convex.query(api.myFunctions.getStripeAccountId, {});
}

export async function GET() {
  try {
    const stripe = getStripeClient();
    // Products are platform-level objects. Their metadata keeps the host
    // association without duplicating Stripe product data in Convex.
    const products = await stripe.products.list({ active: true, expand: ["data.default_price"], limit: 100 });
    return Response.json(products.data.filter((product) => product.metadata.stripeAccountId).map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      accountId: product.metadata.stripeAccountId,
      priceId: typeof product.default_price === "string" ? product.default_price : product.default_price?.id,
      unitAmount: typeof product.default_price === "object" && product.default_price ? product.default_price.unit_amount : null,
      currency: typeof product.default_price === "object" && product.default_price ? product.default_price.currency : "usd",
    })));
  } catch (error) {
    logStripeError("Stripe product listing failed", error);
    return Response.json({ error: "We could not load the storefront products. Check the server Stripe configuration." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "Sign in as a host before creating a product." }, { status: 401 });
    const accountId = await getHostAccountId();
    if (!accountId) return Response.json({ error: "Complete Stripe Connect onboarding before creating products." }, { status: 400 });

    const body = await request.json() as { name?: unknown; description?: unknown; priceInCents?: unknown; currency?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : undefined;
    const priceInCents = typeof body.priceInCents === "number" ? body.priceInCents : Number(body.priceInCents);
    const currency = typeof body.currency === "string" ? body.currency.trim().toLowerCase() : "usd";
    if (!name || !Number.isInteger(priceInCents) || priceInCents < 50 || priceInCents > 99999999) {
      return Response.json({ error: "Enter a product name and a whole-number price of at least $0.50." }, { status: 400 });
    }
    if (!/^[a-z]{3}$/.test(currency)) return Response.json({ error: "Currency must be a three-letter ISO code, such as usd." }, { status: 400 });

    const stripe = getStripeClient();
    const product = await stripe.products.create({
      name,
      ...(description ? { description } : {}),
      default_price_data: { unit_amount: priceInCents, currency },
      metadata: { stripeAccountId: accountId, hostUserId: userId },
    });
    return Response.json({ id: product.id }, { status: 201 });
  } catch (error) {
    logStripeError("Stripe product creation failed", error);
    return Response.json({ error: "We could not create that product. Check the server Stripe configuration and your input." }, { status: 502 });
  }
}