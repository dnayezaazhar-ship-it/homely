import Link from "next/link";
import Navbar from "../../components/Navbar";

export default function HostPage() {
  return <main className="min-h-screen bg-(--paper)"><Navbar /><section className="host-page"><p className="eyebrow">Become a host</p><h1>Make space for a stay worth remembering.</h1><p>Listing creation, calendar management, booking requests, and Connect onboarding will live here.</p><Link href="/become-a-host">Create your first listing <span aria-hidden="true">→</span></Link></section></main>;
}
