import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "./Navbar";

type AuthPageShellProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
};

export default function AuthPageShell({ eyebrow, title, intro, children }: AuthPageShellProps) {
  return (
    <main className="auth-page">
      <Navbar />
      <div className="auth-layout">
        <aside className="auth-story" aria-label="Homely hosting highlights">
          <div className="auth-story-panel">
            <Link className="auth-story-brand" href="/" aria-label="Homely home"><span className="brand-mark">+</span> homely</Link>
            <div className="auth-story-image">
              <Image
                src="https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1000&q=85"
                alt="A welcoming Homely cabin in the woods"
                fill
                priority
                sizes="(max-width: 820px) 100vw, 368px"
              />
            </div>
            <div className="auth-story-points">
              <div><strong>List your home in minutes</strong><span>Create a stunning listing with photos, pricing, and house rules — and start hosting today.</span></div>
              <div><strong>Get paid securely</strong><span>Stripe Connect handles KYC, payouts, and refunds so you can focus on your guests.</span></div>
              <div><strong>Discover unique stays</strong><span>From Brooklyn lofts to Big Sur cabins, find the perfect place for your next getaway.</span></div>
            </div>
          </div>
        </aside>
        <section className="auth-shell">
          <Link className="auth-brand" href="/" aria-label="Homely home"><span className="brand-mark">+</span> homely</Link>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="auth-intro">{intro}</p>
          {children}
        </section>
      </div>
    </main>
  );
}
