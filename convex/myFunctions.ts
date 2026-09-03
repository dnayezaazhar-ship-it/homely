import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const seedListings = [
  { title: "The Glass House", location: "Joshua Tree", country: "United States", description: "A sun-washed glass retreat among the high desert boulders.", imageUrl: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=85", pricePerNight: 420, rating: 4.96, reviewCount: 128, guests: 4, bedrooms: 2, beds: 2, bathrooms: 1, category: "Design", amenities: ["WiFi", "Kitchen", "Fireplace"] },
  { title: "Casa Nube", location: "Oaxaca", country: "Mexico", description: "An airy courtyard home with warm plaster walls and a private pool.", imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85", pricePerNight: 185, rating: 4.88, reviewCount: 86, guests: 6, bedrooms: 3, beds: 4, bathrooms: 2, category: "Tropical", amenities: ["Pool", "WiFi", "Kitchen"] },
  { title: "A-Frame Hideaway", location: "Hood River", country: "United States", description: "A quiet cedar cabin made for slow mornings and mountain air.", imageUrl: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=85", pricePerNight: 275, rating: 4.91, reviewCount: 54, guests: 2, bedrooms: 1, beds: 1, bathrooms: 1, category: "Cabins", amenities: ["Mountain view", "Fireplace", "Hot tub"] },
  { title: "Sea Glass Villa", location: "Paros", country: "Greece", description: "A bright island villa above a quiet cove, with room for everyone.", imageUrl: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85", pricePerNight: 340, rating: 4.84, reviewCount: 71, guests: 8, bedrooms: 4, beds: 5, bathrooms: 3, category: "Beach", amenities: ["Pool", "Ocean view", "Air conditioning"] },
];

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
    if ((await ctx.db.query("listings").take(1)).length > 0) return;
    for (const listing of seedListings) await ctx.db.insert("listings", { ...listing, hostId: "demo-host", status: "published" });
  },
});

export const createBooking = mutation({
  args: { listingId: v.id("listings"), checkIn: v.string(), checkOut: v.string(), guests: v.number(), nights: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("You must be signed in to book a home.");
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "published") throw new Error("This home is no longer available.");
    const subtotal = listing.pricePerNight * args.nights;
    const platformFee = Math.round(subtotal * 0.12);
    return await ctx.db.insert("bookings", { ...args, guestId: identity.tokenIdentifier, subtotal, platformFee, total: subtotal + platformFee, status: "pending" });
  },
});
