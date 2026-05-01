"""Backend tests for iteration-3 nearby-provider matching.

Covers:
- GET /api/availability in-range and out-of-range
- POST /api/bookings reserves provider, returns 503 when no pros in range
- Cancel releases provider
- Out-of-radius seed pros (Manoj T., Devi S.) never assigned to Mysuru-centre bookings
- Pool exhaustion: after N bookings at centre, availability=0 / 503 on next
"""
import os
import random
import requests
import pytest
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

MYSURU = {"lat": 12.2958, "lng": 76.6394}
BANGALORE = {"lat": 12.97, "lng": 77.59}


def _rand_phone():
    return "9" + "".join(str(random.randint(0, 9)) for _ in range(9))


def _login(s, name="TEST_U"):
    phone = _rand_phone()
    req = s.post(f"{API}/auth/request-otp", json={"phone": phone, "name": name}).json()
    v = s.post(f"{API}/auth/verify-otp", json={"otp_id": req["otp_id"], "otp": req["otp"]}).json()
    return v["token"], v["user"], phone


@pytest.fixture(scope="module", autouse=True)
def reset_providers():
    """Clear any reservations left by previous iterations so all 8 providers are free."""
    mongo_url = os.environ.get("MONGO_URL")
    # read DB_NAME from backend/.env since the test process doesn't have it
    db_name = os.environ.get("DB_NAME")
    if not db_name:
        with open("/app/backend/.env") as f:
            for line in f:
                if line.startswith("DB_NAME="):
                    db_name = line.split("=", 1)[1].strip()
                    break

    async def _reset():
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        # release all providers (keep seed intact)
        await db.providers.update_many({}, {"$set": {"active_booking_id": None}})
        client.close()

    asyncio.get_event_loop().run_until_complete(_reset())
    yield
    # teardown: release again so we don't leave reservations for next run
    asyncio.get_event_loop().run_until_complete(_reset())


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def auth(s):
    token, user, phone = _login(s, name="TEST_Match")
    return {"Authorization": f"Bearer {token}"}, user, phone


# ---------- /api/availability ----------
class TestAvailability:
    def test_availability_in_range(self, s):
        r = s.get(f"{API}/availability", params=MYSURU)
        assert r.status_code == 200
        d = r.json()
        assert d["available"] is True
        assert d["count"] >= 1
        assert d["count"] <= 6  # only 6 in-range pros seeded
        assert d["nearest_eta_min"] is not None and d["nearest_eta_min"] <= 5
        assert d["radius_km"] == 2.5
        names = [p["name"] for p in d["providers"]]
        assert "Manoj T." not in names
        assert "Devi S." not in names

    def test_availability_out_of_range(self, s):
        r = s.get(f"{API}/availability", params=BANGALORE)
        assert r.status_code == 200
        d = r.json()
        assert d["available"] is False
        assert d["count"] == 0
        assert d["nearest_eta_min"] is None
        assert d["providers"] == []


# ---------- Booking provider matching ----------
class TestBookingProviderMatching:
    def test_booking_in_range_assigns_nearby_provider(self, s, auth):
        h, _, _ = auth
        r = s.post(f"{API}/bookings", headers=h, json={
            "service_id": "laundry",
            "scheduled_for": "2026-03-01T10:00:00Z",
            "address": {"line1": "Nearby St", "lat": MYSURU["lat"], "lng": MYSURU["lng"]},
        })
        assert r.status_code == 200, r.text
        b = r.json()
        p = b["provider"]
        assert p["id"] and p["name"] and p["rating"] and p["vehicle"]
        assert p["lat"] and p["lng"]
        assert p["initial_distance_km"] <= 2.5
        assert p["initial_eta_min"] <= 10
        assert p["name"] not in ("Manoj T.", "Devi S.")

        # cleanup: cancel so this test doesn't consume a provider for other tests
        s.post(f"{API}/bookings/{b['id']}/cancel", headers=h, json={"reason": "TEST_cleanup"})

    def test_booking_out_of_range_503(self, s, auth):
        h, _, _ = auth
        r = s.post(f"{API}/bookings", headers=h, json={
            "service_id": "laundry",
            "scheduled_for": "2026-03-02T10:00:00Z",
            "address": {"line1": "Blr", "lat": BANGALORE["lat"], "lng": BANGALORE["lng"]},
        })
        assert r.status_code == 503
        detail = r.json().get("detail", "")
        assert "no pros" in detail.lower()

    def test_provider_reserved_then_released_on_cancel(self, s, auth):
        h, _, _ = auth
        before = s.get(f"{API}/availability", params=MYSURU).json()["count"]
        b = s.post(f"{API}/bookings", headers=h, json={
            "service_id": "fan-cleaning",
            "scheduled_for": "2026-03-03T10:00:00Z",
            "address": {"line1": "x", "lat": MYSURU["lat"], "lng": MYSURU["lng"]},
        }).json()
        mid = s.get(f"{API}/availability", params=MYSURU).json()["count"]
        assert mid == before - 1, f"expected {before-1} after booking, got {mid}"

        c = s.post(f"{API}/bookings/{b['id']}/cancel", headers=h, json={"reason": "TEST_release"})
        assert c.status_code == 200
        after = s.get(f"{API}/availability", params=MYSURU).json()["count"]
        assert after == before, f"provider not released: before={before} after={after}"

    def test_out_of_radius_seeds_never_assigned(self, s, auth):
        """Book up to 6 times; none of the assigned pros should be Manoj T. or Devi S."""
        h, _, _ = auth
        assigned = []
        booking_ids = []
        # book until pool exhausted or 6 bookings
        for i in range(6):
            r = s.post(f"{API}/bookings", headers=h, json={
                "service_id": "laundry",
                "scheduled_for": f"2026-04-{i+1:02d}T10:00:00Z",
                "address": {"line1": f"addr{i}", "lat": MYSURU["lat"], "lng": MYSURU["lng"]},
            })
            if r.status_code != 200:
                break
            b = r.json()
            assigned.append(b["provider"]["name"])
            booking_ids.append(b["id"])
            # verify initial distance in range
            assert b["provider"]["initial_distance_km"] <= 2.5

        # Assert Manoj/Devi never assigned
        assert "Manoj T." not in assigned, f"out-of-radius Manoj got assigned! All: {assigned}"
        assert "Devi S." not in assigned, f"out-of-radius Devi got assigned! All: {assigned}"

        # Pool of in-range pros is 6, so at least we should have booked multiple
        assert len(assigned) >= 1

        # After exhausting pool, next booking at centre should return 503
        if len(assigned) == 6:
            avail = s.get(f"{API}/availability", params=MYSURU).json()
            assert avail["count"] == 0
            r7 = s.post(f"{API}/bookings", headers=h, json={
                "service_id": "laundry",
                "scheduled_for": "2026-04-07T10:00:00Z",
                "address": {"line1": "7th", "lat": MYSURU["lat"], "lng": MYSURU["lng"]},
            })
            assert r7.status_code == 503

        # cleanup
        for bid in booking_ids:
            s.post(f"{API}/bookings/{bid}/cancel", headers=h, json={"reason": "TEST_cleanup"})


# ---------- Tracking still works on new provider shape ----------
class TestTrackingOnMatchedProvider:
    def test_tracking_converges(self, s, auth):
        h, _, _ = auth
        b = s.post(f"{API}/bookings", headers=h, json={
            "service_id": "laundry",
            "scheduled_for": "2026-05-01T10:00:00Z",
            "address": {"line1": "Track St", "lat": MYSURU["lat"], "lng": MYSURU["lng"]},
        }).json()
        s.post(f"{API}/bookings/{b['id']}/payment", headers=h, json={"utr": "TEST_UTR"})

        d_prev = None
        for _ in range(12):
            t = s.get(f"{API}/bookings/{b['id']}/tracking", headers=h).json()
            assert "distance_km" in t
            d = t["distance_km"]
            if d_prev is not None:
                assert d <= d_prev + 1e-6
            d_prev = d
            if d < 0.25:
                break
        assert d_prev is not None and d_prev < 2.5

        # cleanup
        s.post(f"{API}/bookings/{b['id']}/cancel", headers=h, json={"reason": "TEST_cleanup"})
