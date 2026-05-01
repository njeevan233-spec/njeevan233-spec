import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CalendarBlank, Clock } from "@phosphor-icons/react";
import { rescheduleBooking } from "@/lib/api";

function pad(n) { return String(n).padStart(2, "0"); }

function defaultNextSlot(currentIso) {
  // 24h after current scheduled time (or now+1d) rounded down to nearest 15 min
  const base = currentIso ? new Date(currentIso) : new Date();
  const next = new Date(base.getTime() + 24 * 3600 * 1000);
  next.setMinutes(Math.floor(next.getMinutes() / 15) * 15, 0, 0);
  return next;
}

export default function RescheduleDialog({ open, booking, onClose, onRescheduled }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !booking) return;
    const next = defaultNextSlot(booking.scheduled_for);
    setDate(`${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`);
    setTime(`${pad(next.getHours())}:${pad(next.getMinutes())}`);
    setErr("");
  }, [open, booking]);

  if (!open || !booking) return null;

  const submit = async () => {
    setErr("");
    if (!date || !time) {
      setErr("Pick a date & time");
      return;
    }
    const local = new Date(`${date}T${time}:00`);
    if (Number.isNaN(local.getTime())) {
      setErr("Invalid date or time");
      return;
    }
    if (local.getTime() <= Date.now() + 60 * 60 * 1000 + 30 * 1000) {
      setErr("Please pick a slot at least 1 hour from now.");
      return;
    }
    setLoading(true);
    try {
      const updated = await rescheduleBooking(booking.id, local.toISOString());
      onRescheduled?.(updated);
      onClose?.();
    } catch (ex) {
      setErr(ex?.response?.data?.detail || "Could not reschedule");
    } finally {
      setLoading(false);
    }
  };

  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);
  const minDateStr = `${minDate.getFullYear()}-${pad(minDate.getMonth() + 1)}-${pad(minDate.getDate())}`;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] grid place-items-end sm:place-items-center bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        data-testid="reschedule-dialog"
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      >
        <motion.div
          className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-stone-200 p-6 shadow-2xl"
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-50 grid place-items-center">
                <CalendarBlank size={20} weight="fill" className="text-amber-700" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-amber-700">Reschedule</div>
                <h3 className="font-display text-lg font-bold text-stone-900">{booking.service_name}</h3>
              </div>
            </div>
            <button onClick={onClose} data-testid="reschedule-dialog-close" className="h-9 w-9 grid place-items-center rounded-full hover:bg-stone-100 text-stone-500">
              <X size={18} />
            </button>
          </div>

          <p className="mt-4 text-sm text-stone-500">
            Pick a new slot at least 1 hour from now. Your provider will be re-assigned automatically.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <Field icon={CalendarBlank} label="Date">
              <input
                type="date"
                value={date}
                min={minDateStr}
                onChange={(e) => setDate(e.target.value)}
                data-testid="reschedule-date"
                className="w-full bg-transparent outline-none text-stone-900"
              />
            </Field>
            <Field icon={Clock} label="Time">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                data-testid="reschedule-time"
                className="w-full bg-transparent outline-none text-stone-900"
              />
            </Field>
          </div>

          {err && <div className="mt-3 text-sm text-red-700 bg-red-50 rounded-2xl px-4 py-3" data-testid="reschedule-error">{err}</div>}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              data-testid="reschedule-dialog-back"
              className="flex-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold py-3 px-5"
            >
              Back
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={submit}
              data-testid="reschedule-dialog-confirm"
              className="flex-1 rounded-full bg-green-800 hover:bg-green-900 text-white font-semibold py-3 px-5 disabled:opacity-60"
            >
              {loading ? "Saving…" : "Confirm new slot"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-stone-500 mb-1.5">{label}</div>
      <div className="flex items-center gap-3 rounded-2xl bg-stone-50/70 ring-1 ring-stone-200 focus-within:ring-2 focus-within:ring-green-800/30 px-4 py-3">
        {Icon && <Icon size={18} className="text-stone-400 shrink-0" />}
        <div className="flex-1">{children}</div>
      </div>
    </label>
  );
}
