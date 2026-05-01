import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserCircle, MapPin, Phone, Gift, SignOut, SignIn } from "@phosphor-icons/react";
import Header from "@/components/Header";
import { listBookings } from "@/lib/api";
import { useAuth } from "@/auth/AuthContext";

export default function Profile() {
  const { user, logout, bootstrapped } = useAuth();
  const nav = useNavigate();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    listBookings().then((b) => setCount(b.length)).catch(() => setCount(0));
  }, [user]);

  return (
    <>
      <Header subtitle="Profile" />
      <main className="mx-auto max-w-lg md:max-w-2xl px-4 sm:px-6 py-6 safe-bottom">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 to-stone-800 text-stone-100 p-6" data-testid="profile-hero">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/10 grid place-items-center">
              <UserCircle size={40} weight="duotone" className="text-amber-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-amber-400">
                {user ? "Member" : "Guest"}
              </div>
              <div className="font-display text-2xl font-bold truncate" data-testid="profile-name">
                {user ? (user.name || "HelpFast Member") : "Not signed in"}
              </div>
              <div className="text-xs text-stone-400 mt-1" data-testid="profile-meta">
                {user ? <>+91 {user.phone} · {count} booking{count === 1 ? "" : "s"}</> : "Sign in to book and track services"}
              </div>
            </div>
          </div>

          {!user && bootstrapped && (
            <Link to="/login" data-testid="profile-login-btn" className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-900 font-semibold px-5 py-2.5 text-sm">
              <SignIn size={16} weight="bold" /> Sign in with phone
            </Link>
          )}
        </section>

        <ul className="mt-6 space-y-3">
          <Row icon={MapPin} title="Saved addresses" subtitle="Manage home & work" testId="row-addresses" />
          <Row icon={Phone} title="Contact support" subtitle="We reply within minutes" testId="row-support" />
          <Row icon={Gift} title="Refer & earn" subtitle="₹100 off for you and a friend" testId="row-refer" />
          {user && (
            <Row
              icon={SignOut}
              title="Sign out"
              subtitle={`Logged in as +91 ${user.phone}`}
              testId="row-logout"
              danger
              onClick={() => { logout(); nav("/", { replace: true }); }}
            />
          )}
        </ul>

        <div className="mt-8 text-center">
          <Link to="/" data-testid="profile-go-home" className="text-sm font-semibold text-green-800 hover:text-green-900">← Back to services</Link>
        </div>
      </main>
    </>
  );
}

function Row({ icon: Icon, title, subtitle, testId, onClick, danger }) {
  return (
    <li>
      <button
        data-testid={testId}
        onClick={onClick}
        className={`w-full text-left bg-white border rounded-3xl p-4 flex items-center gap-4 transition-colors ${danger ? "border-red-200 hover:border-red-400" : "border-stone-200 hover:border-green-800/30"}`}
      >
        <div className={`h-11 w-11 rounded-2xl grid place-items-center ${danger ? "bg-red-50" : "bg-stone-100"}`}>
          <Icon size={22} weight="duotone" className={danger ? "text-red-700" : "text-stone-700"} />
        </div>
        <div className="flex-1">
          <div className={`font-semibold ${danger ? "text-red-700" : "text-stone-900"}`}>{title}</div>
          <div className="text-xs text-stone-500">{subtitle}</div>
        </div>
      </button>
    </li>
  );
}
