import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Phone, NavigationArrow, Star, Path, CheckCircle, CalendarBlank, X } from "@phosphor-icons/react";
import Header from "@/components/Header";
import CancelDialog from "@/components/CancelDialog";
import RescheduleDialog from "@/components/RescheduleDialog";
import { getBooking, getTracking } from "@/lib/api";

const STATUSES = [
  { key: "confirmed",  label: "Confirmed" },
  { key: "on-the-way", label: "On the way" },
  { key: "arrived",    label: "Arrived" },
  { key: "completed",  label: "Completed" },
];

const CANCELLABLE = new Set(["pending", "paid", "confirmed", "on-the-way"]);
const RESCHEDULABLE = new Set(["pending", "paid", "confirmed"]);

export default function Tracking() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [track, setTrack] = useState(null);
  const [showCancel, setShowCancel] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    getBooking(bookingId).then((b) => mounted && setBooking(b)).catch(() => {});

    const pull = async () => {
      try {
        const t = await getTracking(bookingId);
        if (mounted) setTrack(t);
      } catch { /* noop */ }
    };
    pull();
    timerRef.current = setInterval(pull, 3000);
    return () => {
      mounted = false;
      clearInterval(timerRef.current);
    };
  }, [bookingId]);

  const status = track?.status || booking?.status || "pending";
  const activeIdx = STATUSES.findIndex((s) => s.key === status);
  const canCancel = booking && CANCELLABLE.has(status);
  const canReschedule = booking && RESCHEDULABLE.has(status);
  const isCancelled = status === "cancelled";

  const refreshAfterChange = (updated) => {
    setBooking(updated);
    // Re-pull tracking to sync status; if cancelled, the polling endpoint freezes too
    getTracking(bookingId).then(setTrack).catch(() => {});
  };

  return (
    <>
      <Header subtitle="Live Tracking" />
      <main className="mx-auto max-w-lg md:max-w-2xl px-4 sm:px-6 py-6 safe-bottom">
        <Link to="/bookings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-stone-900" data-testid="back-bookings">
          <ArrowLeft size={16} /> All bookings
        </Link>

        {!booking || !track ? (
          <div className="mt-8 text-stone-500" data-testid="tracking-loading">Warming up the AI tracker…</div>
        ) : (
          <div className="mt-4 space-y-6">
            {/* AI MAP CARD */}
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-[28px] bg-black border border-stone-800 p-6"
              data-testid="ai-map-card"
            >
              <div className="absolute inset-0 opacity-60">
                <AIMapBackdrop progress={progressFromDistance(track.distance_km)} />
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] font-bold text-amber-400">
                    <span className="h-2 w-2 rounded-full bg-amber-400 pulse-dot" /> Live AI Route
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-stone-400 font-mono">
                    {track.provider.lat.toFixed(4)}, {track.provider.lng.toFixed(4)}
                  </div>
                </div>

                <div className="mt-40 sm:mt-52 grid grid-cols-3 gap-4">
                  <Stat label="Distance" value={`${track.distance_km} km`} accent />
                  <Stat label="ETA" value={`${track.eta_min} min`} />
                  <Stat label="Status" value={prettyStatus(status)} />
                </div>
              </div>
            </motion.section>

            {/* Provider card */}
            <section className="bg-white border border-stone-200 rounded-3xl p-5" data-testid="provider-card">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-700 to-green-900 grid place-items-center text-white font-display font-bold text-lg">
                  {initials(track.provider.name)}
                </div>
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-green-800">Your pro</div>
                  <div className="font-display font-semibold text-stone-900">{track.provider.name}</div>
                  <div className="text-xs text-stone-500 mt-0.5 inline-flex items-center gap-1.5">
                    <Star size={12} weight="fill" className="text-amber-500" /> {track.provider.rating} · {track.provider.vehicle}
                  </div>
                </div>
                <a href={`tel:${booking.phone}`} data-testid="call-provider"
                  className="h-11 w-11 rounded-2xl bg-green-800 hover:bg-green-900 text-white grid place-items-center transition-colors">
                  <Phone size={18} weight="fill" />
                </a>
              </div>
            </section>

            {/* Status timeline */}
            <section className="bg-white border border-stone-200 rounded-3xl p-5" data-testid="status-timeline">
              <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-stone-500 mb-4">Progress</div>
              <ol className="space-y-4">
                {STATUSES.map((s, i) => {
                  const done = !isCancelled && i <= activeIdx;
                  const current = !isCancelled && i === activeIdx;
                  return (
                    <li key={s.key} className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full grid place-items-center ring-1 ${done ? "bg-green-800 text-white ring-green-800" : "bg-stone-100 text-stone-400 ring-stone-200"} ${isCancelled ? "opacity-40" : ""}`}>
                        {done ? <CheckCircle size={16} weight="fill" /> : <span className="text-xs font-bold">{i + 1}</span>}
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm font-semibold ${done ? "text-stone-900" : "text-stone-500"} ${isCancelled ? "line-through opacity-60" : ""}`}>{s.label}</div>
                        {current && <div className="text-[11px] text-green-800 font-semibold">In progress…</div>}
                      </div>
                    </li>
                  );
                })}
                {isCancelled && (
                  <li className="flex items-center gap-3" data-testid="timeline-cancelled-node">
                    <div className="h-8 w-8 rounded-full grid place-items-center ring-1 bg-red-700 text-white ring-red-700">
                      <X size={16} weight="bold" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-red-700">Cancelled</div>
                      <div className="text-[11px] text-red-600 font-medium">Booking ended here</div>
                    </div>
                  </li>
                )}
              </ol>
            </section>

            {/* Booking info */}
            <section className="bg-white border border-stone-200 rounded-3xl p-5" data-testid="booking-details">
              <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-stone-500">Booking</div>
              <div className="mt-1 font-display text-xl font-bold text-stone-900">{booking.service_name}</div>
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <Info label="Scheduled" value={fmtDate(booking.scheduled_for)} />
                <Info label={booking.payment ? "Amount paid" : "Amount"} value={`₹${booking.price}`} />
                <Info label="Address" value={`${booking.address.line1}${booking.address.area ? ", " + booking.address.area : ""}`} span />
              </div>
            </section>

            {/* Manage actions */}
            {(canCancel || canReschedule) && (
              <section className="bg-white border border-stone-200 rounded-3xl p-5" data-testid="manage-section">
                <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-stone-500 mb-3">Need a change?</div>
                <div className="flex flex-col sm:flex-row gap-3">
                  {canReschedule && (
                    <button
                      onClick={() => setShowReschedule(true)}
                      data-testid="open-reschedule-btn"
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-900 font-semibold py-3 px-5 transition-colors"
                    >
                      <CalendarBlank size={16} weight="fill" /> Reschedule
                    </button>
                  )}
                  {canCancel && (
                    <button
                      onClick={() => setShowCancel(true)}
                      data-testid="open-cancel-btn"
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-3 px-5 transition-colors ring-1 ring-red-200"
                    >
                      <X size={16} weight="bold" /> Cancel booking
                    </button>
                  )}
                </div>
                <p className="mt-3 text-[11px] text-stone-400">
                  Reschedule up to 1 hour before the slot. Cancel any time before your pro arrives.
                </p>
              </section>
            )}

            {isCancelled && (
              <section className="rounded-3xl bg-red-50 border border-red-200 p-5" data-testid="cancelled-banner">
                <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-red-700">Cancelled</div>
                <p className="mt-1 text-sm text-red-900">
                  This booking was cancelled{booking.cancelled_reason ? ` — “${booking.cancelled_reason}”` : ""}. Need help? Reach out via Profile → Contact support.
                </p>
              </section>
            )}
          </div>
        )}
      </main>

      <CancelDialog
        open={showCancel}
        booking={booking}
        onClose={() => setShowCancel(false)}
        onCancelled={refreshAfterChange}
      />
      <RescheduleDialog
        open={showReschedule}
        booking={booking}
        onClose={() => setShowReschedule(false)}
        onRescheduled={refreshAfterChange}
      />
    </>
  );
}

function AIMapBackdrop({ progress }) {
  // progress 0..1 (1 = provider has arrived). We offset the end of the path accordingly.
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <svg viewBox="0 0 400 260" className="absolute inset-0 h-full w-full">
      <defs>
        <radialGradient id="glowBg" cx="75%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#78350f" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="routeGrad" x1="0" x2="1">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
        <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#1c1917" strokeWidth="0.6" />
        </pattern>
      </defs>

      <rect width="400" height="260" fill="url(#grid)" />
      <rect width="400" height="260" fill="url(#glowBg)" />

      {/* ghost roads */}
      <path d="M -20 200 C 80 140, 160 220, 260 130 S 380 80, 440 60" stroke="#292524" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M -20 200 C 80 140, 160 220, 260 130 S 380 80, 440 60" stroke="#44403c" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="4 8" />

      {/* animated neon route */}
      <path
        className="route-trace"
        d="M -20 200 C 80 140, 160 220, 260 130 S 380 80, 440 60"
        stroke="url(#routeGrad)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {/* customer marker (destination) */}
      <g transform="translate(330 90)">
        <circle r="14" fill="#166534" opacity="0.2" className="pulse-dot" />
        <circle r="7" fill="#22c55e" />
        <circle r="2.5" fill="#0b2d15" />
      </g>

      {/* provider marker (moves along path based on progress) */}
      <ProviderMarker progress={clamped} />
    </svg>
  );
}

function ProviderMarker({ progress }) {
  // Sample points along the same curve — rough linear interpolation between hand-picked points
  const pts = [
    [-20, 200], [80, 165], [160, 180], [220, 155], [260, 130], [300, 110], [340, 90],
  ];
  const t = progress * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(t));
  const f = t - i;
  const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f;
  const y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;

  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="16" fill="#f59e0b" opacity="0.25" className="pulse-dot" />
      <circle r="8" fill="#f59e0b" />
      <circle r="3" fill="#1c1917" />
    </g>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className={`rounded-2xl px-3 py-3 backdrop-blur-sm ${accent ? "bg-amber-400/10 ring-1 ring-amber-400/30" : "bg-white/5 ring-1 ring-white/10"}`}>
      <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-stone-400">{label}</div>
      <div className={`font-display font-bold text-lg ${accent ? "text-amber-300" : "text-white"}`}>{value}</div>
    </div>
  );
}

function Info({ label, value, span }) {
  return (
    <div className={span ? "col-span-2" : ""}>
      <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-stone-500">{label}</div>
      <div className="mt-0.5 text-stone-800">{value}</div>
    </div>
  );
}

function progressFromDistance(km) {
  // Start distance ~2.5km → progress 0 at 2.5, progress 1 at 0
  const START = 2.5;
  return Math.min(1, Math.max(0, (START - km) / START));
}

function prettyStatus(s) {
  return { pending: "Pending", paid: "Paid", confirmed: "Confirmed", "on-the-way": "En route", arrived: "Arrived", completed: "Completed", cancelled: "Cancelled" }[s] || s;
}

function initials(name = "") {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}
