import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { demoListings } from "./demoListings";

const demoUsers = [
  {
    clerkId: "seed-host-001",
    name: "Maya Chen",
    email: "maya.demo@example.com",
    imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    bio: "Designer and desert house guide.",
  },
  {
    clerkId: "seed-guest-001",
    name: "Alex Morgan",
    email: "alex.demo@example.com",
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    bio: "Always looking for the next good place to land.",
  },
];

export const seed = internalMutation({
  args: {},
  returns: v.object({ users: v.number(), listings: v.number() }),
  handler: async (ctx) => {
    let users = 0;
    for (const user of demoUsers) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (query) => query.eq("clerkId", user.clerkId))
        .unique();
      if (existing) {
        await ctx.db.patch("users", existing._id, user);
      } else {
        await ctx.db.insert("users", user);
      }
      users += 1;
    }

    const demoHostIds = [demoUsers[0].clerkId, "demo-host"];
    for (const hostId of demoHostIds) {
      const hostListings = await ctx.db
        .query("listings")
        .withIndex("by_host_id", (query) => query.eq("hostId", hostId))
        .collect();
      for (const listing of hostListings) await ctx.db.delete("listings", listing._id);
    }

    let listings = 0;
    for (const listing of demoListings) {
      await ctx.db.insert("listings", { ...listing, images: listing.images ?? [listing.imageUrl], hostId: demoUsers[0].clerkId, status: "published" });
      listings += 1;
    }

    return { users, listings };
  },
});
