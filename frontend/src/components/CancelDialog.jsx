import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Warning } from "@phosphor-icons/react";
import { cancelBooking } from "@/lib/api";

const REASONS = [
  "Plans changed",
  "Booked the wrong time slot",
  "Service no longer needed",
  "Found a different option",
  "Other",
];

export default function CancelDialog({ open, booking, onClose, onCancelled }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [custom, setCustom] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open || !booking) return null;

  const submit = async () => {
    setErr("");
    setLoading(true);
    try {
      const finalReason = reason === "Other" ? custom.trim() || "Other" : reason;
      const updated = await cancelBooking(booking.id, finalReason);
      onCancelled?.(updated);
      onClose?.();
    } catch (ex) {
      setErr(ex?.response?.data?.detail || "Could not cancel booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] grid place-items-end sm:place-items-center bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        data-testid="cancel-dialog"
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      >
        <motion.div
          className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-stone-200 p-6 shadow-2xl"
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-red-50 grid place-items-center">
                <Warning size={20} weight="fill" className="text-red-700" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-red-700">Cancel booking</div>
                <h3 className="font-display text-lg font-bold text-stone-900">{booking.service_name}</h3>
              </div>
            </div>
            <button onClick={onClose} data-testid="cancel-dialog-close" className="h-9 w-9 grid place-items-center rounded-full hover:bg-stone-100 text-stone-500">
              <X size={18} />
            </button>
          </div>

          <p className="mt-4 text-sm text-stone-500">Help us improve — why are you cancelling?</p>

          <div className="mt-4 space-y-2">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                data-testid={`cancel-reason-${r.toLowerCase().replace(/\s+/g, "-")}`}
                className={`w-full text-left px-4 py-3 rounded-2xl ring-1 transition-colors ${
                  reason === r ? "bg-red-50 ring-red-300 text-red-900 font-semibold" : "bg-stone-50 ring-stone-200 text-stone-700 hover:ring-stone-300"
                }`}
              >
                {r}
              </button>
            ))}
            {reason === "Other" && (
              <textarea
                rows={2}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Tell us a bit more (optional)…"
                data-testid="cancel-custom-reason"
                className="w-full rounded-2xl bg-stone-50 ring-1 ring-stone-200 px-4 py-3 outline-none focus:ring-2 focus:ring-red-300 text-sm resize-none"
              />
            )}
          </div>

          {err && <div className="mt-3 text-sm text-red-700 bg-red-50 rounded-2xl px-4 py-3" data-testid="cancel-error">{err}</div>}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              data-testid="cancel-dialog-back"
              className="flex-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold py-3 px-5"
            >
              Keep booking
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={submit}
              data-testid="cancel-dialog-confirm"
              className="flex-1 rounded-full bg-red-700 hover:bg-red-800 text-white font-semibold py-3 px-5 disabled:opacity-60"
            >
              {loading ? "Cancelling…" : "Cancel booking"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
