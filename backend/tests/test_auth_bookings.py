"""Backend tests for HomeGlow phone-OTP auth + booking endpoints."""
import os
import random
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # fallback: read frontend .env directly
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


def _rand_phone():
    # always 10 digits, starts with 9 to avoid leading-zero strip issues
    return "9" + "".join(str(random.randint(0, 9)) for _ in range(9))


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# ---------- Auth: /api/auth/request-otp ----------
class TestRequestOtp:
    def test_request_otp_valid(self, s):
        phone = _rand_phone()
        r = s.post(f"{API}/auth/request-otp", json={"phone": phone, "name": "TEST_User"})
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("otp_id", "otp", "phone", "expires_in", "demo"):
            assert k in d, f"missing {k}"
        assert d["demo"] is True
        assert d["phone"] == phone
        assert len(d["otp"]) == 6 and d["otp"].isdigit()
        assert isinstance(d["otp_id"], str) and len(d["otp_id"]) > 0

    def test_request_otp_short_phone(self, s):
        r = s.post(f"{API}/auth/request-otp", json={"phone": "12345"})
        assert r.status_code == 400
        assert "10-digit" in r.text or "phone" in r.text.lower()

    def test_request_otp_strips_country_code(self, s):
        # 91 + 10 digits should be normalized to 10 digits
        phone10 = _rand_phone()
        r = s.post(f"{API}/auth/request-otp", json={"phone": "91" + phone10})
        assert r.status_code == 200
        assert r.json()["phone"] == phone10


# ---------- Auth: /api/auth/verify-otp ----------
class TestVerifyOtp:
    def test_verify_full_flow(self, s):
        phone = _rand_phone()
        req = s.post(f"{API}/auth/request-otp", json={"phone": phone, "name": "TEST_Alice"}).json()
        v = s.post(f"{API}/auth/verify-otp", json={"otp_id": req["otp_id"], "otp": req["otp"]})
        assert v.status_code == 200, v.text
        d = v.json()
        assert "token" in d and isinstance(d["token"], str) and len(d["token"]) > 20
        assert "user" in d
        assert d["user"]["phone"] == phone
        assert d["user"]["name"] == "TEST_Alice"
        assert "id" in d["user"] and d["user"]["id"]

        # second verify with same otp_id should be blocked as already used
        v2 = s.post(f"{API}/auth/verify-otp", json={"otp_id": req["otp_id"], "otp": req["otp"]})
        assert v2.status_code == 400
        assert "already" in v2.text.lower() or "used" in v2.text.lower()

    def test_verify_wrong_otp(self, s):
        phone = _rand_phone()
        req = s.post(f"{API}/auth/request-otp", json={"phone": phone}).json()
        wrong = "000000" if req["otp"] != "000000" else "111111"
        v = s.post(f"{API}/auth/verify-otp", json={"otp_id": req["otp_id"], "otp": wrong})
        assert v.status_code == 400

    def test_verify_nonexistent_otp_id(self, s):
        v = s.post(f"{API}/auth/verify-otp", json={"otp_id": "non-existent-id-xyz", "otp": "123456"})
        assert v.status_code == 400


# ---------- Auth: /api/auth/me ----------
class TestMe:
    def test_me_with_token(self, s):
        phone = _rand_phone()
        req = s.post(f"{API}/auth/request-otp", json={"phone": phone, "name": "TEST_Me"}).json()
        v = s.post(f"{API}/auth/verify-otp", json={"otp_id": req["otp_id"], "otp": req["otp"]}).json()
        token = v["token"]
        r = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        me = r.json()
        assert me["phone"] == phone
        assert me["id"] == v["user"]["id"]
        assert me["name"] == "TEST_Me"

    def test_me_without_token(self, s):
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_invalid_token(self, s):
        r = s.get(f"{API}/auth/me", headers={"Authorization": "Bearer notajwt"})
        assert r.status_code == 401


# ---------- Public: /api/services ----------
class TestServicesPublic:
    def test_services_public(self, s):
        r = s.get(f"{API}/services")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 10
        assert {"id", "name", "price"}.issubset(data[0].keys())


# ---------- Helpers for booking tests ----------
def _login(s, phone=None, name=None):
    phone = phone or _rand_phone()
    req = s.post(f"{API}/auth/request-otp", json={"phone": phone, "name": name or "TEST_U"}).json()
    v = s.post(f"{API}/auth/verify-otp", json={"otp_id": req["otp_id"], "otp": req["otp"]}).json()
    return v["token"], v["user"], phone


# ---------- Booking endpoints require auth ----------
class TestBookingAuthRequired:
    def test_list_bookings_no_auth(self, s):
        r = s.get(f"{API}/bookings")
        assert r.status_code == 401

    def test_create_booking_no_auth(self, s):
        r = s.post(f"{API}/bookings", json={
            "service_id": "laundry",
            "scheduled_for": "2026-02-01T10:00:00Z",
            "address": {"line1": "1 Test"},
        })
        assert r.status_code == 401

    def test_get_booking_no_auth(self, s):
        r = s.get(f"{API}/bookings/some-id")
        assert r.status_code == 401

    def test_payment_no_auth(self, s):
        r = s.post(f"{API}/bookings/x/payment", json={"utr": "U"})
        assert r.status_code == 401

    def test_status_no_auth(self, s):
        r = s.patch(f"{API}/bookings/x/status", json={"status": "paid"})
        assert r.status_code == 401

    def test_tracking_no_auth(self, s):
        r = s.get(f"{API}/bookings/x/tracking")
        assert r.status_code == 401


# ---------- Booking creation, autofill, multi-tenant isolation ----------
class TestBookingsAuthed:
    def test_create_booking_autofills_phone_and_name(self, s):
        token, user, phone = _login(s, name="TEST_Autofill")
        h = {"Authorization": f"Bearer {token}"}
        r = s.post(f"{API}/bookings", headers=h, json={
            "service_id": "laundry",
            "scheduled_for": "2026-02-01T10:00:00Z",
            "address": {"line1": "1 MG Road", "city": "Mysuru"},
        })
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["phone"] == phone
        assert b["customer_name"] == "TEST_Autofill"
        assert b["service_id"] == "laundry"
        assert b["service_name"] == "Laundry"
        assert b["price"] == 299
        assert b["status"] == "pending"
        assert b["user_id"] == user["id"]
        assert b["provider"] and b["provider"]["lat"]
        # GET to verify persistence
        g = s.get(f"{API}/bookings/{b['id']}", headers=h)
        assert g.status_code == 200
        assert g.json()["id"] == b["id"]

    def test_multi_tenant_isolation(self, s):
        # User A creates a booking
        ta, ua, _ = _login(s, name="TEST_A")
        ha = {"Authorization": f"Bearer {ta}"}
        ba = s.post(f"{API}/bookings", headers=ha, json={
            "service_id": "fan-cleaning",
            "scheduled_for": "2026-02-02T11:00:00Z",
            "address": {"line1": "A street"},
        }).json()
        assert "id" in ba

        # User B logs in - should not see A's booking
        tb, ub, _ = _login(s, name="TEST_B")
        hb = {"Authorization": f"Bearer {tb}"}
        listb = s.get(f"{API}/bookings", headers=hb).json()
        ids_b = [x["id"] for x in listb]
        assert ba["id"] not in ids_b

        # User B trying to get A's booking by id -> 404 (tenant scoped)
        gb = s.get(f"{API}/bookings/{ba['id']}", headers=hb)
        assert gb.status_code == 404

        # User A still sees their booking
        lista = s.get(f"{API}/bookings", headers=ha).json()
        ids_a = [x["id"] for x in lista]
        assert ba["id"] in ids_a

    def test_tracking_progresses_provider(self, s):
        token, _, _ = _login(s, name="TEST_Track")
        h = {"Authorization": f"Bearer {token}"}
        b = s.post(f"{API}/bookings", headers=h, json={
            "service_id": "laundry",
            "scheduled_for": "2026-02-03T09:00:00Z",
            "address": {"line1": "Track St", "lat": 12.2958, "lng": 76.6394},
        }).json()
        # confirm so status flips to on-the-way once close
        s.post(f"{API}/bookings/{b['id']}/payment", headers=h, json={"utr": "TESTUTR123"})
        # First tracking call
        t1 = s.get(f"{API}/bookings/{b['id']}/tracking", headers=h)
        assert t1.status_code == 200
        d1 = t1.json()
        assert "distance_km" in d1 and "provider" in d1
        # Subsequent calls reduce distance
        d_prev = d1["distance_km"]
        for _ in range(15):
            d = s.get(f"{API}/bookings/{b['id']}/tracking", headers=h).json()
            assert d["distance_km"] <= d_prev + 1e-6
            d_prev = d["distance_km"]
            if d_prev < 0.25:
                break
        # eventually close enough -> status auto advanced
        final = s.get(f"{API}/bookings/{b['id']}", headers=h).json()
        assert final["status"] in ("on-the-way", "arrived", "confirmed")
