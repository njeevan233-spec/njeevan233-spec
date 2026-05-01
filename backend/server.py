from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import math
import random
import jwt as pyjwt
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
JWT_TTL_DAYS = 7
OTP_TTL_SECONDS = 300

app = FastAPI(title="HomeGlow Services API")
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/api/auth")


# ---------- Service Catalog ----------
SERVICES = [
    {"id": "kitchen-prep", "name": "Kitchen Preparation", "price": 499, "duration_min": 90, "icon": "CookingPot", "tint": "amber", "desc": "Prep your kitchen for the day with a skilled home cook."},
    {"id": "fan-cleaning", "name": "Fan Cleaning", "price": 199, "duration_min": 45, "icon": "Fan", "tint": "sky", "desc": "Ceiling fan dust & grease wipe-down, all rooms."},
    {"id": "laundry", "name": "Laundry", "price": 299, "duration_min": 120, "icon": "TShirt", "tint": "rose", "desc": "Pick-up, wash, fold & return within 24 hrs."},
    {"id": "balcony-cleaning", "name": "Balcony Cleaning", "price": 249, "duration_min": 60, "icon": "Plant", "tint": "emerald", "desc": "Deep clean for balconies & planters."},
    {"id": "ironing-folding", "name": "Ironing & Folding", "price": 149, "duration_min": 45, "icon": "IronFill", "tint": "orange", "desc": "Crisp ironing + neat folding of up to 20 garments."},
    {"id": "party-server", "name": "Party Server", "price": 799, "duration_min": 240, "icon": "Wine", "tint": "fuchsia", "desc": "Professional server for your gatherings (4 hrs)."},
    {"id": "pre-party-clean", "name": "Pre-Party Express Clean", "price": 599, "duration_min": 90, "icon": "SparkleFill", "tint": "yellow", "desc": "Fast sparkle for surfaces, floors & washrooms before guests arrive."},
    {"id": "after-party-clean", "name": "After-Party Express Clean", "price": 649, "duration_min": 120, "icon": "Broom", "tint": "lime", "desc": "Full reset — dishes, trash, floors & surfaces."},
    {"id": "car-cleaner", "name": "Car Cleaner", "price": 349, "duration_min": 60, "icon": "Car", "tint": "indigo", "desc": "Exterior wash + interior vacuum at your doorstep."},
    {"id": "water-tank-cleaner", "name": "Water Tank Cleaner", "price": 899, "duration_min": 120, "icon": "Drop", "tint": "cyan", "desc": "Overhead tank scrub & sanitisation."},
    {"id": "chef", "name": "Home Chef", "price": 999, "duration_min": 180, "icon": "ChefHat", "tint": "red", "desc": "Skilled chef cooks up to 3 courses at your home."},
    {"id": "bathroom-cleaner", "name": "Bathroom Cleaner", "price": 249, "duration_min": 60, "icon": "Bathtub", "tint": "teal", "desc": "Tile & fixture deep-clean + descaling."},
    {"id": "fridge-cleaning", "name": "Fridge Cleaning", "price": 299, "duration_min": 60, "icon": "Snowflake", "tint": "blue", "desc": "Defrost, wipe-down & odour-neutralise."},
    {"id": "sweep-mop", "name": "Sweeping & Mopping", "price": 179, "duration_min": 45, "icon": "Broom", "tint": "stone", "desc": "Quick whole-home sweep + wet mop."},
    {"id": "window-cleaning", "name": "Window Cleaning", "price": 229, "duration_min": 60, "icon": "SelectionBackground", "tint": "slate", "desc": "Streak-free glass + frame wipe-down."},
]
SERVICE_BY_ID = {s["id"]: s for s in SERVICES}


# ---------- Models ----------
class Address(BaseModel):
    line1: str
    area: Optional[str] = ""
    city: str = "Mysuru"
    pincode: Optional[str] = ""
    lat: float = 12.2958
    lng: float = 76.6394


class BookingCreate(BaseModel):
    service_id: str
    customer_name: Optional[str] = None
    phone: Optional[str] = None
    scheduled_for: str
    address: Address
    notes: Optional[str] = ""


class Booking(BaseModel):
    id: str
    service_id: str
    service_name: str
    price: int
    customer_name: str
    phone: str
    scheduled_for: str
    address: Address
    notes: str = ""
    status: str = "pending"
    payment: Optional[dict] = None
    provider: Optional[dict] = None
    created_at: str
    user_id: Optional[str] = None


class PaymentConfirm(BaseModel):
    utr: str
    method: str = "upi"


class StatusUpdate(BaseModel):
    status: str


class OtpRequest(BaseModel):
    phone: str
    name: Optional[str] = None


class OtpVerify(BaseModel):
    otp_id: str
    otp: str


class PublicUser(BaseModel):
    id: str
    phone: str
    name: Optional[str] = None
    created_at: str


# ---------- Helpers ----------
PROVIDER_POOL = [
    {"name": "Ramesh K.", "rating": 4.9, "vehicle": "Scooter · KA-09-AB 4492"},
    {"name": "Aisha M.",  "rating": 4.8, "vehicle": "Scooter · KA-09-BC 7781"},
    {"name": "Vikram S.", "rating": 4.9, "vehicle": "Bike · KA-09-CD 1120"},
    {"name": "Priya N.",  "rating": 5.0, "vehicle": "Scooter · KA-09-DE 9032"},
]


def _haversine_km(a_lat, a_lng, b_lat, b_lng):
    R = 6371.0
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dp = math.radians(b_lat - a_lat)
    dl = math.radians(b_lng - a_lng)
    x = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(x))


def _normalize_phone(raw: str) -> str:
    digits = "".join(ch for ch in (raw or "") if ch.isdigit())
    # Strip Indian country code 91 if 12-digit
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    return digits


def _create_jwt(user_id: str, phone: str) -> str:
    payload = {
        "sub": user_id,
        "phone": phone,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_TTL_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth[7:]
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------- Auth Routes ----------
@auth_router.post("/request-otp")
async def request_otp(payload: OtpRequest):
    phone = _normalize_phone(payload.phone)
    if len(phone) != 10:
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit Indian mobile number")

    otp_code = f"{random.randint(0, 999999):06d}"
    otp_id = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=OTP_TTL_SECONDS)

    await db.otps.insert_one({
        "id": otp_id,
        "phone": phone,
        "otp": otp_code,
        "name_hint": (payload.name or "").strip()[:60],
        "expires_at": expires_at,
        "verified": False,
        "created_at": datetime.now(timezone.utc),
    })

    logger = logging.getLogger("auth")
    logger.info(f"[MOCK OTP] phone={phone} code={otp_code}")

    # MOCK: return otp directly to client (demo only — never do this with real SMS)
    return {
        "otp_id": otp_id,
        "phone": phone,
        "otp": otp_code,
        "expires_in": OTP_TTL_SECONDS,
        "demo": True,
    }


@auth_router.post("/verify-otp")
async def verify_otp(payload: OtpVerify):
    rec = await db.otps.find_one({"id": payload.otp_id}, {"_id": 0})
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid OTP request")
    if rec.get("verified"):
        raise HTTPException(status_code=400, detail="OTP already used")
    if rec["expires_at"].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired — please request a new one")
    if (payload.otp or "").strip() != rec["otp"]:
        raise HTTPException(status_code=400, detail="Incorrect OTP")

    phone = rec["phone"]
    user = await db.users.find_one({"phone": phone}, {"_id": 0})
    if not user:
        user = {
            "id": str(uuid.uuid4()),
            "phone": phone,
            "name": rec.get("name_hint") or "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user.copy())
    elif rec.get("name_hint") and not user.get("name"):
        await db.users.update_one({"id": user["id"]}, {"$set": {"name": rec["name_hint"]}})
        user["name"] = rec["name_hint"]

    await db.otps.update_one({"id": rec["id"]}, {"$set": {"verified": True}})

    token = _create_jwt(user["id"], user["phone"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "phone": user["phone"],
            "name": user.get("name") or "",
            "created_at": user["created_at"],
        },
    }


@auth_router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "phone": user["phone"],
        "name": user.get("name") or "",
        "created_at": user["created_at"],
    }


# ---------- Service & Booking Routes ----------
@api_router.get("/")
async def root():
    return {"message": "HomeGlow API running"}


@api_router.get("/services")
async def list_services():
    return SERVICES


@api_router.post("/bookings", response_model=Booking)
async def create_booking(payload: BookingCreate, user: dict = Depends(get_current_user)):
    service = SERVICE_BY_ID.get(payload.service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Unknown service")

    customer_name = (payload.customer_name or user.get("name") or "Customer").strip()
    phone = _normalize_phone(payload.phone or user.get("phone") or "")
    if len(phone) != 10:
        raise HTTPException(status_code=400, detail="Valid phone required")

    # Persist updated name on the user profile if provided
    if payload.customer_name and payload.customer_name.strip() and user.get("name") != payload.customer_name.strip():
        await db.users.update_one({"id": user["id"]}, {"$set": {"name": payload.customer_name.strip()}})

    provider = random.choice(PROVIDER_POOL)
    bearing = random.uniform(0, 2 * math.pi)
    offset_lat = payload.address.lat + math.cos(bearing) * 0.022
    offset_lng = payload.address.lng + math.sin(bearing) * 0.022

    booking = {
        "id": str(uuid.uuid4()),
        "service_id": service["id"],
        "service_name": service["name"],
        "price": service["price"],
        "customer_name": customer_name,
        "phone": phone,
        "scheduled_for": payload.scheduled_for,
        "address": payload.address.model_dump(),
        "notes": payload.notes or "",
        "status": "pending",
        "payment": None,
        "provider": {
            **provider,
            "lat": offset_lat,
            "lng": offset_lng,
            "started_at": datetime.now(timezone.utc).isoformat(),
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": user["id"],
    }
    await db.bookings.insert_one(booking.copy())
    return Booking(**booking)


@api_router.get("/bookings", response_model=List[Booking])
async def list_bookings(user: dict = Depends(get_current_user)):
    docs = await db.bookings.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Booking(**d) for d in docs]


@api_router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str, user: dict = Depends(get_current_user)):
    doc = await db.bookings.find_one({"id": booking_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Booking not found")
    return Booking(**doc)


@api_router.post("/bookings/{booking_id}/payment", response_model=Booking)
async def confirm_payment(booking_id: str, payload: PaymentConfirm, user: dict = Depends(get_current_user)):
    doc = await db.bookings.find_one({"id": booking_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Booking not found")
    update = {
        "payment": {
            "utr": payload.utr,
            "method": payload.method,
            "paid_at": datetime.now(timezone.utc).isoformat(),
        },
        "status": "confirmed",
    }
    await db.bookings.update_one({"id": booking_id}, {"$set": update})
    doc.update(update)
    return Booking(**doc)


@api_router.patch("/bookings/{booking_id}/status", response_model=Booking)
async def update_status(booking_id: str, payload: StatusUpdate, user: dict = Depends(get_current_user)):
    allowed = {"pending", "paid", "confirmed", "on-the-way", "arrived", "completed", "cancelled"}
    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid status")
    doc = await db.bookings.find_one({"id": booking_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Booking not found")
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": payload.status}})
    doc["status"] = payload.status
    return Booking(**doc)


@api_router.get("/bookings/{booking_id}/tracking")
async def tracking(booking_id: str, user: dict = Depends(get_current_user)):
    doc = await db.bookings.find_one({"id": booking_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Booking not found")

    addr = doc["address"]
    prov = doc.get("provider") or {}
    p_lat = prov.get("lat", addr["lat"])
    p_lng = prov.get("lng", addr["lng"])

    new_lat = p_lat + (addr["lat"] - p_lat) * 0.22
    new_lng = p_lng + (addr["lng"] - p_lng) * 0.22

    distance_km = _haversine_km(new_lat, new_lng, addr["lat"], addr["lng"])
    eta_min = max(1, int(distance_km * 4))

    prov.update({"lat": new_lat, "lng": new_lng})
    await db.bookings.update_one({"id": booking_id}, {"$set": {"provider": prov}})

    status = doc["status"]
    if status == "confirmed" and distance_km < 5:
        status = "on-the-way"
        await db.bookings.update_one({"id": booking_id}, {"$set": {"status": status}})
    if status == "on-the-way" and distance_km < 0.25:
        status = "arrived"
        await db.bookings.update_one({"id": booking_id}, {"$set": {"status": status}})

    return {
        "booking_id": booking_id,
        "status": status,
        "customer": {"lat": addr["lat"], "lng": addr["lng"]},
        "provider": {
            "name": prov.get("name"),
            "rating": prov.get("rating"),
            "vehicle": prov.get("vehicle"),
            "lat": new_lat,
            "lng": new_lng,
        },
        "distance_km": round(distance_km, 2),
        "eta_min": eta_min,
    }


app.include_router(auth_router)
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("phone", unique=True)
    # Recreate OTP TTL index if it differs from desired
    try:
        await db.otps.create_index("expires_at", expireAfterSeconds=OTP_TTL_SECONDS)
    except Exception:
        await db.otps.drop_index("expires_at_1")
        await db.otps.create_index("expires_at", expireAfterSeconds=OTP_TTL_SECONDS)
    await db.bookings.create_index("user_id")
    await db.bookings.create_index("id", unique=True)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
