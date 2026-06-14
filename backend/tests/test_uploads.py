"""Tests de uploads/Cloudinary: RBAC, validación MIME/tamaño y mocks del SDK."""

from unittest.mock import patch

from app.core.config import settings
from tests.conftest import login


def _config_cloudinary(monkeypatch):
    monkeypatch.setattr(settings, "CLOUDINARY_CLOUD_NAME", "demo")
    monkeypatch.setattr(settings, "CLOUDINARY_API_KEY", "key")
    monkeypatch.setattr(settings, "CLOUDINARY_API_SECRET", "secret")


def test_upload_sin_auth(client, seed_data):
    resp = client.post(
        "/api/v1/uploads/imagen",
        files={"file": ("a.jpg", b"\xff\xd8\xff\xe0", "image/jpeg")},
    )
    assert resp.status_code == 401


def test_upload_como_cliente_prohibido(client, seed_data):
    login(client, "cliente@test.com", "Cliente1234!")
    resp = client.post(
        "/api/v1/uploads/imagen",
        files={"file": ("a.jpg", b"\xff\xd8\xff\xe0", "image/jpeg")},
    )
    assert resp.status_code == 403


def test_upload_mime_invalido(client, seed_data):
    login(client, "admin@test.com", "Admin1234!")
    resp = client.post(
        "/api/v1/uploads/imagen",
        files={"file": ("a.txt", b"hola mundo", "text/plain")},
    )
    assert resp.status_code == 422


def test_upload_archivo_demasiado_grande(client, seed_data):
    login(client, "admin@test.com", "Admin1234!")
    big = b"\xff\xd8\xff\xe0" + b"0" * (5 * 1024 * 1024 + 10)  # > 5 MB
    resp = client.post(
        "/api/v1/uploads/imagen",
        files={"file": ("big.jpg", big, "image/jpeg")},
    )
    assert resp.status_code == 413


def test_upload_jpg_valido_como_admin(client, seed_data, monkeypatch):
    _config_cloudinary(monkeypatch)
    login(client, "admin@test.com", "Admin1234!")
    fake_result = {
        "secure_url": "https://res.cloudinary.com/demo/image/upload/v1/foodstore/x.jpg",
        "public_id": "foodstore/x",
        "width": 800,
        "height": 600,
        "format": "jpg",
        "resource_type": "image",
        "bytes": 12345,
    }
    with patch("cloudinary.uploader.upload", return_value=fake_result) as mock_up:
        resp = client.post(
            "/api/v1/uploads/imagen",
            files={"file": ("ok.jpg", b"\xff\xd8\xff\xe0fakejpeg", "image/jpeg")},
        )
    assert resp.status_code == 201, resp.text
    assert resp.json()["public_id"] == "foodstore/x"
    assert mock_up.called


def test_delete_imagen_como_admin(client, seed_data, monkeypatch):
    _config_cloudinary(monkeypatch)
    login(client, "admin@test.com", "Admin1234!")
    with patch("cloudinary.uploader.destroy", return_value={"result": "ok"}) as mock_del:
        resp = client.delete("/api/v1/uploads/imagen/foodstore/x")
    assert resp.status_code == 204
    assert mock_del.called
