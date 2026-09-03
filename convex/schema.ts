import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    stripeAccountId: v.optional(v.string()),
  }).index("by_clerk_id", ["clerkId"]),
  listings: defineTable({
    hostId: v.string(),
    title: v.string(),
    location: v.string(),
    country: v.string(),
    description: v.string(),
    imageUrl: v.string(),
    pricePerNight: v.number(),
    rating: v.number(),
    reviewCount: v.number(),
    guests: v.number(),
    bedrooms: v.number(),
    beds: v.number(),
    bathrooms: v.number(),
    category: v.string(),
    status: v.union(v.literal("draft"), v.literal("published")),
    amenities: v.array(v.string()),
  }).index("by_status", ["status"]).index("by_host_id", ["hostId"]),
  bookings: defineTable({
    listingId: v.id("listings"),
    guestId: v.string(),
    checkIn: v.string(),
    checkOut: v.string(),
    guests: v.number(),
    nights: v.number(),
    subtotal: v.number(),
    platformFee: v.number(),
    total: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("completed"),
    ),
    stripePaymentIntentId: v.optional(v.string()),
  }).index("by_guest_id", ["guestId"]).index("by_listing_id", ["listingId"]),
});
