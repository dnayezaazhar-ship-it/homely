import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import Navbar from "../../../components/Navbar";
import StripeOnboardingStatus from "../../../components/StripeOnboardingStatus";

export default function StripeOnboardingPage() {
  return <main className="stripe-onboarding-page">
    <Navbar />
    <section className="stripe-onboarding-shell">
      <Link className="back-link" href="/host"><ArrowLeft size={16} /> Host dashboard</Link>
      <h1>Stripe Connect onboarding</h1>
      <p className="stripe-onboarding-intro">Hosts collect payouts through Stripe Connect Express. Homely takes a small platform fee on each booking; the rest goes straight to your bank.</p>
      <div className="stripe-onboarding-card">
        <h2>Status</h2>
        <StripeOnboardingStatus />
        <p>Complete onboarding with Stripe so you can publish listings and accept bookings.</p>
        <div className="stripe-onboarding-actions"><a className="stripe-continue-button" href="/api/stripe/connect/onboarding"><ExternalLink size={15} /> Continue with Stripe</a></div>
      </div>
    </section>
  </main>;
}