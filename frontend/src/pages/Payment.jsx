import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, QrCode, SealCheck, CopySimple, CheckCircle } from "@phosphor-icons/react";
import Header from "@/components/Header";
import { getBooking, confirmPayment } from "@/lib/api";

const MERCHANT_UPI = "helpfast@upi";
const MERCHANT_NAME = "HelpFast Services";

export default function Payment() {
  const { bookingId } = useParams();
  const nav = useNavigate();
  const [booking, setBooking] = useState(null);
  const [utr, setUtr] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getBooking(bookingId).then(setBooking).catch(() => setBooking(null));
  }, [bookingId]);

  const amount = booking?.price || 0;
  const upiLink = `upi://pay?pa=${encodeURIComponent(MERCHANT_UPI)}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent("HelpFast Booking " + bookingId.slice(0, 8))}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(upiLink)}&size=320x320&margin=8&bgcolor=FAFAF9`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(MERCHANT_UPI);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* noop */ }
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (utr.trim().length < 6) {
      setErr("Enter a valid UPI reference / UTR (at least 6 characters).");
      return;
    }
    setLoading(true);
    try {
      await confirmPayment(bookingId, { utr: utr.trim(), method: "upi" });
      nav(`/track/${bookingId}`);
    } catch (ex) {
      setErr(ex?.response?.data?.detail || "Payment confirmation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header subtitle="Payment" />
      <main className="mx-auto max-w-lg md:max-w-2xl px-4 sm:px-6 py-6 safe-bottom">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-stone-900" data-testid="back-home">
          <ArrowLeft size={16} /> Back
        </Link>

        {!booking ? (
          <div className="mt-8 text-stone-500">Loading booking…</div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-6">
            {/* Summary */}
            <div className="bg-white border border-stone-200 rounded-3xl p-5" data-testid="payment-summary">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-green-800">Amount payable</div>
                  <div className="font-display text-4xl font-bold text-stone-900 mt-1" data-testid="payment-amount">₹{amount}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-stone-500 font-medium">{booking.service_name}</div>
                  <div className="text-[11px] text-stone-400 font-mono mt-0.5">#{booking.id.slice(0, 8)}</div>
                </div>
              </div>
            </div>

            {/* QR Card */}
            <div className="relative overflow-hidden rounded-3xl bg-white border border-stone-200 p-6" data-testid="upi-qr-card">
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-green-100 blur-2xl" />
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] font-bold text-green-800">
                <QrCode size={16} weight="fill" /> Scan to pay via UPI
              </div>

              <div className="mt-5 grid place-items-center">
                <div className="p-3 rounded-3xl bg-stone-50 ring-1 ring-stone-200">
                  <img src={qrSrc} alt="UPI QR" className="h-56 w-56 rounded-2xl" data-testid="upi-qr-image" />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-2xl bg-stone-50 ring-1 ring-stone-200 px-4 py-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-stone-500">UPI ID</div>
                  <div className="font-mono text-sm font-semibold text-stone-900" data-testid="upi-id">{MERCHANT_UPI}</div>
                </div>
                <button onClick={copy} data-testid="copy-upi" className="inline-flex items-center gap-1.5 text-xs font-bold text-green-800 hover:text-green-900 px-3 py-1.5 rounded-full bg-green-50 ring-1 ring-green-100">
                  {copied ? <><CheckCircle size={14} weight="fill" /> Copied</> : <><CopySimple size={14} /> Copy</>}
                </button>
              </div>

              <a href={upiLink} className="mt-3 block text-center text-xs text-stone-500 font-medium hover:text-green-800" data-testid="upi-intent-link">
                Or tap to open in your UPI app →
              </a>
            </div>

            {/* Confirm */}
            <form onSubmit={submit} className="bg-white border border-stone-200 rounded-3xl p-5 space-y-4" data-testid="confirm-payment-form">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-stone-500 mb-1.5">UPI reference / UTR</div>
                <input
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  placeholder="Paste the 12-digit UTR from your UPI app"
                  data-testid="input-utr"
                  className="w-full rounded-2xl bg-stone-50/70 ring-1 ring-stone-200 focus:ring-2 focus:ring-green-800/30 px-4 py-3 outline-none font-mono text-sm"
                />
              </div>

              {err && <div className="text-sm text-red-700 bg-red-50 rounded-2xl px-4 py-3" data-testid="payment-error">{err}</div>}

              <button disabled={loading} type="submit" data-testid="confirm-payment-btn"
                className="w-full rounded-full bg-green-800 hover:bg-green-900 text-white font-semibold py-4 px-6 transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? "Confirming…" : <><SealCheck size={18} weight="fill" /> I’ve paid — Confirm & Track</>}
              </button>
              <p className="text-[11px] text-stone-400 text-center">
                We verify payments via UTR. Your pro is dispatched the moment we confirm.
              </p>
            </form>
          </motion.div>
        )}
      </main>
    </>
  );
}
