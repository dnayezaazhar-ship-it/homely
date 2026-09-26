import { Webhook } from "svix";
import { headers } from "next/headers";

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Missing CLERK_WEBHOOK_SECRET", { status: 500 });
  }

  const h = await headers();
  const svixId = h.get("svix-id");
  const svixTimestamp = h.get("svix-timestamp");
  const svixSignature = h.get("svix-signature");

  let event: unknown;
  try {
    event = await new Webhook(secret).verify(await req.text(), {
      "svix-id": svixId ?? "",
      "svix-timestamp": svixTimestamp ?? "",
      "svix-signature": svixSignature ?? "",
    }) as unknown;
  } catch (err) {
    console.error("Clerk webhook verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  void event;

  return new Response("ok", { status: 200 });
}