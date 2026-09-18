"""Backend tests for new admin features: store/status, hours, order status,
product reorder, image uploads."""
import io
import os
import struct
import zlib
import uuid
import requests
import pytest

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "panficadoracarvalho2017@gmail.com"
ADMIN_PASSWORD = "Padaria2017@"

DEFAULT_OPEN = {str(i): {"enabled": True, "open": "00:00", "close": "23:59"} for i in range(7)}
ALL_CLOSED = {str(i): {"enabled": False, "open": "06:00", "close": "20:00"} for i in range(7)}


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module", autouse=True)
def ensure_open_after_tests(headers):
    """Guarantee hours set to permissive after this module runs."""
    yield
    requests.put(f"{API}/settings/hours", json={"hours": DEFAULT_OPEN}, headers=headers)


def _tiny_png() -> bytes:
    """Generate a minimal 1x1 PNG."""
    sig = b"\x89PNG\r\n\x1a\n"
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    idat_data = zlib.compress(b"\x00\xff\x00\x00")
    idat = chunk(b"IDAT", idat_data)
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


# ---------- store status ----------
def test_store_status_shape():
    r = requests.get(f"{API}/store/status")
    assert r.status_code == 200
    data = r.json()
    assert "is_open" in data and "day" in data and "schedule" in data and "hours" in data
    hours = data["hours"]
    for i in range(7):
        assert str(i) in hours


# ---------- hours GET/PUT ----------
def test_hours_get_requires_auth():
    r = requests.get(f"{API}/settings/hours")
    assert r.status_code == 401


def test_hours_get_with_auth(headers):
    r = requests.get(f"{API}/settings/hours", headers=headers)
    assert r.status_code == 200
    assert "hours" in r.json()


def test_hours_put_invalid_day(headers):
    bad = dict(DEFAULT_OPEN)
    bad["7"] = {"enabled": True, "open": "06:00", "close": "20:00"}
    r = requests.put(f"{API}/settings/hours", json={"hours": bad}, headers=headers)
    assert r.status_code == 400


def test_hours_put_persists(headers):
    payload = {str(i): {"enabled": True, "open": "07:00", "close": "19:30"} for i in range(7)}
    r = requests.put(f"{API}/settings/hours", json={"hours": payload}, headers=headers)
    assert r.status_code == 200
    r2 = requests.get(f"{API}/settings/hours", headers=headers)
    saved = r2.json()["hours"]
    assert saved["0"]["open"] == "07:00"
    assert saved["3"]["close"] == "19:30"
    # restore permissive
    requests.put(f"{API}/settings/hours", json={"hours": DEFAULT_OPEN}, headers=headers)


# ---------- order create respects hours ----------
ORDER_PAYLOAD = {
    "customer_name": "TEST_HoursGate",
    "phone": "(93) 99999-1234",
    "fulfillment": "retirada",
    "address": None,
    "payment": "Pix",
    "items": [{"name": "TEST_I", "quantity": 1, "unit_price": 5.0}],
    "total": 5.0,
    "notes": "TEST",
}


def test_order_open_then_closed_then_reopen(headers):
    # Open
    requests.put(f"{API}/settings/hours", json={"hours": DEFAULT_OPEN}, headers=headers)
    r = requests.post(f"{API}/orders", json=ORDER_PAYLOAD)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "pendente"

    # Close all
    requests.put(f"{API}/settings/hours", json={"hours": ALL_CLOSED}, headers=headers)
    r = requests.post(f"{API}/orders", json=ORDER_PAYLOAD)
    assert r.status_code == 409
    assert "fechada" in r.json()["detail"].lower()

    # Reopen
    requests.put(f"{API}/settings/hours", json={"hours": DEFAULT_OPEN}, headers=headers)
    r = requests.post(f"{API}/orders", json=ORDER_PAYLOAD)
    assert r.status_code == 200


# ---------- order status patch ----------
def test_order_patch_status(headers):
    # Ensure open
    requests.put(f"{API}/settings/hours", json={"hours": DEFAULT_OPEN}, headers=headers)
    r = requests.post(f"{API}/orders", json=ORDER_PAYLOAD)
    assert r.status_code == 200
    oid = r.json()["order_id"]

    # No auth
    r = requests.patch(f"{API}/orders/{oid}", json={"status": "preparando"})
    assert r.status_code == 401

    # Invalid status
    r = requests.patch(f"{API}/orders/{oid}", json={"status": "invalido"}, headers=headers)
    assert r.status_code == 400

    # Valid status transitions
    for s in ["preparando", "pronto", "entregue", "cancelado", "pendente"]:
        r = requests.patch(f"{API}/orders/{oid}", json={"status": s}, headers=headers)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == s

    # Non-existent
    r = requests.patch(f"{API}/orders/{uuid.uuid4()}", json={"status": "pronto"}, headers=headers)
    assert r.status_code == 404


def test_orders_have_status_field(headers):
    r = requests.get(f"{API}/orders", headers=headers)
    assert r.status_code == 200
    orders = r.json()
    for o in orders:
        assert "status" in o


# ---------- products reorder ----------
def test_products_reorder(headers):
    r = requests.get(f"{API}/products")
    products = r.json()
    original_ids = [p["id"] for p in products]
    assert len(original_ids) >= 3

    # No auth
    r = requests.post(f"{API}/products/reorder", json={"ids": original_ids})
    assert r.status_code == 401

    # Reverse order
    reversed_ids = list(reversed(original_ids))
    r = requests.post(f"{API}/products/reorder", json={"ids": reversed_ids}, headers=headers)
    assert r.status_code == 200
    resp = r.json()
    assert [p["id"] for p in resp] == reversed_ids

    # Verify GET reflects
    r2 = requests.get(f"{API}/products")
    assert [p["id"] for p in r2.json()] == reversed_ids

    # Revert
    r = requests.post(f"{API}/products/reorder", json={"ids": original_ids}, headers=headers)
    assert r.status_code == 200
    r2 = requests.get(f"{API}/products")
    assert [p["id"] for p in r2.json()] == original_ids


# ---------- uploads/image ----------
def test_upload_requires_auth():
    r = requests.post(f"{API}/uploads/image", files={"file": ("t.png", _tiny_png(), "image/png")})
    assert r.status_code == 401


def test_upload_rejects_non_image(headers):
    r = requests.post(
        f"{API}/uploads/image",
        files={"file": ("t.txt", b"hello", "text/plain")},
        headers=headers,
    )
    assert r.status_code == 400


def test_upload_and_fetch_image(headers):
    png = _tiny_png()
    r = requests.post(
        f"{API}/uploads/image",
        files={"file": ("test.png", png, "image/png")},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "path" in body and "url" in body
    assert body["url"].startswith("/api/files/")

    # Fetch (public, no auth)
    url = f"{BASE_URL}{body['url']}"
    r2 = requests.get(url)
    assert r2.status_code == 200, r2.text
    assert r2.headers.get("Content-Type", "").startswith("image/")
    assert r2.content == png
