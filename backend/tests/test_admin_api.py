"""Backend API tests for Panificadora Carvalho admin panel + storefront."""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://padaria-pedidos.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "panficadoracarvalho2017@gmail.com"
ADMIN_PASSWORD = "Padaria2017@"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and data["email"] == ADMIN_EMAIL
    return data["token"]


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Public: products list ----------
def test_products_list_shape():
    r = requests.get(f"{API}/products")
    assert r.status_code == 200
    products = r.json()
    assert isinstance(products, list)
    assert len(products) >= 24
    p = products[0]
    for key in ("id", "category", "name", "price", "description", "image_url", "available", "order_index"):
        assert key in p, f"missing key {key}"
    assert "_id" not in p


# ---------- Public: order create ----------
def test_create_order_public():
    payload = {
        "customer_name": "TEST_Cliente",
        "phone": "(93) 99999-0001",
        "fulfillment": "retirada",
        "address": None,
        "payment": "Pix",
        "items": [{"name": "TEST_Item", "quantity": 2, "unit_price": 5.0}],
        "total": 10.0,
        "notes": "TEST order",
    }
    r = requests.post(f"{API}/orders", json=payload)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["order_id"]
    assert body["customer_name"] == "TEST_Cliente"
    assert "_id" not in body


# ---------- Auth ----------
def test_login_wrong_password():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
    assert r.status_code == 401
    assert r.json().get("detail") == "E-mail ou senha inválidos"


def test_me_without_token():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_me_with_token(auth_headers):
    r = requests.get(f"{API}/auth/me", headers=auth_headers)
    assert r.status_code == 200
    assert r.json().get("email") == ADMIN_EMAIL


# ---------- Product CRUD auth ----------
def test_create_product_no_token():
    r = requests.post(f"{API}/products", json={"category": "Bolos", "name": "X", "price": 1.0})
    assert r.status_code == 401


def test_product_full_crud(auth_headers):
    # Create
    new_p = {
        "category": "Bolos",
        "name": f"TEST_Bolo_{uuid.uuid4().hex[:6]}",
        "price": 12.5,
        "description": "TEST desc",
        "image_url": "https://example.com/img.png",
        "available": True,
    }
    r = requests.post(f"{API}/products", json=new_p, headers=auth_headers)
    assert r.status_code == 200, r.text
    created = r.json()
    pid = created["id"]
    assert created["name"] == new_p["name"]
    assert created["price"] == 12.5
    assert created["available"] is True
    assert "_id" not in created

    # Verify listed
    r = requests.get(f"{API}/products")
    assert any(p["id"] == pid for p in r.json())

    # Patch without token
    r = requests.patch(f"{API}/products/{pid}", json={"price": 15.0})
    assert r.status_code == 401

    # Patch with token: change fields
    r = requests.patch(f"{API}/products/{pid}", json={
        "price": 15.0, "name": new_p["name"] + "_v2",
        "description": "updated", "category": "Doces",
        "image_url": "https://example.com/img2.png",
    }, headers=auth_headers)
    assert r.status_code == 200, r.text
    upd = r.json()
    assert upd["price"] == 15.0
    assert upd["name"].endswith("_v2")
    assert upd["category"] == "Doces"

    # Toggle unavailable
    r = requests.patch(f"{API}/products/{pid}", json={"available": False}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["available"] is False

    # Toggle back
    r = requests.patch(f"{API}/products/{pid}", json={"available": True}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["available"] is True

    # Patch non-existent -> 404
    r = requests.patch(f"{API}/products/{uuid.uuid4()}", json={"price": 1.0}, headers=auth_headers)
    assert r.status_code == 404

    # Delete without token
    r = requests.delete(f"{API}/products/{pid}")
    assert r.status_code == 401

    # Delete with token
    r = requests.delete(f"{API}/products/{pid}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == {"ok": True}

    # Verify no longer listed
    r = requests.get(f"{API}/products")
    assert not any(p["id"] == pid for p in r.json())


# ---------- Orders admin ----------
def test_orders_admin(auth_headers):
    # Create an order first
    payload = {
        "customer_name": "TEST_OrderAdmin",
        "phone": "(93) 99999-0002",
        "fulfillment": "entrega",
        "address": "Rua TEST, 123",
        "payment": "Dinheiro",
        "items": [{"name": "TEST_A", "quantity": 1, "unit_price": 3.0}],
        "total": 3.0,
        "notes": None,
    }
    r = requests.post(f"{API}/orders", json=payload)
    assert r.status_code == 200
    order_id = r.json()["order_id"]

    # Unauth
    r = requests.get(f"{API}/orders")
    assert r.status_code == 401

    # Auth
    r = requests.get(f"{API}/orders", headers=auth_headers)
    assert r.status_code == 200
    orders = r.json()
    assert isinstance(orders, list)
    assert any(o["order_id"] == order_id for o in orders)
