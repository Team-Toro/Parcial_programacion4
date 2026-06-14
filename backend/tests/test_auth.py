"""Tests de autenticación: register, login, refresh, logout, /me."""

import pytest

from tests.conftest import login


def _register_payload(email="nuevo@test.com"):
    return {
        "first_name": "Nuevo",
        "last_name": "Usuario",
        "email": email,
        "celular": "3333",
        "password": "Password123!",
    }


def test_register_ok(client, seed_data):
    resp = client.post("/api/v1/auth/register", json=_register_payload())
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["email"] == "nuevo@test.com"
    assert body["roles"] == ["CLIENTE"]  # rol por defecto
    assert "hashed_password" not in body


def test_register_email_duplicado(client, seed_data):
    # admin@test.com ya existe en el seed
    resp = client.post("/api/v1/auth/register", json=_register_payload(email="admin@test.com"))
    assert resp.status_code == 409


def test_register_password_debil(client, seed_data):
    payload = _register_payload()
    payload["password"] = "123"  # < 8 caracteres → falla validación Pydantic
    resp = client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 422


def test_login_ok(client, seed_data):
    resp = login(client, "cliente@test.com", "Cliente1234!")
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["refresh_token"]
    # La cookie HttpOnly debe quedar seteada
    assert "access_token" in resp.cookies


def test_login_password_incorrecto(client, seed_data):
    resp = client.post(
        "/api/v1/auth/token",
        data={"username": "cliente@test.com", "password": "MalaPassword!"},
    )
    assert resp.status_code == 401


def test_login_usuario_inexistente(client, seed_data):
    resp = client.post(
        "/api/v1/auth/token",
        data={"username": "fantasma@test.com", "password": "loquesea123"},
    )
    assert resp.status_code == 401


def test_me_con_token(cliente_client):
    resp = cliente_client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    assert resp.json()["email"] == "cliente@test.com"


def test_me_sin_token(client, seed_data):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_refresh_ok(cliente_client):
    # Tras el login, la cookie refresh_token quedó guardada en el client
    resp = cliente_client.post("/api/v1/auth/refresh")
    assert resp.status_code == 200, resp.text
    assert resp.json()["access_token"]


def test_refresh_sin_token(client, seed_data):
    resp = client.post("/api/v1/auth/refresh")
    assert resp.status_code == 401


def test_logout_ok(cliente_client):
    resp = cliente_client.post("/api/v1/auth/logout")
    assert resp.status_code == 200
    assert "message" in resp.json()


@pytest.mark.skip(
    reason="El rate limiter (slowapi) se desactiva globalmente en tests para aislar "
    "los logins entre casos. Verificar el 429 requiere estado de IP persistente; "
    "se prueba manualmente. TODO: test dedicado con limiter reactivado y storage aislado."
)
def test_login_rate_limit_429():
    ...
