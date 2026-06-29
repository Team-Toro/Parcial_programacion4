"""Tests de pedidos: creación, FSM completa y reglas de negocio (RN-01..RN-06)."""

from tests.conftest import login


def _login_cliente(client):
    login(client, "cliente@test.com", "Cliente1234!")


def _login_admin(client):
    login(client, "admin@test.com", "Admin1234!")


def _crear_pedido_efectivo(client, producto_id, cantidad=1):
    return client.post(
        "/api/v1/pedidos/",
        json={
            "forma_pago_codigo": "EFECTIVO",
            "items": [{"producto_id": producto_id, "cantidad": cantidad}],
        },
    )


def _avanzar(client, pedido_id, nuevo_estado, motivo=None):
    payload = {"nuevo_estado": nuevo_estado}
    if motivo is not None:
        payload["motivo"] = motivo
    return client.post(f"/api/v1/pedidos/{pedido_id}/avanzar", json=payload)


# ─── Creación ────────────────────────────────────────────────────────────────

def test_crear_pedido_ok(client, seed_data):
    _login_cliente(client)
    resp = _crear_pedido_efectivo(client, seed_data["producto_id"])
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["estado_codigo"] == "PENDIENTE"
    assert body["forma_pago_codigo"] == "EFECTIVO"
    assert len(body["detalles"]) == 1


def test_crear_pedido_sin_auth(client, seed_data):
    resp = _crear_pedido_efectivo(client, seed_data["producto_id"])
    assert resp.status_code == 401


def test_crear_pedido_stock_insuficiente(client, seed_data):
    _login_cliente(client)
    # stock_cantidad = 100; pedir 101 → 400
    resp = _crear_pedido_efectivo(client, seed_data["producto_id"], cantidad=101)
    assert resp.status_code == 400


# ─── Reglas de negocio ───────────────────────────────────────────────────────

def test_rn02_primer_historial_estado_desde_none(client, seed_data):
    """RN-02: el primer registro de historial tiene estado_desde = None."""
    _login_cliente(client)
    pid = _crear_pedido_efectivo(client, seed_data["producto_id"]).json()["id"]
    resp = client.get(f"/api/v1/pedidos/{pid}/historial")
    assert resp.status_code == 200
    historial = resp.json()
    assert len(historial) >= 1
    assert historial[0]["estado_desde"] is None
    assert historial[0]["estado_hacia"] == "PENDIENTE"


def test_rn03_historial_append_only(client, seed_data):
    """RN-03: el historial es append-only — no existe método para mutarlo (405)."""
    _login_cliente(client)
    pid = _crear_pedido_efectivo(client, seed_data["producto_id"]).json()["id"]
    # GET existe; PUT/DELETE sobre la misma ruta no → 405 Method Not Allowed
    resp = client.put(f"/api/v1/pedidos/{pid}/historial", json={})
    assert resp.status_code == 405


def test_rn05_cancelar_sin_motivo(client, seed_data):
    """RN-05: motivo obligatorio al cancelar (vacío → 422 por validación)."""
    _login_cliente(client)
    pid = _crear_pedido_efectivo(client, seed_data["producto_id"]).json()["id"]
    resp = client.post(f"/api/v1/pedidos/{pid}/cancelar", json={"motivo": ""})
    assert resp.status_code == 422


def test_rn05_cancelar_con_motivo(client, seed_data):
    """RN-05: cancelación con motivo → OK, estado CANCELADO y stock restaurado."""
    _login_cliente(client)
    producto_id = seed_data["producto_id"]

    stock_antes = client.get(f"/api/v1/productos/{producto_id}").json()["stock_cantidad"]

    pid = _crear_pedido_efectivo(client, producto_id, cantidad=2).json()["id"]

    stock_tras_pedido = client.get(f"/api/v1/productos/{producto_id}").json()["stock_cantidad"]
    assert stock_tras_pedido == stock_antes - 2

    resp = client.post(f"/api/v1/pedidos/{pid}/cancelar", json={"motivo": "Me arrepentí"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["estado_codigo"] == "CANCELADO"

    stock_tras_cancelar = client.get(f"/api/v1/productos/{producto_id}").json()["stock_cantidad"]
    assert stock_tras_cancelar == stock_antes


def test_rn06_avanzar_genera_historial(client, seed_data):
    """RN-06: avanzar estado agrega un registro al historial."""
    _login_cliente(client)
    pid = _crear_pedido_efectivo(client, seed_data["producto_id"]).json()["id"]
    _login_admin(client)
    assert _avanzar(client, pid, "CONFIRMADO").status_code == 200
    historial = client.get(f"/api/v1/pedidos/{pid}/historial").json()
    transiciones = [(h["estado_desde"], h["estado_hacia"]) for h in historial]
    assert (None, "PENDIENTE") in transiciones
    assert ("PENDIENTE", "CONFIRMADO") in transiciones


# ─── FSM ─────────────────────────────────────────────────────────────────────

def test_fsm_transiciones_validas(client, seed_data):
    """PENDIENTE → CONFIRMADO → EN_PREP → EN_CAMINO → ENTREGADO."""
    _login_cliente(client)
    pid = _crear_pedido_efectivo(client, seed_data["producto_id"]).json()["id"]
    _login_admin(client)
    for estado in ["CONFIRMADO", "EN_PREP", "EN_CAMINO", "ENTREGADO"]:
        r = _avanzar(client, pid, estado)
        assert r.status_code == 200, f"{estado}: {r.text}"
        assert r.json()["estado_codigo"] == estado


def test_fsm_transicion_invalida_salto(client, seed_data):
    """FSM inválida: PENDIENTE → EN_CAMINO (salto) → 400."""
    _login_cliente(client)
    pid = _crear_pedido_efectivo(client, seed_data["producto_id"]).json()["id"]
    _login_admin(client)
    r = _avanzar(client, pid, "EN_CAMINO")
    assert r.status_code == 400


def test_rn01_estado_terminal_no_avanza(client, seed_data):
    """RN-01: un estado terminal (ENTREGADO) no admite transiciones salientes → 400."""
    _login_cliente(client)
    pid = _crear_pedido_efectivo(client, seed_data["producto_id"]).json()["id"]
    _login_admin(client)
    for estado in ["CONFIRMADO", "EN_PREP", "EN_CAMINO", "ENTREGADO"]:
        assert _avanzar(client, pid, estado).status_code == 200
    # ENTREGADO es terminal
    r = _avanzar(client, pid, "EN_PREP")
    assert r.status_code == 400


def test_avanzar_como_cliente_prohibido(client, seed_data):
    """Un cliente no puede avanzar estados (solo ADMIN/PEDIDOS) → 403."""
    _login_cliente(client)
    pid = _crear_pedido_efectivo(client, seed_data["producto_id"]).json()["id"]
    # Sigue logueado como cliente
    r = _avanzar(client, pid, "CONFIRMADO")
    assert r.status_code == 403


# ─── Visibilidad / listados ──────────────────────────────────────────────────

def test_cliente_ve_solo_sus_pedidos(client, seed_data):
    _login_cliente(client)
    _crear_pedido_efectivo(client, seed_data["producto_id"])
    resp = client.get("/api/v1/pedidos/mis-pedidos")
    assert resp.status_code == 200
    pedidos = resp.json()
    assert len(pedidos) >= 1
    assert all(p["usuario_id"] == seed_data["cliente_id"] for p in pedidos)


def test_admin_ve_todos_los_pedidos(client, seed_data):
    _login_cliente(client)
    _crear_pedido_efectivo(client, seed_data["producto_id"])
    _login_admin(client)
    resp = client.get("/api/v1/pedidos/")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_admin_filtra_pedidos_por_estado(client, seed_data):
    _login_cliente(client)
    _crear_pedido_efectivo(client, seed_data["producto_id"])
    _login_admin(client)
    resp = client.get("/api/v1/pedidos/", params={"estado_codigo": "PENDIENTE"})
    assert resp.status_code == 200
    assert all(p["estado_codigo"] == "PENDIENTE" for p in resp.json())


def test_mis_pedidos_prohibido_para_admin(client, seed_data):
    """El endpoint /mis-pedidos es solo para clientes → 403 para admin."""
    _login_admin(client)
    resp = client.get("/api/v1/pedidos/mis-pedidos")
    assert resp.status_code == 403
