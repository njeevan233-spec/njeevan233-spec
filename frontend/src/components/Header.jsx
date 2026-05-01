import { Link } from "react-router-dom";
import { Sparkle, SignIn, UserCircle } from "@phosphor-icons/react";
import { useAuth } from "@/auth/AuthContext";

export default function Header({ subtitle }) {
  const { user } = useAuth();

  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-stone-200/60"
    >
      <div className="mx-auto max-w-lg md:max-w-2xl lg:max-w-5xl px-5 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="brand-logo">
          <div className="relative h-9 w-9 rounded-2xl bg-gradient-to-br from-green-700 to-green-900 grid place-items-center shadow-sm">
            <Sparkle size={20} weight="fill" className="text-amber-300" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-bold text-stone-900">HomeGlow</div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-green-800 font-bold">
              {subtitle || "Home Services"}
            </div>
          </div>
        </Link>

        {user ? (
          <Link to="/profile" data-testid="header-user-chip" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 transition-colors">
            <UserCircle size={20} weight="duotone" className="text-stone-700" />
            <span className="text-xs font-semibold text-stone-800 hidden sm:inline">
              {user.name || `+91 ${(user.phone || "").slice(-4)}`}
            </span>
          </Link>
        ) : (
          <Link to="/login" data-testid="header-login-btn" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-800 hover:bg-green-900 text-white text-xs font-semibold transition-colors">
            <SignIn size={14} weight="bold" /> Login
          </Link>
        )}
      </div>
    </header>
  );
}
