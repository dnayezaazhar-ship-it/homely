"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, House, Star, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import Navbar from "./Navbar";

function getNights(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(`${checkIn}T00:00:00.000Z`);
  const end = new Date(`${checkOut}T00:00:00.000Z`);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

export default function ListingDetails({ listingId }: { listingId: string }) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [bookingError, setBookingError] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [isBookingCardOpen, setIsBookingCardOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(monthKey(new Date()));
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const result = useQuery(api.myFunctions.getListing, { listingId: listingId as Id<"listings"> });
  const availability = useQuery(api.myFunctions.getAvailability, getNights(checkIn, checkOut) > 0 ? { listingId: listingId as Id<"listings">, checkIn, checkOut } : "skip");
  const unavailable = useQuery(api.myFunctions.getUnavailableDates, { listingId: listingId as Id<"listings"> });
  const createBooking = useMutation(api.myFunctions.createBooking);

  useEffect(() => {
    if (!galleryOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setGalleryOpen(false);
      if (event.key === "ArrowRight") setSelectedImage((index) => (index + 1) % (result?.listing.images.length ?? 1));
      if (event.key === "ArrowLeft") setSelectedImage((index) => (index - 1 + (result?.listing.images.length ?? 1)) % (result?.listing.images.length ?? 1));
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [galleryOpen, result?.listing.images.length]);

  useEffect(() => {
    const openCalendarFromDateField = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest(".booking-card .date-summary button")) setIsBookingCardOpen(true);
    };
    document.addEventListener("click", openCalendarFromDateField);
    return () => document.removeEventListener("click", openCalendarFromDateField);
  }, []);

  if (result === undefined) {
    return <main className="listing-detail-page"><Navbar /><div className="detail-loading">Loading this stay...</div></main>;
  }

  if (result === null) {
    return <main className="listing-detail-page"><Navbar /><div className="detail-not-found"><p className="eyebrow">Stay unavailable</p><h1>This place could not be found.</h1><Link href="/">Back to Explore</Link></div></main>;
  }

  const { listing, host } = result;
  const galleryImages = listing.images;
  const hostName = host?.name || "Homely host";
  const nights = getNights(checkIn, checkOut);
  const subtotal = listing.pricePerNight * nights;
  const cleaningFee = nights > 0 ? Math.round(listing.pricePerNight * 0.08) : 0;
  const serviceFee = Math.round(subtotal * 0.12);
  const total = subtotal + cleaningFee + serviceFee;
  const minimumNights = listing.minNights ?? 1;
  const maximumNights = listing.maxNights ?? 30;
  const today = new Date().toISOString().slice(0, 10);
  const calendarMonths = [calendarMonth, monthKey(new Date(Date.UTC(monthDate(calendarMonth).getUTCFullYear(), monthDate(calendarMonth).getUTCMonth() + 1, 1)))];
  const isUnavailable = (value: string) => unavailable?.some((range) => value >= range.checkIn && value < range.checkOut) ?? false;
  const selectDate = (value: string) => {
    if (value < today || isUnavailable(value)) return;
    setBookingError("");
    if (!checkIn || checkOut) { setCheckIn(value); setCheckOut(""); return; }
    if (value <= checkIn) { setCheckIn(value); setCheckOut(""); return; }
    if (Array.from({ length: getNights(checkIn, value) }, (_, index) => addDays(checkIn, index)).some(isUnavailable)) {
      setBookingError("Those dates include an unavailable night. Choose another range.");
      return;
    }
    setCheckOut(value);
  };

  const openGallery = (index = 0) => {
    setSelectedImage(index);
    setGalleryOpen(true);
  };

  const moveImage = (direction: number) => {
    setSelectedImage((index) => (index + direction + galleryImages.length) % galleryImages.length);
  };

  const reserve = async () => {
    setBookingError("");
    if (!isLoaded || !isSignedIn) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(`/listings/${listingId}`)}`);
      return;
    }
    if (!checkIn || !checkOut) return setBookingError("Choose check-in and check-out dates.");
    if (nights < minimumNights || nights > maximumNights) return setBookingError(`Choose a stay between ${minimumNights} and ${maximumNights} nights.`);
    if (availability && !availability.available) return setBookingError("Those dates are no longer available.");

    setIsBooking(true);
    try {
      const bookingId = await createBooking({ listingId: listingId as Id<"listings">, checkIn, checkOut, guests });
      router.push(`/bookings/${bookingId}`);
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : "We could not create this reservation.");
      setIsBooking(false);
    }
  };

  return <main className="listing-detail-page">
    <Navbar />
    <div className="detail-shell">
      <Link className="back-link" href="/"><ArrowLeft size={16} /> Back to stays</Link>
      <header className="detail-heading">
        <div><p className="eyebrow">{listing.category} stay</p><h1>{listing.title}</h1><p>{listing.location}, {listing.country}</p></div>
        <button className="detail-save" type="button" aria-label={`Save ${listing.title}`}><Heart size={18} /> Save</button>
      </header>
      <div className="detail-gallery" aria-label={`${listing.title} photo gallery`}>
        {galleryImages.slice(0, 3).map((image, index) => <button className={index === 0 ? "detail-gallery-image detail-gallery-main" : "detail-gallery-image"} key={`${listing._id}-gallery-${index}`} type="button" onClick={() => openGallery(index)}><img src={image} alt={index === 0 ? listing.title : `${listing.title} photo ${index + 1}`} /></button>)}
        <button className="detail-gallery-all" type="button" onClick={() => openGallery(0)}>View all photos <span>{galleryImages.length}</span></button>
      </div>
      <div className="detail-layout">
        <div className="detail-copy">
          <div className="detail-host-row"><div><h2>Entire place hosted by {hostName}</h2><p>{listing.guests} guests · {listing.bedrooms} bedrooms · {listing.beds} beds · {listing.bathrooms} baths</p></div>{host?.imageUrl ? <img className="host-avatar" src={host.imageUrl} alt={hostName} /> : <span className="host-avatar host-avatar-fallback"><House size={18} /></span>}</div>
          <div className="detail-section"><p className="detail-description">{listing.description}</p></div>
          <div className="detail-section"><h2>What this place offers</h2><div className="amenity-grid">{listing.amenities.map((amenity) => <span key={amenity}>• {amenity}</span>)}</div></div>
          <div className="detail-section detail-review"><Star size={18} fill="currentColor" /><strong>{listing.rating}</strong><span> · {listing.reviewCount} reviews</span></div>
        </div>
        <aside className="booking-card"><div className="booking-card-header"><div className="booking-price"><strong>${listing.pricePerNight}</strong> <span>night</span></div><button className="booking-card-toggle" type="button" aria-expanded={isBookingCardOpen} aria-controls="booking-card-body" onClick={() => setIsBookingCardOpen((open) => !open)}>{isBookingCardOpen ? "Hide" : "Show"}</button></div><div id="booking-card-body" className={isBookingCardOpen ? "booking-card-body is-open" : "booking-card-body"}><div className="date-summary"><button type="button" onClick={() => setCheckIn("")}>Check in<strong>{checkIn || "Add date"}</strong></button><button type="button" onClick={() => setCheckOut("")}>Check out<strong>{checkOut || "Add date"}</strong></button></div><div className="calendar-picker" aria-label="Choose booking dates">{calendarMonths.map((month) => <div className="calendar-month" key={month}><div className="calendar-heading"><button type="button" aria-label="Previous month" onClick={() => setCalendarMonth(monthKey(new Date(Date.UTC(monthDate(month).getUTCFullYear(), monthDate(month).getUTCMonth() - 1, 1))))} disabled={month === calendarMonths[0] && month <= monthKey(new Date())}>‹</button><strong>{monthDate(month).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</strong><button type="button" aria-label="Next month" onClick={() => setCalendarMonth(monthKey(new Date(Date.UTC(monthDate(month).getUTCFullYear(), monthDate(month).getUTCMonth() + 1, 1))))}>›</button></div><div className="calendar-weekdays">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="calendar-grid">{calendarDays(month).map((value, index) => value ? <button type="button" key={value} className={`${value === checkIn ? "selected-start " : ""}${value === checkOut ? "selected-end " : ""}${checkIn && checkOut && value > checkIn && value < checkOut ? "in-range " : ""}${isUnavailable(value) || value < today ? "unavailable" : ""}`} disabled={value < today || isUnavailable(value)} onClick={() => selectDate(value)}>{Number(value.slice(-2))}</button> : <span key={`empty-${index}`} />)}</div></div>)}</div><p className="stay-rule">{minimumNights}-{maximumNights} night stay</p><label>Guests<input type="number" min="1" max={listing.guests} value={guests} onChange={(event) => setGuests(Math.min(listing.guests, Math.max(1, Number(event.target.value))))} /></label>{nights > 0 && nights < minimumNights && <p className="booking-error" role="alert">Choose at least {minimumNights} nights.</p>}{nights > maximumNights && <p className="booking-error" role="alert">Choose no more than {maximumNights} nights.</p>}{nights > 0 && <div className="price-breakdown"><div><span>${listing.pricePerNight} × {nights} nights</span><span>${subtotal}</span></div><div><span>Cleaning fee</span><span>${cleaningFee}</span></div><div><span>Service fee</span><span>${serviceFee}</span></div><div className="price-total"><strong>Total</strong><strong>${total}</strong></div></div>}{bookingError && <p className="booking-error" role="alert">{bookingError}</p>}<button type="button" className="reserve-button" disabled={isBooking || !checkIn || !checkOut || nights < minimumNights || nights > maximumNights || availability?.available === false} onClick={reserve}>{isBooking ? "Creating reservation..." : "Reserve"}</button><small>You won&apos;t be charged yet. Payment is confirmed on the next step.</small></div></aside>
    </div>
    </div>
    {galleryOpen && <div className="gallery-modal" role="dialog" aria-modal="true" aria-label={`${listing.title} photo gallery`}><button className="gallery-close" type="button" onClick={() => setGalleryOpen(false)} aria-label="Close gallery"><X size={22} /></button><div className="gallery-viewer"><button className="gallery-arrow" type="button" onClick={() => moveImage(-1)} aria-label="Previous photo"><ChevronLeft size={28} /></button><img src={galleryImages[selectedImage]} alt={`${listing.title} photo ${selectedImage + 1} of ${galleryImages.length}`} /><button className="gallery-arrow" type="button" onClick={() => moveImage(1)} aria-label="Next photo"><ChevronRight size={28} /></button></div><div className="gallery-counter">{selectedImage + 1} / {galleryImages.length}</div><div className="gallery-thumbnails">{galleryImages.map((image, index) => <button className={index === selectedImage ? "gallery-thumbnail active" : "gallery-thumbnail"} key={`${listing._id}-thumbnail-${index}`} type="button" onClick={() => setSelectedImage(index)}><img src={image} alt={`Thumbnail ${index + 1}`} /></button>)}</div></div>}
  </main>;
}

const dayMilliseconds = 86_400_000;
function dateKey(date: Date) { return date.toISOString().slice(0, 10); }
function dateFromKey(value: string) { return new Date(`${value}T00:00:00.000Z`); }
function addDays(value: string, amount: number) { return dateKey(new Date(dateFromKey(value).getTime() + amount * dayMilliseconds)); }
function monthKey(date: Date) { return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`; }
function monthDate(value: string) { return new Date(`${value}-01T00:00:00.000Z`); }
function calendarDays(value: string) {
  const month = monthDate(value);
  const firstDay = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
  const offset = (firstDay.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
  return Array.from({ length: offset + count }, (_, index) => index < offset ? "" : dateKey(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), index - offset + 1))));
}