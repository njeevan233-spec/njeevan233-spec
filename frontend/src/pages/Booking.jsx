import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarBlank, Clock, MapPin, Phone, User, Note, CaretRight } from "@phosphor-icons/react";
import Header from "@/components/Header";
import ServiceIcon from "@/components/ServiceIcon";
import { listServices, createBooking } from "@/lib/api";
import { useAuth } from "@/auth/AuthContext";

export default function Booking() {
  const { serviceId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const service = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);

  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000);

  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    date: tomorrow.toISOString().slice(0, 10),
    time: "10:00",
    line1: "",
    area: "",
    city: "Mysuru",
    pincode: "",
    notes: "",
  });

  useEffect(() => {
    listServices().then(setServices).catch(() => setServices([]));
  }, []);

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        customer_name: f.customer_name || user.name || "",
        phone: user.phone || f.phone,
      }));
    }
  }, [user]);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!service) return;
    if (!form.customer_name || !form.phone || !form.line1) {
      setErr("Please fill your name, phone and address.");
      return;
    }
    setLoading(true);
    try {
      const scheduled = new Date(`${form.date}T${form.time}:00`).toISOString();
      const payload = {
        service_id: service.id,
        customer_name: form.customer_name,
        phone: form.phone,
        scheduled_for: scheduled,
        address: {
          line1: form.line1,
          area: form.area,
          city: form.city,
          pincode: form.pincode,
          lat: 12.2958,
          lng: 76.6394,
        },
        notes: form.notes,
      };
      const booking = await createBooking(payload);
      nav(`/pay/${booking.id}`);
    } catch (ex) {
      setErr(ex?.response?.data?.detail || "Could not create booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header subtitle="New Booking" />
      <main className="mx-auto max-w-lg md:max-w-2xl px-4 sm:px-6 py-6 safe-bottom">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-stone-900" data-testid="back-home">
          <ArrowLeft size={16} /> Back
        </Link>

        {!service ? (
          <div className="mt-8 text-stone-500">Loading service…</div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Service summary */}
            <div className="mt-4 bg-white border border-stone-200 rounded-3xl p-5 flex items-center gap-4" data-testid="service-summary">
              <ServiceIcon name={service.icon} tint={service.tint} />
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-green-800">Booking</div>
                <h1 className="font-display text-xl font-bold text-stone-900">{service.name}</h1>
                <p className="text-xs text-stone-500 mt-0.5">{service.desc}</p>
              </div>
              <div className="text-right">
                <div className="font-mono text-lg font-bold text-stone-900">₹{service.price}</div>
                <div className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">{service.duration_min} mins</div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="mt-6 space-y-5" data-testid="booking-form">
              <Field icon={User} label="Your name">
                <input required data-testid="input-name" value={form.customer_name} onChange={update("customer_name")} placeholder="E.g. Ananya Sharma"
                  className="w-full bg-transparent outline-none text-stone-900 placeholder:text-stone-400" />
              </Field>

              <Field icon={Phone} label="Phone number">
                <input required readOnly={Boolean(user?.phone)} data-testid="input-phone" value={form.phone} onChange={update("phone")} placeholder="10-digit mobile"
                  inputMode="tel" className={`w-full bg-transparent outline-none text-stone-900 placeholder:text-stone-400 ${user?.phone ? "cursor-not-allowed text-stone-500" : ""}`} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field icon={CalendarBlank} label="Date">
                  <input type="date" data-testid="input-date" value={form.date} onChange={update("date")}
                    min={today.toISOString().slice(0, 10)}
                    className="w-full bg-transparent outline-none text-stone-900" />
                </Field>
                <Field icon={Clock} label="Time">
                  <input type="time" data-testid="input-time" value={form.time} onChange={update("time")}
                    className="w-full bg-transparent outline-none text-stone-900" />
                </Field>
              </div>

              <Field icon={MapPin} label="Address">
                <input required data-testid="input-address" value={form.line1} onChange={update("line1")}
                  placeholder="Flat / House / Street"
                  className="w-full bg-transparent outline-none text-stone-900 placeholder:text-stone-400" />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Area">
                  <input data-testid="input-area" value={form.area} onChange={update("area")} placeholder="Area / Locality"
                    className="w-full bg-transparent outline-none text-stone-900 placeholder:text-stone-400" />
                </Field>
                <Field label="Pincode">
                  <input data-testid="input-pincode" value={form.pincode} onChange={update("pincode")} placeholder="e.g. 570001"
                    inputMode="numeric" className="w-full bg-transparent outline-none text-stone-900 placeholder:text-stone-400" />
                </Field>
              </div>

              <Field icon={Note} label="Notes (optional)">
                <textarea data-testid="input-notes" rows={3} value={form.notes} onChange={update("notes")}
                  placeholder="Anything the pro should know?"
                  className="w-full bg-transparent outline-none text-stone-900 placeholder:text-stone-400 resize-none" />
              </Field>

              {err && <div data-testid="booking-error" className="text-sm text-red-700 bg-red-50 rounded-2xl px-4 py-3">{err}</div>}

              <button
                disabled={loading}
                type="submit"
                data-testid="submit-booking"
                className="w-full rounded-full bg-green-800 hover:bg-green-900 text-white font-semibold py-4 px-6 transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? "Creating…" : <>Proceed to payment · ₹{service.price} <CaretRight size={16} weight="bold" /></>}
              </button>
            </form>
          </motion.div>
        )}
      </main>
    </>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-stone-500 mb-1.5">{label}</div>
      <div className="flex items-center gap-3 rounded-2xl bg-stone-50/70 ring-1 ring-stone-200 focus-within:ring-2 focus-within:ring-green-800/30 focus-within:border-green-800 px-4 py-3">
        {Icon && <Icon size={18} className="text-stone-400 shrink-0" />}
        <div className="flex-1">{children}</div>
      </div>
    </label>
  );
}
