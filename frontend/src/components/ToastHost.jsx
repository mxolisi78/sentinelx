import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const ToastContext = createContext(null);
let nextId = 1;

const SEVERITY_STYLES = {
  CRITICAL: { border: "border-l-red-500", glow: "shadow-[0_8px_32px_rgba(239,68,68,0.4)]", dot: "text-red-500" },
  HIGH: { border: "border-l-orange-500", glow: "shadow-[0_8px_32px_rgba(249,115,22,0.4)]", dot: "text-orange-500" },
  MEDIUM: { border: "border-l-yellow-500", glow: "shadow-[0_8px_32px_rgba(234,179,8,0.35)]", dot: "text-yellow-500" },
  LOW: { border: "border-l-green-500", glow: "shadow-[0_8px_32px_rgba(34,197,94,0.35)]", dot: "text-green-500" },
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
    <div className="fixed top-4 right-4 flex flex-col gap-2 z-[9999] max-w-sm">
      {toasts.map((t) => {
        const s = SEVERITY_STYLES[t.severity] || SEVERITY_STYLES.MEDIUM;
        return (
          <div
            key={t.id}
            onClick={() => {
              if (t.onClick) t.onClick();
              dismiss(t.id);
            }}
            className={`
              bg-white dark:bg-slate-900/95
              text-slate-900 dark:text-slate-200
              px-4 py-3 rounded-lg backdrop-blur-md
              border-l-4 ${s.border} ${s.glow}
              animate-slide-in
              ${t.onClick ? "cursor-pointer" : "cursor-default"}
            `}
          >
            <div className="flex justify-between items-start gap-2">
              <div className="text-sm font-bold tracking-wide">
                <span className={`${s.dot} mr-2`}>?</span>
                {t.title}
              </div>
              <button
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 text-xl leading-none"
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(t.id);
                }}
              >
                ?
              </button>
            </div>
            {t.body && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {t.body}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
