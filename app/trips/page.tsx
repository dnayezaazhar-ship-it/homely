import { ArrowRight, Compass } from "lucide-react";
import Link from "next/link";
import Navbar from "../../components/Navbar";

export default function TripsPage() {
  return (
    <main className="min-h-screen bg-(--paper)">
      <Navbar />
      <section className="mx-auto max-w-5xl px-[6vw] py-16 max-[620px]:px-5 max-[620px]:py-10">
        <p className="eyebrow">Your travels</p>
        <h1 className="mb-4 text-6xl font-normal leading-[0.95] tracking-[-3px] max-[620px]:text-5xl">Trips</h1>
        <p className="max-w-md text-lg leading-7 text-(--muted)">Your upcoming and past stays.</p>
        <div className="trips-tabs" role="tablist" aria-label="Trips filter">
          <button className="active" type="button" role="tab" aria-selected="true">Upcoming</button>
          <button type="button" role="tab" aria-selected="false">Past</button>
        </div>
        <div className="trips-divider" />
        <div className="trips-empty-state">
          <span className="mb-5 grid h-14 w-14 place-items-center rounded-full bg-(--cream) text-(--coral)"><Compass size={25} /></span>
          <h2 className="mb-3 text-3xl font-normal tracking-[-1px]">You don&apos;t have any upcoming trips.</h2>
          <p className="mb-7 max-w-sm leading-6 text-(--muted)">Time to plan something.</p>
          <Link className="inline-flex items-center gap-2 bg-(--ink) px-5 py-3 font-sans text-sm text-white transition-colors hover:bg-(--coral)" href="/stays">Browse stays <ArrowRight size={16} /></Link>
        </div>
      </section>
    </main>
  );
}
