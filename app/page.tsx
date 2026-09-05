"use client";

import { useEffect, useState } from "react";
import { Authenticated, Unauthenticated, useMutation,AuthLoading, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { ArrowRight, CalendarDays, ChevronDown, Globe2, Heart, Map, Search, SlidersHorizontal, Star } from "lucide-react";

const categories = [
  { id: "all", label: "All" },
  { id: "design", label: "Design" },
  { id: "tropical", label: "Tropical" },
  { id: "cabins", label: "Cabins" },
  { id: "beach", label: "Beach" },
];

export default function Home() {
  const [category, setCategory] = useState("All");
  const [showMap, setShowMap] = useState(false);
  const [guests, setGuests] = useState(2);
  const allListings = useQuery(api.myFunctions.listListings, { category: "All" });
  const listings = allListings?.filter((listing) => category === "All" || listing.category === category);
  const seed = useMutation(api.myFunctions.seedDemoListings);

  useEffect(() => {
    const hasLegacySeed = allListings?.length !== undefined && allListings.length < 16 || allListings?.some((listing) =>
      listing.hostId === "seed-host-001" ||
      (listing.title === "A-Frame Hideaway" && listing.imageUrl.includes("1510798831971")),
    );
    if (allListings?.length === 0 || hasLegacySeed) void seed();
  }, [allListings, seed]);

  return <main>
    <header className="site-header"><a className="brand" href="/" aria-label="Homely home"><span className="brand-mark">+</span> homely</a><nav className="top-nav"><a href="#stays">Explore stays</a><a href="/server">Become a host <ArrowRight size={15} /></a><button className="globe" aria-label="Choose language"><Globe2 size={18} /></button><AuthLoading><span aria-hidden="true" /></AuthLoading><Authenticated><UserButton /></Authenticated><Unauthenticated><SignInButton mode="modal"><button className="sign-in">Sign in</button></SignInButton><SignUpButton mode="modal"><button className="sign-up">Sign up</button></SignUpButton></Unauthenticated></nav></header>
    <section className="hero"><div className="hero-copy"><p className="eyebrow">A better way to get away</p><h1>Stay somewhere<br /><em>with a story.</em></h1><p className="hero-note">Thoughtful homes, hosted by real people, in places worth getting lost in.</p></div><div className="search-panel"><div className="search-field"><Search size={18} /><label>Where<input placeholder="Search destinations" /></label></div><div className="search-field"><CalendarDays size={18} /><label>When<input placeholder="Add dates" /></label></div><div className="search-field guests-field"><label>Guests<input value={`${guests} guests`} readOnly onClick={() => setGuests(guests === 8 ? 1 : guests + 1)} /></label><ChevronDown size={17} /></div><button className="search-button" aria-label="Search"><Search size={20} /></button></div></section>
    <section className="explore-bar" id="stays"><div className="categories">{categories.map((item) => <button key={item.id} className={category === item.label ? "category active" : "category"} onClick={() => setCategory(item.label)}>{item.label}</button>)}</div><div className="bar-actions"><button className="filter-button"><SlidersHorizontal size={16} /> Filters</button><button className={showMap ? "map-button active-map" : "map-button"} onClick={() => setShowMap(!showMap)}><Map size={16} /> {showMap ? "Hide map" : "Show map"}</button></div></section>
    <section className={showMap ? "content-grid map-open" : "content-grid"}><div className="listing-area"><div className="section-heading"><div><p className="eyebrow">Handpicked for you</p><h2>Find your next place</h2></div><span className="result-count">{listings?.length ?? 0} stays</span></div><div className="listing-grid">{listings === undefined ? <LoadingCards /> : listings.map((listing) => <article className="listing-card" key={listing._id}><div className="image-wrap"><img src={listing.imageUrl} alt={listing.title} /><button className="heart" aria-label={`Save ${listing.title}`}><Heart size={19} /></button><span className="tag">Guest favourite</span></div><div className="listing-info"><div className="listing-title"><h3>{listing.title}</h3><span><Star size={14} fill="currentColor" /> {listing.rating}</span></div><p>{listing.location}, {listing.country}</p><p className="listing-meta">{listing.guests} guests · {listing.bedrooms} bedrooms · {listing.beds} beds</p><div className="price"><strong>${listing.pricePerNight}</strong> night <span>·</span> <u>available now</u></div></div></article>)}</div></div>{showMap && <aside className="map-panel"><div className="map-caption"><span>Explore the area</span><small>Drag to discover stays</small></div><div className="map-paper"><span className="road road-one" /><span className="road road-two" /><span className="water" /><button className="price-pin pin-one">$420</button><button className="price-pin pin-two">$185</button><button className="price-pin pin-three">$275</button><button className="price-pin pin-four">$340</button></div></aside>}</section>
    <section className="host-banner"><div><p className="eyebrow">Make room for more</p><h2>Turn your place into<br /><em>someone&apos;s favourite stay.</em></h2></div><a href="/server" className="host-link">Start hosting <ArrowRight size={17} /></a></section>
    <footer><span className="brand"><span className="brand-mark">+</span> homely</span><span>Made for the places that stay with you.</span><span>© 2026 Homely</span></footer>
  </main>;
}

function LoadingCards() { return <>{["skeleton-one", "skeleton-two", "skeleton-three", "skeleton-four"].map((id) => <div className="skeleton-card" key={id}><div className="skeleton-image" /><div className="skeleton-line" /><div className="skeleton-line short" /></div>)}</>; }
