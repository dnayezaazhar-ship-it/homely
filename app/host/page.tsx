"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, CalendarDays, CreditCard, Home, Plus, Settings, Trash2, Users, WalletCards } from "lucide-react";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import StripeOnboardingStatus from "../../components/StripeOnboardingStatus";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

const dashboardOptions = [
  { label: "Listings", description: "Manage your published and draft places.", icon: Home, href: "/host" },
  { label: "Bookings", description: "View incoming reservations and details.", icon: CreditCard, href: "/trips" },
  { label: "Calendar", description: "Block dates and view availability across listings.", icon: CalendarDays, href: "/host#calendar" },
  { label: "Earnings", description: "Stripe transfers and payout status.", icon: WalletCards, href: "/host#earnings" },
];

export default function HostDashboardPage() {
  const searchParams = useSearchParams();
  const listings = useQuery(api.myFunctions.getHostListings, {});
  const deleteListing = useMutation(api.myFunctions.deleteListing);
  const [deletingId, setDeletingId] = useState<Id<"listings"> | null>(null);
  const [error, setError] = useState("");
  const removeListing = async (listingId: Id<"listings">, title: string) => {
    if (!window.confirm(`Delete ${title}? This cannot be undone.`)) return;
    setDeletingId(listingId);
    setError("");
    try { await deleteListing({ listingId }); } catch { setError("We could not delete that listing. Please try again."); } finally { setDeletingId(null); }
  };
  return (
    <main className="min-h-screen bg-(--paper)">
      <Navbar />
      <section className="host-dashboard-shell">
        <div className="host-dashboard-heading"><div><p className="eyebrow">Host dashboard</p><h1>Host dashboard</h1><p>Everything you need to manage your hosting business.</p></div><div className="host-dashboard-actions"><Link className="stripe-onboarding-button" href="/host/onboarding">{searchParams.get("stripe") === "complete" ? "Stripe connected" : "Stripe onboarding"}</Link><Link className="new-listing-button" href="/become-a-host"><Plus size={15} /> New listing</Link></div></div>
        {searchParams.get("stripe") === "missing_key" && <p className="stripe-dashboard-message" role="alert">Stripe onboarding needs a server Stripe secret key before it can start.</p>}
        {searchParams.get("stripe") === "error" && <p className="stripe-dashboard-message" role="alert">Stripe onboarding could not start: {searchParams.get("reason") ?? "Unknown Stripe error"}</p>}
        {searchParams.get("stripe") === "complete" && <div className="stripe-dashboard-status"><p className="eyebrow">Stripe status</p><StripeOnboardingStatus /></div>}
        <div className="host-dashboard-options">{dashboardOptions.map(({ label, description, icon: Icon, href }) => <Link className="host-dashboard-option" href={href} key={label}><Icon size={17} /><strong>{label}</strong><span>{description}</span></Link>)}<Link className="host-dashboard-option" href="/host/products"><WalletCards size={17} /><strong>Products</strong><span>Sell goods through Stripe Checkout.</span></Link></div>
      </section>
      <section className="mx-auto grid max-w-6xl grid-cols-[1.35fr_0.65fr] gap-4 px-[8vw] pb-20 max-[800px]:grid-cols-1 max-[620px]:px-5">
        <div className="border border-(--line) bg-white p-8 max-[620px]:p-6">
          <div className="mb-10 flex items-start justify-between gap-4">
            <div><p className="eyebrow">Your listings</p><h2 className="text-3xl font-normal tracking-[-1px]">{listings?.length ? "Manage your stays" : "Nothing listed yet"}</h2></div>
            <Home className="text-(--coral)" size={24} />
          </div>
          {error && <p className="mb-4 font-sans text-sm text-red-700" role="alert">{error}</p>}
          {listings?.length ? <div className="host-listing-list">{listings.map((listing) => <div className="host-listing-row" key={listing._id}><div><strong>{listing.title || "Untitled draft"}</strong><span>{listing.location || "Location not set"} · <em>{listing.status}</em></span></div><button type="button" onClick={() => void removeListing(listing._id, listing.title || "this listing")} disabled={deletingId === listing._id} aria-label={`Delete ${listing.title || "listing"}`}><Trash2 size={16} /> {deletingId === listing._id ? "Deleting..." : "Delete"}</button></div>)}</div> : <><p className="max-w-md leading-6 text-(--muted)">Share a home with thoughtful travelers. Add your first listing and start shaping the kind of stay you would want to find.</p><Link className="mt-8 inline-flex items-center gap-2 font-sans text-sm text-(--coral) underline decoration-(--coral) underline-offset-4" href="/become-a-host">Create your first listing <ArrowRight size={16} /></Link></>}
        </div>
        <div className="bg-(--ink) p-8 text-(--paper) max-[620px]:p-6">
          <p className="eyebrow">Host essentials</p>
          <div className="mt-14 space-y-6 max-[800px]:mt-8">
            <div className="flex gap-4"><Users className="shrink-0 text-(--coral)" size={20} /><p className="m-0 leading-6">Welcome guests with clear house details.</p></div>
            <div className="flex gap-4"><Settings className="shrink-0 text-(--coral)" size={20} /><p className="m-0 leading-6">Set pricing and availability when you are ready.</p></div>
          </div>
        </div>
      </section>
    </main>
  );
}
