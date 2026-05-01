import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ClockCountdown } from "@phosphor-icons/react";
import Header from "@/components/Header";
import { listBookings } from "@/lib/api";

const STATUS_STYLE = {
  pending:     "bg-stone-100 text-stone-700 ring-stone-200",
  paid:        "bg-amber-100 text-amber-800 ring-amber-200",
  confirmed:   "bg-green-100 text-green-800 ring-green-200",
  "on-the-way":"bg-blue-100 text-blue-800 ring-blue-200",
  arrived:     "bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200",
  completed:   "bg-emerald-100 text-emerald-800 ring-emerald-200",
  cancelled:   "bg-red-100 text-red-800 ring-red-200",
};

export default function Bookings() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    listBookings().then(setItems).catch(() => setItems([]));
  }, []);

  return (
    <>
      <Header subtitle="My bookings" />
      <main className="mx-auto max-w-lg md:max-w-2xl px-4 sm:px-6 py-6 safe-bottom">
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-green-800">History</div>
          <h1 className="font-display text-3xl font-bold text-stone-900 mt-1">Your bookings</h1>
        </div>

        {items === null ? (
          <div className="text-stone-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-300 p-10 text-center" data-testid="empty-bookings">
            <div className="inline-flex h-14 w-14 rounded-2xl bg-stone-100 grid place-items-center mb-4">
              <ClockCountdown size={28} className="text-stone-500" weight="duotone" />
            </div>
            <h3 className="font-display text-xl font-bold text-stone-900">No bookings yet</h3>
            <p className="text-sm text-stone-500 mt-1">Pick a service from the home screen to get started.</p>
            <Link to="/" data-testid="go-home-link" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-green-800 hover:text-green-900">
              Browse services <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <ul className="space-y-3" data-testid="bookings-list">
            {items.map((b, i) => (
              <motion.li
                key={b.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.25) }}
              >
                <Link
                  to={`/track/${b.id}`}
                  data-testid={`booking-item-${b.id}`}
                  className="block bg-white border border-stone-200 rounded-3xl p-5 hover:border-green-800/30 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-stone-500 font-mono">
                        #{b.id.slice(0, 8)}
                      </div>
                      <div className="font-display font-bold text-stone-900 text-lg mt-0.5">{b.service_name}</div>
                      <div className="text-xs text-stone-500 mt-1">
                        {fmtDate(b.scheduled_for)} · {b.address.line1}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-stone-900">₹{b.price}</div>
                      <span className={`mt-2 inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ring-1 ${STATUS_STYLE[b.status] || STATUS_STYLE.pending}`}>
                        {b.status}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}
