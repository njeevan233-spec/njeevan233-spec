"""Backend tests for OTP rate-limit, cancel and reschedule booking flows."""
import os
import random
import time
from datetime import datetime, timedelta, timezone
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


def _rand_phone():
    return "9" + "".join(str(random.randint(0, 9)) for _ in range(9))


@pytest.fixture(scope="module")
def s():
    return requests.Session()


def _login(s, phone=None, name="TEST_U"):
    phone = phone or _rand_phone()
    req = s.post(f"{API}/auth/request-otp", json={"phone": phone, "name": name}).json()
    v = s.post(f"{API}/auth/verify-otp", json={"otp_id": req["otp_id"], "otp": req["otp"]}).json()
    return v["token"], v["user"], phone


def _create_booking(s, token, scheduled_for=None):
    if scheduled_for is None:
        scheduled_for = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    h = {"Authorization": f"Bearer {token}"}
    r = s.post(f"{API}/bookings", headers=h, json={
        "service_id": "laundry",
        "scheduled_for": scheduled_for,
        "address": {"line1": "1 Test", "city": "Mysuru"},
    })
    assert r.status_code == 200, r.text
    return r.json()


# ---------- OTP rate limiting ----------
class TestOtpRateLimit:
    def test_second_request_within_30s_blocked(self, s):
        phone = _rand_phone()
        r1 = s.post(f"{API}/auth/request-otp", json={"phone": phone})
        assert r1.status_code == 200, r1.text
        r2 = s.post(f"{API}/auth/request-otp", json={"phone": phone})
        assert r2.status_code == 429, r2.text
        body = r2.json()
        detail = body.get("detail", "")
        assert "wait" in detail.lower()
        assert "before requesting another OTP" in detail

    def test_different_phone_not_blocked(self, s):
        phone_a = _rand_phone()
        phone_b = _rand_phone()
        # Ensure different
        while phone_b == phone_a:
            phone_b = _rand_phone()
        r1 = s.post(f"{API}/auth/request-otp", json={"phone": phone_a})
        assert r1.status_code == 200
        r2 = s.post(f"{API}/auth/request-otp", json={"phone": phone_b})
        assert r2.status_code == 200, r2.text
        assert r2.json()["phone"] == phone_b


# ---------- Cancel ----------
class TestCancelBooking:
    def test_cancel_success(self, s):
        token, _, _ = _login(s, name="TEST_Cancel")
        b = _create_booking(s, token)
        h = {"Authorization": f"Bearer {token}"}
        prev_history_len = len(b.get("history") or [])
        r = s.post(f"{API}/bookings/{b['id']}/cancel", headers=h, json={"reason": "Plans changed"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "cancelled"
        assert d["cancelled_reason"] == "Plans changed"
        assert d["cancelled_at"]
        assert len(d["history"]) == prev_history_len + 1
        last = d["history"][-1]
        assert last["type"] == "cancelled"
        assert last["reason"] == "Plans changed"

        # Persistence: GET reflects same state
        g = s.get(f"{API}/bookings/{b['id']}", headers=h).json()
        assert g["status"] == "cancelled"

    def test_cancel_twice_400(self, s):
        token, _, _ = _login(s, name="TEST_CancelTwice")
        b = _create_booking(s, token)
        h = {"Authorization": f"Bearer {token}"}
        r1 = s.post(f"{API}/bookings/{b['id']}/cancel", headers=h, json={"reason": "x"})
        assert r1.status_code == 200
        r2 = s.post(f"{API}/bookings/{b['id']}/cancel", headers=h, json={"reason": "y"})
        assert r2.status_code == 400, r2.text
        detail = r2.json().get("detail", "")
        assert "Cannot cancel" in detail and "cancelled" in detail

    def test_cancel_no_token(self, s):
        token, _, _ = _login(s, name="TEST_CancelNoTok")
        b = _create_booking(s, token)
        r = s.post(f"{API}/bookings/{b['id']}/cancel", json={"reason": "x"})
        assert r.status_code == 401

    def test_cancel_other_user(self, s):
        token_a, _, _ = _login(s, name="TEST_A")
        b = _create_booking(s, token_a)
        token_b, _, _ = _login(s, name="TEST_B")
        h = {"Authorization": f"Bearer {token_b}"}
        r = s.post(f"{API}/bookings/{b['id']}/cancel", headers=h, json={"reason": "x"})
        assert r.status_code == 404


# ---------- Reschedule ----------
class TestRescheduleBooking:
    def test_reschedule_success(self, s):
        token, _, _ = _login(s, name="TEST_Resch")
        b = _create_booking(s, token)
        h = {"Authorization": f"Bearer {token}"}
        new_slot = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
        r = s.post(f"{API}/bookings/{b['id']}/reschedule", headers=h, json={"scheduled_for": new_slot})
        assert r.status_code == 200, r.text
        d = r.json()
        # scheduled_for parsed and re-serialized to UTC iso
        assert d["scheduled_for"]
        # history entry
        assert any(h["type"] == "rescheduled" for h in d["history"])
        last = d["history"][-1]
        assert last["type"] == "rescheduled"
        assert last["from"] == b["scheduled_for"]

    def test_reschedule_too_soon(self, s):
        token, _, _ = _login(s, name="TEST_ReschSoon")
        b = _create_booking(s, token)
        h = {"Authorization": f"Bearer {token}"}
        too_soon = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
        r = s.post(f"{API}/bookings/{b['id']}/reschedule", headers=h, json={"scheduled_for": too_soon})
        assert r.status_code == 400, r.text
        detail = r.json().get("detail", "")
        assert "60 minutes" in detail

    def test_reschedule_cancelled(self, s):
        token, _, _ = _login(s, name="TEST_ReschCanc")
        b = _create_booking(s, token)
        h = {"Authorization": f"Bearer {token}"}
        s.post(f"{API}/bookings/{b['id']}/cancel", headers=h, json={"reason": "x"})
        new_slot = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
        r = s.post(f"{API}/bookings/{b['id']}/reschedule", headers=h, json={"scheduled_for": new_slot})
        assert r.status_code == 400
        detail = r.json().get("detail", "")
        assert "Cannot reschedule" in detail and "cancelled" in detail

    def test_reschedule_malformed(self, s):
        token, _, _ = _login(s, name="TEST_ReschBad")
        b = _create_booking(s, token)
        h = {"Authorization": f"Bearer {token}"}
        r = s.post(f"{API}/bookings/{b['id']}/reschedule", headers=h, json={"scheduled_for": "not-a-date"})
        assert r.status_code == 400


# ---------- Tracking on cancelled booking ----------
class TestTrackingFrozenOnCancel:
    def test_tracking_frozen(self, s):
        token, _, _ = _login(s, name="TEST_TrackCanc")
        b = _create_booking(s, token)
        h = {"Authorization": f"Bearer {token}"}
        s.post(f"{API}/bookings/{b['id']}/cancel", headers=h, json={"reason": "x"})
        t1 = s.get(f"{API}/bookings/{b['id']}/tracking", headers=h).json()
        assert t1["status"] == "cancelled"
        d1 = t1["distance_km"]
        time.sleep(0.5)
        t2 = s.get(f"{API}/bookings/{b['id']}/tracking", headers=h).json()
        assert t2["status"] == "cancelled"
        assert t2["distance_km"] == d1
