/**
 * SentinelX real-time activity socket.
 *
 * Opens a single WebSocket per browser tab to /ws/activity/ and
 * dispatches incoming JSON messages to subscribers. Auto-reconnects
 * with backoff if the connection drops.
 */

import { useEffect, useRef, useState } from "react";

const WS_BASE = "ws://127.0.0.1:8000/ws/activity/";

/**
 * Subscribe to real-time activity messages.
 *
 * @param {function} onMessage - called with each parsed JSON message
 * @returns {{ status: "connecting"|"open"|"closed" }}
 */
export function useActivitySocket(onMessage) {
  const [status, setStatus] = useState("connecting");
  const wsRef = useRef(null);
  const retryRef = useRef(0);
  const onMessageRef = useRef(onMessage);
  const closedByUsRef = useRef(false);

  // Keep the latest callback in a ref so re-renders don't reopen the socket
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const token = localStorage.getItem("sentinelx_access_token");
    if (!token) {
      setStatus("closed");
      return;
    }

    let reconnectTimer = null;

    function connect() {
      if (closedByUsRef.current) return;

      const url = `${WS_BASE}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        setStatus("open");
      };

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (onMessageRef.current) onMessageRef.current(data);
        } catch (err) {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {
        // onclose will fire next
      };

            ws.onclose = (event) => {
        setStatus("closed");
        if (closedByUsRef.current) return;

        // Code 4001 = server rejected the token. Stop retrying —
        // clear the stale token and redirect to login.
        if (event.code === 4001) {
          localStorage.removeItem("sentinelx_access_token");
          localStorage.removeItem("sentinelx_refresh_token");
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
          return;
        }

        // Exponential backoff: 1s, 2s, 4s, 8s, capped at 30s
        retryRef.current += 1;
        const delay = Math.min(30000, 1000 * Math.pow(2, retryRef.current - 1));
        reconnectTimer = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      closedByUsRef.current = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  return { status };
}
