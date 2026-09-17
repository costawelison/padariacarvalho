"""Regression tests for the public order creation API."""
import os

import requests


BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


def test_api_root_and_create_order():
    root = requests.get(f"{BASE_URL}/api/", timeout=15)
    assert root.status_code == 200
    assert root.json()["message"] == "Panificadora Carvalho API"

    payload = {
        "customer_name": "TEST Cliente",
        "phone": "93999999999",
        "fulfillment": "entrega",
        "address": "TEST Rua 1, 10",
        "payment": "Pix",
        "items": [{"name": "Bolo caseiro", "variant": None, "quantity": 2, "unit_price": 9}],
        "total": 18,
        "notes": "TEST sem açúcar",
    }
    response = requests.post(f"{BASE_URL}/api/orders", json=payload, timeout=15)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["order_id"], str) and data["order_id"]
    assert isinstance(data["created_at"], str) and data["created_at"]
    assert data["customer_name"] == payload["customer_name"]
    assert data["items"][0]["quantity"] == 2


def test_order_rejects_missing_required_fields():
    response = requests.post(f"{BASE_URL}/api/orders", json={"customer_name": "TEST"}, timeout=15)
    assert response.status_code == 422
    assert "detail" in response.json()