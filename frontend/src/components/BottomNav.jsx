import { NavLink } from "react-router-dom";
import { House, Receipt, UserCircle, MapPin } from "@phosphor-icons/react";

const items = [
  { to: "/", label: "Home", icon: House, testId: "nav-home" },
  { to: "/bookings", label: "Bookings", icon: Receipt, testId: "nav-bookings" },
  { to: "/track", label: "Track", icon: MapPin, testId: "nav-track" },
  { to: "/profile", label: "Profile", icon: UserCircle, testId: "nav-profile" },
];

export default function BottomNav() {
  return (
    <nav
      data-testid="bottom-nav"
      className="fixed bottom-0 inset-x-0 z-50 backdrop-blur-xl bg-white/80 border-t border-stone-200/60"
    >
      <div className="mx-auto max-w-lg md:max-w-2xl lg:max-w-5xl px-6 py-3 grid grid-cols-4 gap-2">
        {items.map(({ to, label, icon: Icon, testId }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            data-testid={testId}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2 rounded-2xl transition-colors ${
                isActive ? "text-green-800 bg-green-50" : "text-stone-500 hover:text-stone-800"
              }`
            }
          >
            <Icon size={22} weight="duotone" />
            <span className="text-[11px] font-semibold tracking-wide">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
