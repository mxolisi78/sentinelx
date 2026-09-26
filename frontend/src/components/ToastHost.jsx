/**
 * Minimal toast notification system.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.push({ title: "New incident", body: "...", severity: "CRITICAL" });
 *
 * Render <ToastHost /> once at the app root.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const ToastContext = createContext(null);
let nextId = 1;

const SEVERITY_STYLES = {
  CRITICAL: { border: "#ef4444", glow: "rgba(239, 68, 68, 0.4)" },
  HIGH: { border: "#f97316", glow: "rgba(249, 115, 22, 0.4)" },
  MEDIUM: { border: "#eab308", glow: "rgba(234, 179, 8, 0.35)" },
  LOW: { border: "#22c55e", glow: "rgba(34, 197, 94, 0.35)" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timeoutsRef = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    if (timeoutsRef.current[id]) {
      clearTimeout(timeoutsRef.current[id]);
      delete timeoutsRef.current[id];
    }
  }, []);

  const push = useCallback(
    (toast) => {
      const id = nextId++;
      const t = {
        id,
        title: toast.title || "Notification",
        body: toast.body || "",
        severity: toast.severity || "MEDIUM",
        durationMs: toast.durationMs || 8000,
        onClick: toast.onClick,
      };
      setToasts((list) => [t, ...list].slice(0, 5));

      timeoutsRef.current[id] = setTimeout(() => dismiss(id), t.durationMs);
      return id;
    },
    [dismiss]
  );

  // Clean up any pending timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ push, dismiss, toasts }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastHost() {
  const { toasts, dismiss } = useToast();

  return (
    <div style={styles.host}>
      {toasts.map((t) => {
        const s = SEVERITY_STYLES[t.severity] || SEVERITY_STYLES.MEDIUM;
        return (
          <div
            key={t.id}
            style={{
              ...styles.toast,
              borderLeft: `4px solid ${s.border}`,
              boxShadow: `0 8px 32px ${s.glow}`,
              cursor: t.onClick ? "pointer" : "default",
            }}
            onClick={() => {
              if (t.onClick) t.onClick();
              dismiss(t.id);
            }}
          >
            <div style={styles.row}>
              <div style={styles.title}>
                <span style={{ color: s.border, marginRight: 8 }}>?</span>
                {t.title}
              </div>
              <button
                style={styles.close}
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(t.id);
                }}
              >
                ?
              </button>
            </div>
            {t.body && <div style={styles.body}>{t.body}</div>}
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  host: {
    position: "fixed",
    top: "1rem",
    right: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    zIndex: 9999,
    maxWidth: 380,
  },
  toast: {
    background: "rgba(15, 23, 42, 0.95)",
    color: "#e2e8f0",
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    backdropFilter: "blur(12px)",
    fontFamily:
      "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    animation: "sx-slide-in 0.25s ease-out",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "0.5rem",
  },
  title: {
    fontSize: "0.88rem",
    fontWeight: 700,
    letterSpacing: "0.02em",
  },
  close: {
    background: "transparent",
    border: "none",
    color: "#64748b",
    fontSize: "1.2rem",
    lineHeight: 1,
    cursor: "pointer",
    padding: 0,
  },
  body: {
    fontSize: "0.78rem",
    color: "#94a3b8",
    marginTop: "0.35rem",
    lineHeight: 1.4,
  },
};
