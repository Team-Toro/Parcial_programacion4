"""Tests de pagos (MercadoPago) con el SDK mockeado — nunca se llama a MP real."""

from unittest.mock import patch

import pytest

from app.core.config import settings
from app.pagos.service import PagoService
from tests.conftest import login


def _login_cliente(client):
    login(client, "cliente@test.com", "Cliente1234!")


def _crear_pedido_mp(client, seed_data):
    return client.post(
        "/api/v1/pedidos/",
        json={
            "forma_pago_codigo": "MERCADOPAGO",
            "direccion_id": seed_data["direccion_id"],
            "items": [{"producto_id": seed_data["producto_id"], "cantidad": 1}],
        },
    )


def test_create_preference_ok(client, seed_data, monkeypatch):
    monkeypatch.setattr(settings, "MP_ACCESS_TOKEN", "TEST-token")
    _login_cliente(client)
    pid = _crear_pedido_mp(client, seed_data).json()["id"]

    fake_pref = {"preference_id": "pref_123", "init_point": "https://mp.test/checkout/123"}
    with patch.object(PagoService, "_crear_preferencia_mp", return_value=fake_pref):
        resp = client.post("/api/v1/pagos/create-preference", json={"pedido_id": pid})

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["preference_id"] == "pref_123"
    assert body["init_point"] == "https://mp.test/checkout/123"


def test_create_preference_pedido_inexistente(client, seed_data, monkeypatch):
    monkeypatch.setattr(settings, "MP_ACCESS_TOKEN", "TEST-token")
    _login_cliente(client)
    resp = client.post("/api/v1/pagos/create-preference", json={"pedido_id": 999999})
    assert resp.status_code == 404


def test_webhook_topic_no_soportado(client, seed_data, monkeypatch):
    monkeypatch.setattr(settings, "MP_ACCESS_TOKEN", "TEST-token")
    resp = client.post("/api/v1/pagos/webhook", json={"type": "subscription", "data": {"id": 1}})
    assert resp.status_code == 200
    assert resp.json()["status"] == "ignored"


def test_webhook_payment_id_invalido(client, seed_data):
    resp = client.post("/api/v1/pagos/webhook", json={"type": "payment", "data": {"id": "no-es-numero"}})
    assert resp.status_code == 200
    assert resp.json()["status"] == "ignored"


def test_webhook_approved_avanza_pedido(client, seed_data, monkeypatch):
    """Flow: webhook approved → el pedido pasa a CONFIRMADO."""
    monkeypatch.setattr(settings, "MP_ACCESS_TOKEN", "TEST-token")
    _login_cliente(client)
    pid = _crear_pedido_mp(client, seed_data).json()["id"]

    mp_info = {
        "mp_payment_id": 555,
        "mp_status": "approved",
        "mp_status_detail": "accredited",
        "mp_merchant_order_id": None,
        "external_reference": str(pid),
        "payment_method_id": "visa",
    }
    with patch.object(PagoService, "_consultar_pago_mp", return_value=mp_info):
        resp = client.post("/api/v1/pagos/webhook", json={"type": "payment", "data": {"id": 555}})

    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "processed"
    # El pedido avanzó a CONFIRMADO
    pedido = client.get(f"/api/v1/pedidos/{pid}").json()
    assert pedido["estado_codigo"] == "CONFIRMADO"


def test_webhook_idempotente(client, seed_data, monkeypatch):
    """El mismo payment_id procesado dos veces no re-avanza el pedido."""
    monkeypatch.setattr(settings, "MP_ACCESS_TOKEN", "TEST-token")
    _login_cliente(client)
    pid = _crear_pedido_mp(client, seed_data).json()["id"]

    mp_info = {
        "mp_payment_id": 777,
        "mp_status": "approved",
        "mp_status_detail": "accredited",
        "mp_merchant_order_id": None,
        "external_reference": str(pid),
        "payment_method_id": "visa",
    }
    with patch.object(PagoService, "_consultar_pago_mp", return_value=mp_info):
        first = client.post("/api/v1/pagos/webhook", json={"type": "payment", "data": {"id": 777}})
        second = client.post("/api/v1/pagos/webhook", json={"type": "payment", "data": {"id": 777}})

    assert first.json()["status"] == "processed"
    assert second.json()["status"] == "already_processed"
    pedido = client.get(f"/api/v1/pedidos/{pid}").json()
    assert pedido["estado_codigo"] == "CONFIRMADO"


def test_create_preference_pedido_ajeno_403(client, seed_data, monkeypatch):
    """Un cliente no puede generar la preferencia del pedido de otro usuario."""
    monkeypatch.setattr(settings, "MP_ACCESS_TOKEN", "TEST-token")

    # El cliente crea su propio pedido
    login(client, "cliente@test.com", "Cliente1234!")
    pid = _crear_pedido_mp(client, seed_data).json()["id"]

    # Registrar un segundo cliente
    client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "Otro",
            "last_name": "Cliente",
            "email": "otro@test.com",
            "celular": "3333",
            "password": "Otro1234!",
        },
    )

    # Loguear como el segundo cliente e intentar pagar el pedido ajeno
    login(client, "otro@test.com", "Otro1234!")
    fake_pref = {"preference_id": "pref_x", "init_point": "https://mp.test/x"}
    with patch.object(PagoService, "_crear_preferencia_mp", return_value=fake_pref):
        resp = client.post("/api/v1/pagos/create-preference", json={"pedido_id": pid})

    assert resp.status_code == 403
