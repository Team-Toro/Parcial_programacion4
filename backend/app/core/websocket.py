import logging
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections grouped by rooms.

    Two dictionaries for O(1) disconnect cleanup:
    - rooms: room_name → set of active connections
    - socket_rooms: websocket → set of rooms it belongs to (reverse map)

    Room naming:
      - role rooms: "role:admin", "role:pedidos", "role:stock", "role:cliente"
      - order rooms: "order:{id}"
    """

    def __init__(self) -> None:
        self.rooms: dict[str, set[WebSocket]] = {}
        self.socket_rooms: dict[WebSocket, set[str]] = {}

    # ---- internal helpers -----------------------------------------------

    def _join_room(self, websocket: WebSocket, room: str) -> None:
        self.rooms.setdefault(room, set()).add(websocket)
        self.socket_rooms.setdefault(websocket, set()).add(room)

    def _leave_room(self, websocket: WebSocket, room: str) -> None:
        if room in self.rooms:
            self.rooms[room].discard(websocket)
            if not self.rooms[room]:
                del self.rooms[room]
        if websocket in self.socket_rooms:
            self.socket_rooms[websocket].discard(room)

    # ---- lifecycle -------------------------------------------------------

    async def connect(self, websocket: WebSocket, role: str, user_id: int) -> None:
        """Accept the WS handshake and place the connection in its role room."""
        await websocket.accept()
        room = f"role:{role.lower()}"
        self._join_room(websocket, room)
        logger.info("WS connected: user_id=%s role=%s room=%s", user_id, role, room)

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove the connection from every room it belongs to."""
        rooms = self.socket_rooms.pop(websocket, set())
        for room in list(rooms):
            if room in self.rooms:
                self.rooms[room].discard(websocket)
                if not self.rooms[room]:
                    del self.rooms[room]

    # ---- order rooms -----------------------------------------------------

    def join_order_room(self, websocket: WebSocket, order_id: int) -> None:
        self._join_room(websocket, f"order:{order_id}")

    def leave_order_room(self, websocket: WebSocket, order_id: int) -> None:
        self._leave_room(websocket, f"order:{order_id}")

    # ---- broadcast -------------------------------------------------------

    async def broadcast_to_role(self, role: str, event: str, data: dict) -> None:
        room = f"role:{role.lower()}"
        payload = {"event": event, "data": data}
        for ws in list(self.rooms.get(room, set())):
            try:
                await ws.send_json(payload)
            except Exception:
                self.disconnect(ws)

    async def broadcast_to_roles(self, roles: list[str], event: str, data: dict) -> None:
        """Broadcast to multiple role rooms without sending duplicates."""
        sent_to: set[WebSocket] = set()
        payload = {"event": event, "data": data}
        for role in roles:
            room = f"role:{role.lower()}"
            for ws in list(self.rooms.get(room, set())):
                if ws not in sent_to:
                    try:
                        await ws.send_json(payload)
                        sent_to.add(ws)
                    except Exception:
                        self.disconnect(ws)

    async def broadcast_to_order(self, order_id: int, event: str, data: dict) -> None:
        room = f"order:{order_id}"
        payload = {"event": event, "data": data}
        for ws in list(self.rooms.get(room, set())):
            try:
                await ws.send_json(payload)
            except Exception:
                self.disconnect(ws)

    # ---- debug -----------------------------------------------------------

    def get_rooms_info(self) -> dict[str, int]:
        return {room: len(conns) for room, conns in self.rooms.items()}

    def get_total_connections(self) -> int:
        return len(self.socket_rooms)


manager = ConnectionManager()
