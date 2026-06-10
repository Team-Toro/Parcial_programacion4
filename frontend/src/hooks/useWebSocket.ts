import { useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../config';
import { useWsStore } from '../store/wsStore';

const WS_URL = API_URL.replace(/^http/, 'ws') + '/api/v1/pedidos/ws';
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 30_000;

/**
 * Manages a single WebSocket connection for the lifetime of the component.
 * - Auth via HttpOnly cookie (sent automatically by the browser on WS handshake).
 * - Reconnects with exponential backoff. Stops on 1008 (auth failure).
 * - Re-subscribes to pending order rooms on reconnect.
 * - Updates wsStore on every incoming event.
 */
export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const pendingSubs = useRef<Set<number>>(new Set());

  const applyEvent = useWsStore((s) => s.applyEvent);
  const setConnected = useWsStore((s) => s.setConnected);

  const sendRaw = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      retryCountRef.current = 0;
      setConnected(true);
      pendingSubs.current.forEach((id) =>
        ws.send(JSON.stringify({ action: 'subscribe-order', order_id: id }))
      );
    };

    ws.onmessage = (e: MessageEvent) => {
      try {
        const { event, data } = JSON.parse(e.data as string) as {
          event: string;
          data: Record<string, unknown>;
        };
        if (event && data) applyEvent(event, data);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = (e: CloseEvent) => {
      wsRef.current = null;
      setConnected(false);
      // 1008 = auth failure — the server explicitly rejected us, do not retry
      if (e.code === 1008 || !mountedRef.current) return;
      const delay = Math.min(BACKOFF_BASE_MS * 2 ** retryCountRef.current, BACKOFF_MAX_MS);
      retryCountRef.current++;
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    };

    ws.onerror = () => {
      setConnected(false);
    };
  }, [applyEvent, setConnected]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const subscribeToOrder = useCallback(
    (orderId: number) => {
      pendingSubs.current.add(orderId);
      sendRaw({ action: 'subscribe-order', order_id: orderId });
    },
    [sendRaw]
  );

  const unsubscribeFromOrder = useCallback(
    (orderId: number) => {
      pendingSubs.current.delete(orderId);
      sendRaw({ action: 'unsubscribe-order', order_id: orderId });
    },
    [sendRaw]
  );

  return { subscribeToOrder, unsubscribeFromOrder };
}
