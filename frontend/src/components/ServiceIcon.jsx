import {
  CookingPot,
  Fan,
  WashingMachine,
  Plant,
  ShirtFolded,
  Wine,
  Sparkle,
  Broom,
  Car,
  Drop,
  ChefHat,
  Bathtub,
  Snowflake,
  SelectionBackground,
} from "@phosphor-icons/react";

const MAP = {
  CookingPot,
  Fan,
  TShirt: WashingMachine,
  Plant,
  IronFill: ShirtFolded,
  Wine,
  SparkleFill: Sparkle,
  Broom,
  Car,
  Drop,
  ChefHat,
  Bathtub,
  Snowflake,
  SelectionBackground,
};

const TINT = {
  amber:    { bg: "bg-amber-50",    ring: "ring-amber-100",    txt: "text-amber-700" },
  sky:      { bg: "bg-sky-50",      ring: "ring-sky-100",      txt: "text-sky-700" },
  rose:     { bg: "bg-rose-50",     ring: "ring-rose-100",     txt: "text-rose-700" },
  emerald:  { bg: "bg-emerald-50",  ring: "ring-emerald-100",  txt: "text-emerald-700" },
  orange:   { bg: "bg-orange-50",   ring: "ring-orange-100",   txt: "text-orange-700" },
  fuchsia:  { bg: "bg-fuchsia-50",  ring: "ring-fuchsia-100",  txt: "text-fuchsia-700" },
  yellow:   { bg: "bg-yellow-50",   ring: "ring-yellow-100",   txt: "text-yellow-700" },
  lime:     { bg: "bg-lime-50",     ring: "ring-lime-100",     txt: "text-lime-700" },
  indigo:   { bg: "bg-indigo-50",   ring: "ring-indigo-100",   txt: "text-indigo-700" },
  cyan:     { bg: "bg-cyan-50",     ring: "ring-cyan-100",     txt: "text-cyan-700" },
  red:      { bg: "bg-red-50",      ring: "ring-red-100",      txt: "text-red-700" },
  teal:     { bg: "bg-teal-50",     ring: "ring-teal-100",     txt: "text-teal-700" },
  blue:     { bg: "bg-blue-50",     ring: "ring-blue-100",     txt: "text-blue-700" },
  stone:    { bg: "bg-stone-100",   ring: "ring-stone-200",    txt: "text-stone-700" },
  slate:    { bg: "bg-slate-100",   ring: "ring-slate-200",    txt: "text-slate-700" },
};

export default function ServiceIcon({ name, tint = "stone", size = 28 }) {
  const Icon = MAP[name] || Sparkle;
  const t = TINT[tint] || TINT.stone;
  return (
    <div className={`h-12 w-12 grid place-items-center rounded-2xl ring-1 ${t.bg} ${t.ring}`}>
      <Icon size={size} weight="duotone" className={t.txt} />
    </div>
  );
}

export { TINT };
