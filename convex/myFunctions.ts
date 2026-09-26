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

export const getListing = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get("listings", args.listingId);
    if (!listing || listing.status !== "published") return null;

    const host = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (query) => query.eq("clerkId", listing.hostId))
      .unique();

    const storedImages = await Promise.all((listing.photoStorageIds ?? []).map((storageId) => ctx.storage.getUrl(storageId)));
    const images = storedImages.filter((image): image is string => image !== null);
    return {
      listing: {
        ...listing,
        images: images.length ? images : listing.images?.length ? listing.images : listing.imageUrl ? [listing.imageUrl] : [],
      },
      host,
    };
  },
});

export const generateListingUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    if (!(await ctx.auth.getUserIdentity())) throw new Error("You must be signed in to upload listing photos.");
    return await ctx.storage.generateUploadUrl();
  },
});

export const getHostListings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db.query("listings").withIndex("by_host_id", (query) => query.eq("hostId", identity.tokenIdentifier)).order("desc").collect();
  },
});

export const getStripeAccountId = query({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.query("users").withIndex("by_clerk_id", (query) => query.eq("clerkId", identity.tokenIdentifier)).unique();
    return user?.stripeAccountId ?? null;
  },
});

export const saveStripeAccountId = mutation({
  args: { stripeAccountId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("You must be signed in to connect payouts.");
    const user = await ctx.db.query("users").withIndex("by_clerk_id", (query) => query.eq("clerkId", identity.tokenIdentifier)).unique();
    const profile = {
      clerkId: identity.tokenIdentifier,
      name: identity.name ?? "Homely host",
      ...(identity.email ? { email: identity.email } : {}),
      ...(identity.pictureUrl ? { imageUrl: identity.pictureUrl } : {}),
      stripeAccountId: args.stripeAccountId,
    };
    if (user) await ctx.db.patch("users", user._id, { stripeAccountId: args.stripeAccountId });
    else await ctx.db.insert("users", profile);
    return null;
  },
});

export const deleteListing = mutation({
  args: { listingId: v.id("listings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("You must be signed in to delete a listing.");
    const listing = await ctx.db.get("listings", args.listingId);
    if (!listing || listing.hostId !== identity.tokenIdentifier) throw new Error("This listing is not available to you.");
    for (const storageId of listing.photoStorageIds ?? []) await ctx.storage.delete(storageId);
    await ctx.db.delete("listings", args.listingId);
    return null;
  },
});

export const createListing = mutation({
  args: {
    title: v.string(), description: v.string(), propertyType: v.string(), category: v.string(),
    address: v.string(), location: v.string(), region: v.string(), country: v.string(),
    latitude: v.number(), longitude: v.number(), guests: v.number(), bedrooms: v.number(),
    beds: v.number(), bathrooms: v.number(), pricePerNight: v.number(), cleaningFee: v.number(),
    serviceFeePercent: v.number(), minNights: v.number(), maxNights: v.number(),
    checkInTime: v.string(), checkOutTime: v.string(), instantBook: v.boolean(),
    amenities: v.array(v.string()), houseRules: v.string(), photoStorageIds: v.array(v.id("_storage")),
    status: v.union(v.literal("draft"), v.literal("published")),
  },
  returns: v.id("listings"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("You must be signed in to create a listing.");
    if (!args.title.trim() || !args.description.trim() || !args.location.trim() || !args.country.trim()) throw new Error("Complete the required listing details.");
    if (args.status === "published" && args.photoStorageIds.length === 0) throw new Error("Add at least one photo before publishing your listing.");
    if (args.guests < 1 || args.bedrooms < 1 || args.beds < 1 || args.bathrooms < 1 || args.pricePerNight <= 0) throw new Error("Enter valid capacity and pricing details.");
    if (args.minNights < 1 || args.maxNights < args.minNights) throw new Error("Check the minimum and maximum stay.");
    const imageUrl = args.photoStorageIds.length ? (await ctx.storage.getUrl(args.photoStorageIds[0])) ?? "" : "";
    return await ctx.db.insert("listings", {
      hostId: identity.tokenIdentifier, title: args.title.trim(), description: args.description.trim(), propertyType: args.propertyType,
      category: args.category, address: args.address.trim(), location: args.location.trim(), region: args.region.trim(), country: args.country.trim(),
      latitude: args.latitude, longitude: args.longitude, imageUrl, photoStorageIds: args.photoStorageIds, pricePerNight: args.pricePerNight,
      cleaningFee: args.cleaningFee, serviceFeePercent: args.serviceFeePercent, rating: 0, reviewCount: 0, guests: args.guests,
      bedrooms: args.bedrooms, beds: args.beds, bathrooms: args.bathrooms, status: args.status, amenities: args.amenities,
      minNights: args.minNights, maxNights: args.maxNights, checkInTime: args.checkInTime, checkOutTime: args.checkOutTime,
      instantBook: args.instantBook, houseRules: args.houseRules.trim(),
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
    for (const listing of demoListings) await ctx.db.insert("listings", { ...listing, images: listing.images ?? [listing.imageUrl], hostId: "demo-host", status: "published" });
  },
});

function getDateRange(checkIn: string, checkOut: string) {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(checkIn) || !datePattern.test(checkOut)) {
    throw new Error("Dates must use YYYY-MM-DD format.");
  }

  const checkInDate = new Date(`${checkIn}T00:00:00.000Z`);
  const checkOutDate = new Date(`${checkOut}T00:00:00.000Z`);
  if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime()) || checkInDate.toISOString().slice(0, 10) !== checkIn || checkOutDate.toISOString().slice(0, 10) !== checkOut || checkOutDate <= checkInDate) {
    throw new Error("Check-out must be after check-in.");
  }
  const today = new Date();
  const todayKey = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())).toISOString().slice(0, 10);
  if (checkIn < todayKey) throw new Error("Check-in cannot be in the past.");

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
    (booking.status === "pending" || booking.status === "confirmed") && booking.checkIn < checkOut && booking.checkOut > checkIn,
  );
}

export const getUnavailableDates = query({
  args: { listingId: v.id("listings") },
  returns: v.array(v.object({ checkIn: v.string(), checkOut: v.string() })),
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_listing_id", (query) => query.eq("listingId", args.listingId))
      .collect();
    return bookings
      .filter((booking) => booking.status === "pending" || booking.status === "confirmed")
      .map(({ checkIn, checkOut }) => ({ checkIn, checkOut }));
  },
});

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
  args: { listingId: v.id("listings"), checkIn: v.string(), checkOut: v.string(), guests: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("You must be signed in to book a home.");
    const { nights } = getDateRange(args.checkIn, args.checkOut);
    const listing = await ctx.db.get("listings", args.listingId);
    if (!listing || listing.status !== "published") throw new Error("This home is no longer available.");
    const minimumNights = listing.minNights ?? 1;
    const maximumNights = listing.maxNights ?? 30;
    if (nights < minimumNights || nights > maximumNights) {
      throw new Error(`Stay must be between ${minimumNights} and ${maximumNights} nights.`);
    }
    if (args.guests < 1 || args.guests > listing.guests) throw new Error("This home cannot accommodate that many guests.");
    if (await hasConflictingBooking(ctx, args.listingId, args.checkIn, args.checkOut)) {
      throw new Error("This home is not available for the selected dates.");
    }
    const subtotal = listing.pricePerNight * nights;
    const cleaningFee = listing.cleaningFee ?? Math.round(listing.pricePerNight * 0.08);
    const platformFee = Math.round(subtotal * ((listing.serviceFeePercent ?? 12) / 100));
    return await ctx.db.insert("bookings", { ...args, guestId: identity.tokenIdentifier, hostId: listing.hostId, nights, subtotal, platformFee, serviceFee: platformFee, cleaningFee, total: subtotal + cleaningFee + platformFee, status: "pending" });
  },
});

export const getBooking = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const booking = await ctx.db.get("bookings", args.bookingId);
    if (!booking || booking.guestId !== identity.tokenIdentifier) return null;

    const listing = await ctx.db.get("listings", booking.listingId);
    if (!listing) return null;
    const host = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (query) => query.eq("clerkId", listing.hostId))
      .unique();

    return { booking, listing, host };
  },
});
