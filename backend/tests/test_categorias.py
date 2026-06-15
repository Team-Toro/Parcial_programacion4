"""Tests de categorías: listado, jerarquía, CRUD, RBAC y referencia circular."""

import pytest

from tests.conftest import login


def _login_admin(client):
    login(client, "admin@test.com", "Admin1234!")


def test_listar_categorias(client, seed_data):
    resp = client.get("/api/v1/categorias/")
    assert resp.status_code == 200
    assert any(c["nombre"] == "Hamburguesas" for c in resp.json())


def test_crear_categoria_como_admin(client, seed_data):
    _login_admin(client)
    resp = client.post("/api/v1/categorias/", json={"nombre": "Bebidas"})
    assert resp.status_code == 201, resp.text
    assert resp.json()["nombre"] == "Bebidas"


def test_crear_categoria_nombre_duplicado(client, seed_data):
    _login_admin(client)
    # "Hamburguesas" ya existe en el seed → 409
    resp = client.post("/api/v1/categorias/", json={"nombre": "Hamburguesas"})
    assert resp.status_code == 409


def test_crear_categoria_parent_inexistente(client, seed_data):
    _login_admin(client)
    resp = client.post("/api/v1/categorias/", json={"nombre": "Huérfana", "parent_id": 999999})
    assert resp.status_code == 404


def test_crear_categoria_como_cliente_prohibido(client, seed_data):
    login(client, "cliente@test.com", "Cliente1234!")
    resp = client.post("/api/v1/categorias/", json={"nombre": "Prohibida"})
    assert resp.status_code == 403


def test_filtrar_por_parent_id(client, seed_data):
    _login_admin(client)
    padre_id = seed_data["categoria_id"]
    hijo = client.post("/api/v1/categorias/", json={"nombre": "Dobles", "parent_id": padre_id})
    assert hijo.status_code == 201, hijo.text
    resp = client.get("/api/v1/categorias/", params={"parent_id": padre_id})
    assert resp.status_code == 200
    assert all(c["parent_id"] == padre_id for c in resp.json())
    assert any(c["nombre"] == "Dobles" for c in resp.json())


def test_actualizar_categoria(client, seed_data):
    _login_admin(client)
    resp = client.patch(
        f"/api/v1/categorias/{seed_data['categoria_id']}",
        json={"descripcion": "Actualizada"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["descripcion"] == "Actualizada"


def test_actualizar_imagen_categoria(client, seed_data):
    _login_admin(client)
    url = "https://res.cloudinary.com/demo/image/upload/v1/cat.jpg"
    resp = client.patch(
        f"/api/v1/categorias/{seed_data['categoria_id']}/imagen",
        json={"imagen_url": url},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["imagen_url"] == url


def test_soft_delete_categoria(client, seed_data):
    _login_admin(client)
    # Categoría nueva SIN productos (la del seed tiene un producto → daría 409)
    cat_id = client.post("/api/v1/categorias/", json={"nombre": "Vacía"}).json()["id"]
    resp = client.delete(f"/api/v1/categorias/{cat_id}")
    assert resp.status_code == 204
    assert client.get(f"/api/v1/categorias/{cat_id}").status_code == 404


def test_referencia_circular_auto(client, seed_data):
    """Una categoría no puede ser su propia padre → 400."""
    _login_admin(client)
    a_id = client.post("/api/v1/categorias/", json={"nombre": "Cat A"}).json()["id"]
    resp = client.patch(f"/api/v1/categorias/{a_id}", json={"parent_id": a_id})
    assert resp.status_code == 400


def test_referencia_circular_padre_hijo(client, seed_data):
    """A es padre de B; intentar que B sea padre de A debe dar 400."""
    _login_admin(client)
    a_id = client.post("/api/v1/categorias/", json={"nombre": "Abuelo"}).json()["id"]
    b_id = client.post("/api/v1/categorias/", json={"nombre": "Hijo", "parent_id": a_id}).json()["id"]
    resp = client.patch(f"/api/v1/categorias/{a_id}", json={"parent_id": b_id})
    assert resp.status_code == 400
