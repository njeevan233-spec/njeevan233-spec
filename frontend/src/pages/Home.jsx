import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MagnifyingGlass, ArrowRight, SealCheck, Clock, Lightning, Sparkle } from "@phosphor-icons/react";
import Header from "@/components/Header";
import ServiceIcon, { TINT } from "@/components/ServiceIcon";
import { listServices } from "@/lib/api";

const HERO_BG =
  "https://images.pexels.com/photos/28122113/pexels-photo-28122113.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function Home() {
  const [services, setServices] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    listServices().then(setServices).catch(() => setServices([]));
  }, []);

  const filtered = services.filter((s) =>
    (s.name + " " + s.desc).toLowerCase().includes(q.trim().toLowerCase())
  );

  return (
    <>
      <Header />

      <main className="mx-auto max-w-lg md:max-w-2xl lg:max-w-5xl px-4 sm:px-6 py-6 safe-bottom">
        {/* HERO */}
        <section
          data-testid="hero-section"
          className="relative overflow-hidden rounded-[28px] border border-stone-200 grain"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(250,250,249,0.65), rgba(250,250,249,0.95)), url(${HERO_BG})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="p-6 sm:p-10">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] font-bold text-green-800">
              <Lightning size={14} weight="fill" /> Same-day bookings
            </div>
            <h1 className="font-display mt-3 text-4xl sm:text-5xl font-bold text-stone-900 leading-[1.02]">
              A calmer home,<br />
              <span className="text-green-800">one tap away.</span>
            </h1>
            <p className="mt-3 text-stone-600 max-w-md">
              Verified pros for everything from kitchen prep to after-party resets — with live AI tracking on the way.
            </p>

            {/* Search */}
            <label className="mt-6 flex items-center gap-3 rounded-2xl bg-white/90 ring-1 ring-stone-200 px-4 py-3 shadow-sm">
              <MagnifyingGlass size={20} className="text-stone-400" />
              <input
                data-testid="service-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search ‘bathroom’, ‘laundry’, ‘chef’..."
                className="flex-1 bg-transparent outline-none text-stone-800 placeholder:text-stone-400"
              />
            </label>

            <div className="mt-6 flex flex-wrap gap-4 text-xs text-stone-500 font-medium">
              <span className="inline-flex items-center gap-1.5"><SealCheck size={16} weight="fill" className="text-green-700" /> Background-checked pros</span>
              <span className="inline-flex items-center gap-1.5"><Clock size={16} weight="fill" className="text-amber-600" /> Arrives in 45 mins</span>
            </div>
          </div>
        </section>

        {/* SERVICES BENTO */}
        <section className="mt-10">
          <div className="flex items-end justify-between mb-5">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] font-bold text-green-800">Catalog</div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
                15 services, zero hassle.
              </h2>
            </div>
            <Link to="/bookings" data-testid="view-bookings-link" className="text-sm font-semibold text-green-800 hover:text-green-900 inline-flex items-center gap-1">
              My bookings <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5" data-testid="services-grid">
            {filtered.map((s, i) => {
              const t = TINT[s.tint] || TINT.stone;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.3) }}
                >
                  <Link
                    to={`/book/${s.id}`}
                    data-testid={`service-card-${s.id}`}
                    className="group block bg-white border border-stone-200 rounded-3xl p-5 hover:-translate-y-1 hover:border-green-800/40 transition-all duration-300 shadow-sm hover:shadow-md h-full"
                  >
                    <ServiceIcon name={s.icon} tint={s.tint} />
                    <h3 className="mt-4 font-display text-lg font-semibold text-stone-900 leading-tight">
                      {s.name}
                    </h3>
                    <p className="mt-1 text-xs text-stone-500 line-clamp-2">{s.desc}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-stone-900">
                        ₹{s.price}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${t.bg} ${t.txt}`}>
                        {s.duration_min}m
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Promise */}
        <section className="mt-12 rounded-3xl bg-stone-900 text-stone-100 p-8 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-amber-400">The HomeGlow Promise</div>
          <h3 className="font-display text-2xl sm:text-3xl font-bold mt-2 max-w-md">
            Transparent pricing. Live tracking. No surprises.
          </h3>
          <p className="mt-3 text-stone-400 text-sm max-w-md">
            Pay via UPI with a simple scan. Watch your pro arrive in real time through an AI-powered route visualisation.
          </p>
        </section>
      </main>
    </>
  );
}
