import { v } from "convex/values";
import type { GenericId } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { demoListings } from "./demoListings";

export const listListings = query({
  args: { category: v.optional(v.string()), maxPrice: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const listings = await ctx.db.query("listings").withIndex("by_status", (q) => q.eq("status", "published")).collect();
    return listings.filter((listing) => {
      const matchesCategory = !args.category || args.category === "All" || listing.category === args.category;
      const matchesPrice = !args.maxPrice || listing.pricePerNight <= args.maxPrice;
      return matchesCategory && matchesPrice;
    });
  },
});

export const seedDemoListings = mutation({
  args: {},
  handler: async (ctx) => {
    const demoHostIds = ["demo-host", "seed-host-001"];
    for (const hostId of demoHostIds) {
      const listings = await ctx.db
        .query("listings")
        .withIndex("by_host_id", (query) => query.eq("hostId", hostId))
        .collect();
      for (const listing of listings) await ctx.db.delete("listings", listing._id);
    }
    for (const listing of demoListings) await ctx.db.insert("listings", { ...listing, hostId: "demo-host", status: "published" });
  },
});

function getDateRange(checkIn: string, checkOut: string) {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(checkIn) || !datePattern.test(checkOut)) {
    throw new Error("Dates must use YYYY-MM-DD format.");
  }

  const checkInDate = new Date(`${checkIn}T00:00:00.000Z`);
  const checkOutDate = new Date(`${checkOut}T00:00:00.000Z`);
  if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime()) || checkOutDate <= checkInDate) {
    throw new Error("Check-out must be after check-in.");
  }

  return {
    checkInDate,
    checkOutDate,
    nights: Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 86_400_000),
  };
}

async function hasConflictingBooking(ctx: QueryCtx | MutationCtx, listingId: GenericId<"listings">, checkIn: string, checkOut: string) {
  const bookings = await ctx.db
    .query("bookings")
    .withIndex("by_listing_id", (query) => query.eq("listingId", listingId))
    .collect();

  return bookings.some((booking) =>
    booking.status !== "cancelled" && booking.checkIn < checkOut && booking.checkOut > checkIn,
  );
}

export const getAvailability = query({
  args: {
    listingId: v.id("listings"),
    checkIn: v.string(),
    checkOut: v.string(),
  },
  returns: v.object({ available: v.boolean() }),
  handler: async (ctx, args) => {
    getDateRange(args.checkIn, args.checkOut);
    const listing = await ctx.db.get("listings", args.listingId);
    if (!listing || listing.status !== "published") return { available: false };

    return { available: !(await hasConflictingBooking(ctx, args.listingId, args.checkIn, args.checkOut)) };
  },
});

export const createBooking = mutation({
  args: { listingId: v.id("listings"), checkIn: v.string(), checkOut: v.string(), guests: v.number(), nights: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("You must be signed in to book a home.");
    const { nights } = getDateRange(args.checkIn, args.checkOut);
    if (args.nights !== nights) throw new Error("The number of nights does not match the selected dates.");
    const listing = await ctx.db.get("listings", args.listingId);
    if (!listing || listing.status !== "published") throw new Error("This home is no longer available.");
    if (args.guests < 1 || args.guests > listing.guests) throw new Error("This home cannot accommodate that many guests.");
    if (await hasConflictingBooking(ctx, args.listingId, args.checkIn, args.checkOut)) {
      throw new Error("This home is not available for the selected dates.");
    }
    const subtotal = listing.pricePerNight * args.nights;
    const platformFee = Math.round(subtotal * 0.12);
    return await ctx.db.insert("bookings", { ...args, guestId: identity.tokenIdentifier, subtotal, platformFee, total: subtotal + platformFee, status: "pending" });
  },
});
