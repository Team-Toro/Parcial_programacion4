"""Tests de productos: listado, filtros, CRUD, RBAC y soft delete."""

from tests.conftest import login


def _nuevo_producto(categoria_id):
    return {
        "nombre": "Pizza Test",
        "descripcion": "Pizza de prueba",
        "precio_base": 4000,
        "stock_cantidad": 30,
        "disponible": True,
        "categoria_ids": [categoria_id],
        "ingredientes": [],
    }


def test_listar_productos(client, seed_data):
    resp = client.get("/api/v1/productos/")
    assert resp.status_code == 200
    nombres = [p["nombre"] for p in resp.json()]
    assert "Hamburguesa Test" in nombres


def test_listar_productos_filtro_q(client, seed_data):
    resp = client.get("/api/v1/productos/", params={"q": "Hamburguesa"})
    assert resp.status_code == 200
    assert len(resp.json()) >= 1
    assert all("hamburguesa" in p["nombre"].lower() for p in resp.json())


def test_obtener_producto_ok(client, seed_data):
    resp = client.get(f"/api/v1/productos/{seed_data['producto_id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == seed_data["producto_id"]


def test_obtener_producto_404(client, seed_data):
    resp = client.get("/api/v1/productos/999999")
    assert resp.status_code == 404


def test_crear_producto_como_admin(client, seed_data):
    login(client, "admin@test.com", "Admin1234!")
    resp = client.post("/api/v1/productos/", json=_nuevo_producto(seed_data["categoria_id"]))
    assert resp.status_code == 201, resp.text
    assert resp.json()["nombre"] == "Pizza Test"


def test_crear_producto_como_cliente_prohibido(client, seed_data):
    login(client, "cliente@test.com", "Cliente1234!")
    resp = client.post("/api/v1/productos/", json=_nuevo_producto(seed_data["categoria_id"]))
    assert resp.status_code == 403


def test_actualizar_producto(client, seed_data):
    login(client, "admin@test.com", "Admin1234!")
    resp = client.patch(
        f"/api/v1/productos/{seed_data['producto_id']}",
        json={"precio_base": 3000},
    )
    assert resp.status_code == 200, resp.text
    assert float(resp.json()["precio_base"]) == 3000.0


def test_actualizar_imagenes_producto(client, seed_data):
    login(client, "admin@test.com", "Admin1234!")
    urls = ["https://res.cloudinary.com/demo/image/upload/v1/a.jpg"]
    resp = client.patch(
        f"/api/v1/productos/{seed_data['producto_id']}/imagenes",
        json={"imagenes_url": urls},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["imagenes_url"] == urls


def test_actualizar_disponibilidad(client, seed_data):
    login(client, "admin@test.com", "Admin1234!")
    resp = client.patch(
        f"/api/v1/productos/{seed_data['producto_id']}/disponibilidad",
        json={"disponible": False},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["disponible"] is False


def test_soft_delete_producto(client, seed_data):
    login(client, "admin@test.com", "Admin1234!")
    pid = seed_data["producto_id"]
    resp = client.delete(f"/api/v1/productos/{pid}")
    assert resp.status_code == 204
    # Tras el soft-delete ya no aparece en el detalle público (deleted_at seteado)
    assert client.get(f"/api/v1/productos/{pid}").status_code == 404


def test_listado_excluye_soft_deleted(client, seed_data):
    login(client, "admin@test.com", "Admin1234!")
    pid = seed_data["producto_id"]
    client.delete(f"/api/v1/productos/{pid}")
    resp = client.get("/api/v1/productos/")
    assert resp.status_code == 200
    assert all(p["id"] != pid for p in resp.json())
