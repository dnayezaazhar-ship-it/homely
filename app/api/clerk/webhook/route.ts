import { Webhook } from "svix";
import { headers } from "next/headers";
import { fetchMutation } from "convex/nextjs";
import { internal } from "@/convex/_generated/api";

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Missing CLERK_WEBHOOK_SECRET", { status: 500 });
  }

  const issuerDomain = process.env.CLERK_FRONTEND_API_URL;
  if (!issuerDomain) {
    return new Response("Missing CLERK_FRONTEND_API_URL", { status: 500 });
  }

  const h = await headers();
  const svixId = h.get("svix-id");
  const svixTimestamp = h.get("svix-timestamp");
  const svixSignature = h.get("svix-signature");

 let event;
  try {
    event = await verifyWebhook(req);
  } catch (err) {
    console.error("Clerk webhook verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const u = event.data;
    const primary =
      u.email_addresses.find((e) => e.id === u.primary_email_address_id) ??
      u.email_addresses[0];
    const name =
      [u.first_name, u.last_name].filter(Boolean).join(" ") || undefined;

    await fetchMutation(internal.users.syncFromClerk, {
      clerkId: u.id,
      issuerDomain,
      email: primary?.email_address ?? "",
      name,
      imageUrl: u.image_url || undefined,
    });
  } else if (event.type === "user.deleted") {
    if (event.data.id) {
      await fetchMutation(internal.users.deleteFromClerk, {
        clerkId: event.data.id,
      });
    }
  }

  return new Response("ok", { status: 200 });
  }
}