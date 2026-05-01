import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChatCircleDots, ShieldCheck } from "@phosphor-icons/react";
import Header from "@/components/Header";
import { useAuth } from "@/auth/AuthContext";
import { requestOtp, verifyOtp } from "@/lib/api";

export default function Login() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/";
  const { user, login } = useAuth();

  const [step, setStep] = useState("phone"); // phone | otp
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [otpId, setOtpId] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const otpInputRef = useRef(null);

  useEffect(() => {
    if (user) nav(decodeURIComponent(next), { replace: true });
  }, [user, next, nav]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (step === "otp") setTimeout(() => otpInputRef.current?.focus(), 200);
  }, [step]);

  const submitPhone = async (e) => {
    e.preventDefault();
    setErr("");
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setErr("Enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    try {
      const res = await requestOtp(digits, name);
      setOtpId(res.otp_id);
      setDemoCode(res.otp || "");
      setStep("otp");
      setResendIn(30);
    } catch (ex) {
      setErr(formatErr(ex));
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    setErr("");
    const code = otp.replace(/\D/g, "");
    if (code.length !== 6) {
      setErr("Enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const { token, user: u } = await verifyOtp(otpId, code);
      login(token, u);
      nav(decodeURIComponent(next), { replace: true });
    } catch (ex) {
      setErr(formatErr(ex));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0) return;
    setErr("");
    setLoading(true);
    try {
      const res = await requestOtp(phone.replace(/\D/g, ""), name);
      setOtpId(res.otp_id);
      setDemoCode(res.otp || "");
      setOtp("");
      setResendIn(30);
    } catch (ex) {
      setErr(formatErr(ex));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header subtitle="Sign in" />
      <main className="mx-auto max-w-lg px-4 sm:px-6 py-6 safe-bottom">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-stone-900" data-testid="login-back">
          <ArrowLeft size={16} /> Back
        </Link>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-green-100 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-green-800">Sign in</div>
            <h1 className="font-display text-3xl font-bold text-stone-900 mt-1">
              {step === "phone" ? "Welcome back." : "Enter the code."}
            </h1>
            <p className="text-sm text-stone-500 mt-2">
              {step === "phone"
                ? "We’ll send a one-time code to your phone. No password needed."
                : `We sent a 6-digit code to +91 ${formatPhone(phone)}.`}
            </p>

            {step === "phone" ? (
              <form onSubmit={submitPhone} className="mt-7 space-y-4" data-testid="phone-form">
                <Field label="Your name (optional)">
                  <input
                    data-testid="login-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="What should we call you?"
                    className="w-full bg-transparent outline-none text-stone-900 placeholder:text-stone-400"
                  />
                </Field>

                <Field label="Mobile number">
                  <div className="flex items-center gap-2 w-full">
                    <span className="font-mono text-stone-500 text-sm">+91</span>
                    <input
                      data-testid="login-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      inputMode="tel"
                      placeholder="98XXXXXXXX"
                      className="flex-1 bg-transparent outline-none text-stone-900 placeholder:text-stone-400 font-mono tracking-wider"
                    />
                  </div>
                </Field>

                {err && <div data-testid="login-error" className="text-sm text-red-700 bg-red-50 rounded-2xl px-4 py-3">{err}</div>}

                <button
                  disabled={loading}
                  data-testid="send-otp-btn"
                  className="w-full rounded-full bg-green-800 hover:bg-green-900 text-white font-semibold py-4 px-6 transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? "Sending…" : <>Send OTP <ArrowRight size={16} weight="bold" /></>}
                </button>

                <p className="text-[11px] text-stone-400 text-center inline-flex items-center justify-center gap-1.5 w-full">
                  <ShieldCheck size={14} weight="duotone" /> Your number stays private. No spam.
                </p>
              </form>
            ) : (
              <form onSubmit={submitOtp} className="mt-7 space-y-4" data-testid="otp-form">
                {demoCode && (
                  <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-3 text-amber-900 text-sm flex items-center justify-between" data-testid="demo-otp-banner">
                    <span className="inline-flex items-center gap-2">
                      <ChatCircleDots size={16} weight="fill" className="text-amber-700" />
                      Demo OTP — auto-filled below
                    </span>
                    <span className="font-mono font-bold text-lg tracking-widest" data-testid="demo-otp-code">{demoCode}</span>
                  </div>
                )}

                <Field label="6-digit code">
                  <input
                    ref={otpInputRef}
                    data-testid="login-otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    placeholder="••••••"
                    className="w-full bg-transparent outline-none text-stone-900 placeholder:text-stone-300 font-mono tracking-[0.6em] text-2xl text-center"
                  />
                </Field>

                {err && <div data-testid="login-error" className="text-sm text-red-700 bg-red-50 rounded-2xl px-4 py-3">{err}</div>}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setOtp(demoCode)}
                    disabled={!demoCode}
                    data-testid="autofill-otp-btn"
                    className="rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold py-3 px-5 text-sm disabled:opacity-50"
                  >
                    Auto-fill
                  </button>
                  <button
                    disabled={loading}
                    type="submit"
                    data-testid="verify-otp-btn"
                    className="flex-1 rounded-full bg-green-800 hover:bg-green-900 text-white font-semibold py-3 px-6 inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? "Verifying…" : <>Verify & continue <ArrowRight size={16} weight="bold" /></>}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-stone-500">
                  <button type="button" onClick={() => { setStep("phone"); setOtp(""); setErr(""); }} className="font-semibold text-stone-700 hover:text-stone-900" data-testid="change-number-btn">
                    Change number
                  </button>
                  <button type="button" onClick={resend} disabled={resendIn > 0 || loading} data-testid="resend-otp-btn" className="font-semibold text-green-800 hover:text-green-900 disabled:text-stone-400">
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend OTP"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </main>
    </>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-stone-500 mb-1.5">{label}</div>
      <div className="flex items-center gap-3 rounded-2xl bg-stone-50/70 ring-1 ring-stone-200 focus-within:ring-2 focus-within:ring-green-800/30 focus-within:border-green-800 px-4 py-3">
        {children}
      </div>
    </label>
  );
}

function formatPhone(p) {
  const d = (p || "").replace(/\D/g, "");
  if (d.length === 10) return `${d.slice(0, 5)} ${d.slice(5)}`;
  return d;
}

function formatErr(ex) {
  const detail = ex?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d?.msg || JSON.stringify(d)).join(" ");
  return ex?.message || "Something went wrong. Please try again.";
}
