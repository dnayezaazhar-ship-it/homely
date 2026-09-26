"use client";

import { useQuery } from "convex/react";
import { ArrowLeft, CalendarDays, CheckCircle2, CreditCard, House, MapPin } from "lucide-react";
import Link from "next/link";
import { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import Navbar from "./Navbar";

export default function BookingSummary({ bookingId }: { bookingId: string }) {
  const result = useQuery(api.myFunctions.getBooking, { bookingId: bookingId as Id<"bookings"> });

  if (result === undefined) return <main className="booking-summary-page"><Navbar /><div className="detail-loading">Loading your reservation...</div></main>;
  if (result === null) return <main className="booking-summary-page"><Navbar /><div className="detail-not-found"><p className="eyebrow">Reservation unavailable</p><h1>We couldn&apos;t find that booking.</h1><Link href="/trips">Go to Trips</Link></div></main>;

  const { booking, listing, host } = result;
  const cleaningFee = booking.cleaningFee ?? 0;

  return <main className="booking-summary-page">
    <Navbar />
    <div className="booking-summary-shell">
      <Link className="back-link" href={`/listings/${listing._id}`}><ArrowLeft size={16} /> Back to listing</Link>
      <div className="booking-confirmation"><CheckCircle2 size={24} /><div><p className="eyebrow">Reservation {booking.status}</p><h1>Your trip is almost ready.</h1><p>Review the details below. Payment will be connected here when checkout is enabled.</p></div></div>
      <div className="booking-summary-grid">
        <section className="booking-summary-card"><div className="summary-property"><img src={listing.imageUrl} alt={listing.title} /><div><h2>{listing.title}</h2><p><MapPin size={13} /> {listing.location}, {listing.country}</p><span>{listing.category} · {host?.name ? `Hosted by ${host.name}` : "Hosted by Homely"}</span></div></div><div className="summary-section"><h2>Your stay</h2><div className="summary-details"><div><CalendarDays size={18} /><span><strong>Check-in</strong>{booking.checkIn}</span></div><div><CalendarDays size={18} /><span><strong>Check-out</strong>{booking.checkOut}</span></div><div><House size={18} /><span><strong>Guests</strong>{booking.guests} {booking.guests === 1 ? "guest" : "guests"}</span></div><div><House size={18} /><span><strong>Nights</strong>{booking.nights}</span></div></div></div><div className="summary-section"><h2>Payment</h2><div className="payment-placeholder"><CreditCard size={20} /><div><strong>Payment method</strong><p>Your secure payment method will be collected at the next step.</p></div><span>Not configured</span></div></div></section>
        <aside className="booking-summary-card price-summary"><h2>Price details</h2><div><span>${listing.pricePerNight} × {booking.nights} nights</span><span>${booking.subtotal}</span></div><div><span>Cleaning fee</span><span>${cleaningFee}</span></div><div><span>Service fee</span><span>${booking.serviceFee ?? booking.platformFee}</span></div><div className="summary-total"><strong>Total</strong><strong>${booking.total}</strong></div><p className="summary-status">Booking status: <strong>{booking.status}</strong></p><button className="reserve-button payment-button" type="button" disabled>Continue to payment</button></aside>
      </div>
    </div>
  </main>;
}