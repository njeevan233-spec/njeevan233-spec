import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkle } from "@phosphor-icons/react";
import Header from "@/components/Header";
import { listBookings } from "@/lib/api";

export default function TrackRedirect() {
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listBookings()
      .then((b) => {
        const active = b.find((x) => !["completed", "cancelled"].includes(x.status)) || b[0] || null;
        setLatest(active);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Header subtitle="Tracking" />
      <main className="mx-auto max-w-lg md:max-w-2xl px-4 sm:px-6 py-6 safe-bottom">
        {loading ? (
          <div className="text-stone-500">Loading…</div>
        ) : latest ? (
          <div className="rounded-3xl bg-white border border-stone-200 p-6" data-testid="track-shortcut">
            <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-green-800">Continue tracking</div>
            <h2 className="font-display text-2xl font-bold text-stone-900 mt-1">{latest.service_name}</h2>
            <p className="text-sm text-stone-500 mt-1">Status: <span className="font-semibold text-stone-800">{latest.status}</span></p>
            <Link to={`/track/${latest.id}`} data-testid="open-latest-tracking" className="mt-5 inline-flex items-center gap-2 rounded-full bg-green-800 hover:bg-green-900 text-white font-semibold px-5 py-3">
              Open live map <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-stone-300 p-10 text-center" data-testid="track-empty">
            <Sparkle size={28} weight="duotone" className="text-stone-500 mx-auto" />
            <h3 className="font-display text-xl font-bold mt-3 text-stone-900">Nothing to track yet</h3>
            <p className="text-sm text-stone-500 mt-1">Book a service and watch your pro arrive in real time.</p>
            <Link to="/" data-testid="track-go-home" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-green-800">
              Browse services <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
