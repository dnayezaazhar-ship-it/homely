"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { UserButton } from "@clerk/nextjs";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Homely home">
        <span className="brand-mark" aria-hidden="true"><span /></span>
        <span className="brand-copy"><strong>homely</strong><small>stay with a story</small></span>
      </Link>
      <nav className="top-nav" aria-label="Primary navigation">
        <div className="nav-links">
          <Link href="/">Explore</Link>
          <Link href="/trips">Trips</Link>
        </div>
        <div className="nav-actions">
          <Link className="host-dashboard-link" href="/host">Host dashboard <ArrowUpRight size={14} /></Link>
        </div>
        <AuthLoading><span aria-hidden="true" /></AuthLoading>
        <Authenticated><UserButton /></Authenticated>
        <Unauthenticated>
          <Link className="sign-in" href="/sign-in">Sign in</Link>
          <Link className="sign-up" href="/sign-up">Sign up</Link>
        </Unauthenticated>
      </nav>
    </header>
  );
}