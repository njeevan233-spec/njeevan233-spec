# HomeGlow — Product Requirements (PRD)

## Original Problem Statement
User shared a basic Node.js + Express + Socket.io service booking app and asked to expand it
into a full-featured home-services booking app. Then asked for **phone-number login**
(gated only on Book / My Bookings).

## Stack
- Backend: FastAPI + MongoDB (motor) + PyJWT
- Frontend: React (CRA + craco) + Tailwind + Framer Motion + Phosphor Icons
- Auth: Phone-number + **Mock OTP** (returned in response for demo) → JWT (7-day)

## User Personas
- **Customer** — books home services from phone-first UI, pays via UPI QR, tracks pro live.

## Core Requirements (static)
1. Catalog of 15 home services (kitchen prep → window cleaning) with pricing & duration.
2. Booking flow (date, time, address, notes).
3. UPI QR payment + UTR confirmation.
4. AI-style live route tracking (animated SVG, polling every 3s, auto status advance).
5. My Bookings list with status chips.
6. Phone+OTP auth gating Book / Bookings / Tracking endpoints.

## Implemented (2026-01)
- **Backend** — `/api/services`, `/api/bookings` CRUD + `/payment` + `/tracking`, all booking
  routes JWT-protected. `/api/auth/request-otp`, `/api/auth/verify-otp`, `/api/auth/me`.
  Mongo TTL index on OTPs (10 min). Unique index on `users.phone`.
- **Frontend** — Home (hero + bento), Booking form (auth-prefilled), Payment (UPI QR + UTR),
  Tracking (dark AI map card with live SVG route), Bookings list, Profile (sign in/out),
  Login (phone → OTP, demo code shown + auto-fill).
- Route guard `RequireAuth` redirects to `/login?next=...` for `/book/:id`, `/bookings`,
  `/track/:id`, `/track`. Home & Profile are public.

## Backlog (P1/P2)
- P1 — Real SMS OTP (Twilio) when user provides keys
- P1 — Cancel / reschedule booking
- P2 — Address autocomplete + GPS pin
- P2 — Provider rating after completion
- P2 — Promo codes / referrals (UI present, logic stubbed)

## Notes
- UPI is **MOCKED** (static `homeglow@upi` QR; UTR accepted as proof — no gateway).
- Tracking is **MOCKED** (provider position simulated server-side, no real GPS).
- OTP is **MOCKED** (returned in API response; never do this with real SMS).
